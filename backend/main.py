from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta

import models
import database
import auth

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="Swipe Match API",
    description="API для приложения знакомств",
    version="1.1.0"
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
        expires_delta=timedelta(minutes=30)
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
        expires_delta=timedelta(minutes=30)
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
def get_candidates(current_user_id: int = 1, limit: int = 10, db: Session = Depends(get_db)):
    swiped_ids = db.query(models.Swipe.swiped_id).filter(
        models.Swipe.swiper_id == current_user_id
    ).all()
    swiped_ids = [x[0] for x in swiped_ids]
    
    query = db.query(models.User).filter(
        models.User.id != current_user_id
    )
    
    if swiped_ids:
        query = query.filter(~models.User.id.in_(swiped_ids))
    
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)