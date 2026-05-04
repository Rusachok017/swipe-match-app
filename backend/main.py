from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta, datetime
from keywords import AVAILABLE_KEYWORDS
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func

import models
import database
import auth
import shutil

models.Base.metadata.create_all(bind=database.engine)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

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
    from sqlalchemy import or_, and_
    
    # Используем ID из токена
    user_id = current_user_id if current_user_id else current_user_auth.id
    
    print(f"\n{'='*60}")
    print(f"🔍 ЗАГРУЗКА КАНДИДАТОВ для пользователя {user_id}")
    print(f"{'='*60}")
    
    # Исключить уже свайпнутых
    swiped_ids = db.query(models.Swipe.swiped_id).filter(
        models.Swipe.swiper_id == user_id
    ).all()
    swiped_ids = [x[0] for x in swiped_ids]
    print(f"📋 Свайпнутые ID: {swiped_ids}")
    
    # Базовый запрос
    query = db.query(models.User).filter(
        models.User.id != user_id
    )
    
    if swiped_ids:
        query = query.filter(~models.User.id.in_(swiped_ids))
    
    # 🔥 Получить фильтры
    blacklist = db.query(models.Blacklist).filter(
        models.Blacklist.user_id == user_id
    ).all()
    blacklist_words = [b.keyword for b in blacklist]
    
    whitelist = db.query(models.Whitelist).filter(
        models.Whitelist.user_id == user_id
    ).all()
    whitelist_words = [w.keyword for w in whitelist]
    
    print(f"⚫ Чёрный список: {blacklist_words}")
    print(f"⚪ Белый список: {whitelist_words}")
    
    # 🔥 ЧЁРНЫЙ СПИСОК
    if blacklist_words:
        print(f"\n   🔴 ПРИМЕНЯЕМ ЧЁРНЫЙ СПИСОК...")
        black_conditions = []
        
        for word in blacklist_words:
            word_lower = word.strip().lower()
            print(f"   📌 Ищем слово: '{word_lower}'")
            
            # 🔥 Используем func.lower() вместо ilike
            black_conditions.append(func.lower(models.User.bio).contains(word_lower))
            black_conditions.append(func.lower(models.User.username).contains(word_lower))
            
            # 🔥 Проверяем вручную
            test_query = db.query(models.User).filter(
                or_(
                    func.lower(models.User.bio).contains(word_lower),
                    func.lower(models.User.username).contains(word_lower)
                )
            ).all()
            print(f"      Найдено вручную: {len(test_query)}")
            for u in test_query:
                print(f"         - {u.username}: bio='{u.bio}'")
        
        if black_conditions:
            query_before = query.count()
            print(f"      До чёрного списка: {query_before} анкет")
            
            # 🔥 Применяем НЕ (исключаем)
            query = query.filter(~or_(*black_conditions))
            
            query_after = query.count()
            print(f"      После чёрного списка: {query_after} анкет")
            print(f"      ✅ Исключено: {query_before - query_after}")
    
    
    # 🔥 БЕЛЫЙ СПИСОК
    if whitelist_words:
        print(f"\n   🟢 ПРИМЕНЯЕМ БЕЛЫЙ СПИСОК...")
        white_conditions = []
        
        for word in whitelist_words:
            word_lower = word.strip().lower()
            print(f"   📌 Ищем слово: '{word_lower}'")
            
            white_conditions.append(func.lower(models.User.bio).contains(word_lower))
            white_conditions.append(func.lower(models.User.username).contains(word_lower))
        
        if white_conditions:
            query_before = query.count()
            print(f"      До белого списка: {query_before} анкет")
            
            # 🔥 Применяем ИЛИ (включаем только с этими словами)
            query = query.filter(or_(*white_conditions))
            
            query_after = query.count()
            print(f"      После белого списка: {query_after} анкет")
    
    # Лимит
    candidates = query.limit(limit).all()
    
    print(f"📊 ВСЕГО найдено кандидатов: {len(candidates)}")
    for c in candidates:
        print(f"   - {c.username} (ID: {c.id}): bio='{c.bio}'")
    print(f"{'='*60}\n")
    
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
    status: str,  # "black" | "white" | "neutral"
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
def make_swipe(swiper_id: int, swiped_id: int, is_like: bool, db: Session = Depends(get_db)):
    new_swipe = models.Swipe(
        swiper_id=swiper_id,
        swiped_id=swiped_id,
        is_like=is_like
    )
    
    db.add(new_swipe)
    db.commit()
    
    is_match = False
    if is_like:
        mutual_like = db.query(models.Swipe).filter(
            models.Swipe.swiper_id == swiped_id,
            models.Swipe.swiped_id == swiper_id,
            models.Swipe.is_like == True
        ).first()
        
        if mutual_like:
            is_match = True
    
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