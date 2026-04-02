# ==========================================
# backend/database.py
# Подключение к PostgreSQL
# ==========================================

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Строка подключения к локальной PostgreSQL
DATABASE_URL = "postgresql://postgres:Leva__2288@localhost:5432/swipe_match_db"

# Создаем движок подключения
engine = create_engine(DATABASE_URL)

# Создаем сессию для работы с БД
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()

# Функция для получения сессии (используется в FastAPI)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()