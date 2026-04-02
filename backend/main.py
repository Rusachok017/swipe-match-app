# ==========================================
# backend/main.py
# FastAPI приложение (Базовая версия)
# ==========================================

# --- ИМПОРТЫ ---
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

# Импорт наших локальных модулей
import models
import database

# --- СОЗДАНИЕ ТАБЛИЦ ---
# Создаем таблицы в БД при запуске, если их нет
models.Base.metadata.create_all(bind=database.engine)

# --- НАСТРОЙКА FASTAPI ---
app = FastAPI(
    title="Swipe Match API",
    description="API для приложения знакомств (Курсовой проект)",
    version="1.0.0"
)

# --- CORS (Разрешаем запросы с фронтенда) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ==========================================

def get_db():
    """Зависимость FastAPI для получения сессии БД"""
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# API ЭНДПОИНТЫ
# ==========================================

# --- 1. Проверка работы сервера ---
@app.get("/")
def read_root():
    return {
        "message": "✅ Swipe Match API работает!", 
        "status": "ok",
        "version": "1.0.0"
    }

# --- 2. Проверка здоровья (БД) ---
@app.get("/api/health")
def health_check():
    """Проверяет подключение к базе данных"""
    return {"status": "ok", "database": "connected"}

# --- 3. Получить всех пользователей (Для тестов) ---
@app.get("/api/users")
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Возвращает список всех пользователей"""
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

# --- 4. Получить кандидатов для свайпа (Основная лента) ---
@app.get("/api/candidates")
def get_candidates(
    current_user_id: int = 1, 
    limit: int = 10, 
    db: Session = Depends(get_db)
):
    """
    Возвращает пользователей для показа в ленте.
    Исключает: самого пользователя и тех, кого уже свайпнули.
    """
    
    # Получаем ID тех, кого пользователь уже видел (свайпал)
    swiped_ids = db.query(models.Swipe.swiped_id).filter(
        models.Swipe.swiper_id == current_user_id
    ).all()
    swiped_ids = [x[0] for x in swiped_ids]
    
    # Формируем основной запрос
    query = db.query(models.User).filter(
        models.User.id != current_user_id  # Не показывать самого себя
    )
    
    # Исключаем уже просмотренных
    if swiped_ids:
        query = query.filter(~models.User.id.in_(swiped_ids))
    
    # Выполняем запрос с ограничением
    candidates = query.limit(limit).all()
    
    # Возвращаем результат
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

# --- 5. Сделать свайп (Лайк / Дизлайк) ---
@app.post("/api/swipe")
def make_swipe(
    swiper_id: int, 
    swiped_id: int, 
    is_like: bool, 
    db: Session = Depends(get_db)
):
    """
    Сохраняет действие свайпа.
    Если это лайк и он взаимный -> возвращает is_match: True
    """
    
    # Создаем запись о свайпе
    new_swipe = models.Swipe(
        swiper_id=swiper_id,
        swiped_id=swiped_id,
        is_like=is_like
    )
    
    db.add(new_swipe)
    db.commit()
    
    # Логика проверки Мэтча (только если это лайк)
    is_match = False
    if is_like:
        # Проверяем, лайкнул ли этот человек нас в ответ
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

# ==========================================
# ЗАПУСК СЕРВЕРА
# ==========================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)