from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta, datetime, timezone
from keywords import AVAILABLE_KEYWORDS
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, or_, and_
from jose import jwt, JWTError
from pydantic import BaseModel

import models
import database
import auth
import shutil
import time 
models.Base.metadata.create_all(bind=database.engine)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class Resend2FARequest(BaseModel):
    temp_token: str

app = FastAPI(
    title="Swipe Match API",
    description="API для приложения знакомств",
    version="1.1.1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Swipe Match API работает!", "status": "ok"}

@app.get("/api/health")
def health_check():
    return {"status": "ok", "database": "connected"}

@app.post("/api/auth/register")
def register(username: str, password: str, age: int, gender: str, bio: str = "", db: Session = Depends(database.get_db)):
    existing_user = db.query(models.User).filter(models.User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    
    new_user = models.User(
        username=username,
        password=auth.get_password_hash(password),
        age=age,
        gender=gender,
        bio=bio,
        photo_url=f"https://i.pravatar.cc/150?img={hash(username) % 50}"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = auth.create_access_token(
        data={"sub": new_user.username},
        expires_delta=timedelta(minutes=300)
    )
    
    return {
        "status": "success",
        "user_id": new_user.id,
        "username": new_user.username,
        "token": access_token
    }

@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    if not user or not auth.verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Неверный логин или пароль")
    
    if hasattr(user, 'email_2fa_enabled') and user.email_2fa_enabled:
        code = auth.generate_2fa_code()
        user.email_2fa_code = code
        user.email_2fa_expires = datetime.utcnow() + timedelta(minutes=10)
        db.commit()
        
        auth.send_2fa_email(user.email, code)
        
        temp_token = auth.create_access_token(
            data={"sub": user.username, "type": "2fa_temp"},
            expires_delta=timedelta(minutes=100)
        )
        
        return {
            "status": "2fa_required",
            "message": "Введите код из email",
            "temp_token": temp_token,
            "email": user.email
        }
    
    access_token = auth.create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=300)
    )
    
    return {
        "status": "success",
        "user_id": user.id,
        "username": user.username,
        "token": access_token
    }

@app.get("/api/auth/2fa/status")
def get_2fa_status(
    current_user: models.User = Depends(auth.get_current_user)
):
    return {
        "email_2fa_enabled": current_user.email_2fa_enabled,
        "email": current_user.email,
        "message": "2FA включена" if current_user.email_2fa_enabled else "2FA не включена"
    }

@app.post("/api/auth/2fa/enable")
def enable_2fa(
    email: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    existing = db.query(models.User).filter(
        models.User.email == email,
        models.User.id != current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email уже используется")
    
    code = auth.generate_2fa_code()
    current_user.email = email
    current_user.email_2fa_code = code
    current_user.email_2fa_expires = datetime.utcnow() + timedelta(minutes=30)
    db.commit()
    
    if auth.send_2fa_email(email, code):
        return {"status": "success", "message": "Код отправлен на email"}
    else:
        raise HTTPException(status_code=500, detail="Не удалось отправить email")

@app.post("/api/auth/2fa/verify")
def verify_2fa(
    code: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if auth.verify_2fa_code(current_user, code):
        current_user.email_2fa_enabled = True
        current_user.email_2fa_code = None
        current_user.email_2fa_expires = None
        db.commit()
        return {"status": "success", "message": "2FA активирован"}
    else:
        raise HTTPException(status_code=400, detail="Неверный или просроченный код")

@app.post("/api/auth/2fa/disable")
def disable_2fa(
    password: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if not auth.verify_password(password, current_user.password):
        raise HTTPException(status_code=400, detail="Неверный пароль")
    
    current_user.email_2fa_enabled = False
    current_user.email_2fa_code = None
    current_user.email_2fa_expires = None
    db.commit()
    return {"status": "success", "message": "2FA отключен"}

@app.post("/api/auth/2fa/resend")
def resend_2fa(
    request: Resend2FARequest, 
    db: Session = Depends(database.get_db)
):
    from jose import jwt, JWTError

    try:
        payload = jwt.decode(request.temp_token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username = payload.get("sub")
        token_type = payload.get("type")
        
        if not username or token_type != "2fa_temp":
            raise HTTPException(status_code=400, detail="Неверный токен")
        
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user:
            raise HTTPException(status_code=400, detail="Пользователь не найден")
        
        code = auth.generate_2fa_code()
        user.email_2fa_code = code
        user.email_2fa_expires = datetime.utcnow() + timedelta(minutes=30)
        db.commit()
        
        if auth.send_2fa_email(user.email, code):
            return {"status": "success", "message": "Код отправлен"}
        else:
            raise HTTPException(status_code=500, detail="Не удалось отправить email")
            
    except JWTError:
        raise HTTPException(status_code=400, detail="Неверный токен")

@app.post("/api/auth/login/2fa")
def login_2fa(
    code: str,
    temp_token: str,
    db: Session = Depends(database.get_db)
):
    try:
        payload = jwt.decode(temp_token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username = payload.get("sub")
        token_type = payload.get("type")
        
        if not username or token_type != "2fa_temp":
            raise HTTPException(status_code=400, detail="Неверный токен")
        
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user:
            raise HTTPException(status_code=400, detail="Пользователь не найден")
        
        if not auth.verify_2fa_code(user, code):
            raise HTTPException(status_code=400, detail="Неверный или просроченный код")
        
        user.email_2fa_code = None
        user.email_2fa_expires = None
        db.commit()
        
        access_token = auth.create_access_token(
            data={"sub": user.username},
            expires_delta=timedelta(minutes=300)
        )
        
        return {
            "status": "success",
            "user_id": user.id,
            "username": user.username,
            "token": access_token
        }
        
    except JWTError:
        raise HTTPException(status_code=400, detail="Неверный токен")

@app.get("/api/auth/me")
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "age": current_user.age,
        "gender": current_user.gender,
        "bio": current_user.bio,
        "photo_url": current_user.photo_url
    }

@app.get("/api/users")
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "age": user.age,
            "gender": user.gender,
            "bio": user.bio,
            "photo_url": user.photo_url
        }
        for user in users
    ]

@app.get("/api/candidates")
def get_candidates(
    current_user_id: int = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user_auth: models.User = Depends(auth.get_current_user)
):
    user_id = current_user_id if current_user_id else current_user_auth.id
    
    swiped_ids = db.query(models.Swipe.swiped_id).filter(
        models.Swipe.swiper_id == user_id
    ).all()
    swiped_ids = [x[0] for x in swiped_ids]
    
    query = db.query(models.User).filter(models.User.id != user_id)
    
    if swiped_ids:
        query = query.filter(~models.User.id.in_(swiped_ids))
    
    blacklist = db.query(models.Blacklist).filter(
        models.Blacklist.user_id == user_id
    ).all()
    blacklist_words = [b.keyword for b in blacklist]
    
    whitelist = db.query(models.Whitelist).filter(
        models.Whitelist.user_id == user_id
    ).all()
    whitelist_words = [w.keyword for w in whitelist]
    
    if blacklist_words:
        black_conditions = []
        
        for word in blacklist_words:
            word_lower = word.strip().lower()
            black_conditions.append(func.lower(models.User.bio).contains(word_lower))
            black_conditions.append(func.lower(models.User.username).contains(word_lower))
        
        if black_conditions:
            query = query.filter(~or_(*black_conditions))
    
    if whitelist_words:
        white_conditions = []
        
        for word in whitelist_words:
            word_lower = word.strip().lower()
            white_conditions.append(func.lower(models.User.bio).contains(word_lower))
            white_conditions.append(func.lower(models.User.username).contains(word_lower))
        
        if white_conditions:
            query = query.filter(or_(*white_conditions))
    
    candidates = query.limit(limit).all()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "age": user.age,
            "gender": user.gender,
            "bio": user.bio,
            "photo_url": user.photo_url
        }
        for user in candidates
    ]

@app.get("/api/profile/keywords")
def get_available_keywords(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    blacklist = db.query(models.Blacklist).filter(
        models.Blacklist.user_id == current_user.id
    ).all()
    blacklist_words = [b.keyword for b in blacklist]
    
    whitelist = db.query(models.Whitelist).filter(
        models.Whitelist.user_id == current_user.id
    ).all()
    whitelist_words = [w.keyword for w in whitelist]
    
    keywords = []
    for word in AVAILABLE_KEYWORDS:
        status = "neutral" 
        if word in blacklist_words:
            status = "black"
        elif word in whitelist_words:
            status = "white"
        
        keywords.append({
            "keyword": word,
            "status": status
        })
    
    return {
        "keywords": keywords,
        "total": len(AVAILABLE_KEYWORDS)
    }

@app.post("/api/profile/keywords/set")
def set_keyword_status(
    keyword: str,
    status: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    keyword = keyword.strip().lower()
    
    if keyword not in AVAILABLE_KEYWORDS:
        raise HTTPException(status_code=400, detail="Недопустимое ключевое слово")
    
    db.query(models.Blacklist).filter(
        models.Blacklist.user_id == current_user.id,
        models.Blacklist.keyword == keyword
    ).delete()
    
    db.query(models.Whitelist).filter(
        models.Whitelist.user_id == current_user.id,
        models.Whitelist.keyword == keyword
    ).delete()

    if status == "black":
        new_item = models.Blacklist(user_id=current_user.id, keyword=keyword)
        db.add(new_item)
    elif status == "white":
        new_item = models.Whitelist(user_id=current_user.id, keyword=keyword)
        db.add(new_item)
    
    db.commit()
    
    return {"status": "success", "keyword": keyword, "new_status": status}

@app.post("/api/swipe")
def make_swipe(
    swiper_id: int, 
    swiped_id: int, 
    is_like: bool, 
    db: Session = Depends(get_db)
):
    is_match = False
    
    if is_like:
        mutual_like = db.query(models.Swipe).filter(
            models.Swipe.swiper_id == swiped_id,  
            models.Swipe.swiped_id == swiper_id, 
            models.Swipe.is_like == True   
        ).first()
        
        if mutual_like:
            is_match = True  

    new_swipe = models.Swipe(
        swiper_id=swiper_id,
        swiped_id=swiped_id,
        is_like=is_like
    )
    db.add(new_swipe)
    db.commit() 
    
    if is_match:
        user_a = db.query(models.User).filter(models.User.id == swiper_id).first()
        user_b = db.query(models.User).filter(models.User.id == swiped_id).first()
        
        if (user_a and user_a.email and 
            hasattr(user_a, 'email_2fa_enabled') and user_a.email_2fa_enabled):
            print(f"📧 [MATCH] Отправка письма {user_a.username}...")
            auth.send_match_email(
                user_email=user_a.email,
                user_name=user_a.username,
                match_email=user_b.email if user_b else "Не указан",
                match_name=user_b.username if user_b else "Неизвестно"
            )

        time.sleep(10)

        if (user_b and user_b.email and 
            hasattr(user_b, 'email_2fa_enabled') and user_b.email_2fa_enabled):
            print(f"📧 [MATCH] Отправка письма {user_b.username}...")
            auth.send_match_email(
                user_email=user_b.email,
                user_name=user_b.username,
                match_email=user_a.email if user_a else "Не указан",
                match_name=user_a.username if user_a else "Неизвестно"
            )

    return {
        "status": "success",
        "swiped_id": swiped_id,
        "is_match": is_match,
        "message": "Match!" if is_match else "Swipe saved"
    }

@app.get("/api/profile")
def get_profile(
    current_user: models.User = Depends(auth.get_current_user)
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "age": current_user.age,
        "gender": current_user.gender,
        "bio": current_user.bio,
        "photo_url": current_user.photo_url,
        "avatar_file": current_user.avatar_file,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at
    }

@app.put("/api/profile")
def update_profile(
    username: str = None,
    age: int = None,
    gender: str = None,
    bio: str = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if username:
        existing = db.query(models.User).filter(
            models.User.username == username,
            models.User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Имя занято")
        current_user.username = username
    
    if age:
        current_user.age = age
    if gender:
        current_user.gender = gender
    if bio is not None:
        current_user.bio = bio
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return {"status": "success", "user": current_user}

@app.post("/api/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Только изображения")
    
    file_ext = Path(file.filename).suffix
    new_filename = f"avatar_{current_user.id}_{int(datetime.utcnow().timestamp())}{file_ext}"
    file_path = UPLOAD_DIR / new_filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    current_user.avatar_file = new_filename
    current_user.photo_url = f"/uploads/{new_filename}"
    db.commit()
    
    return {"status": "success", "photo_url": current_user.photo_url}

@app.delete("/api/profile/avatar")
def delete_avatar(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    if current_user.avatar_file:
        file_path = UPLOAD_DIR / current_user.avatar_file
        if file_path.exists():
            file_path.unlink()
    
    current_user.avatar_file = None
    current_user.photo_url = f"https://i.pravatar.cc/150?img={hash(current_user.username) % 50}"
    db.commit()
    
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)