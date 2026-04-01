from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models, database

# Создаем таблицы в БД при запуске
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="Swipe Match API",
    description="Приложение поиска людей по интересам",
    version="0.1.0"
)

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Swipe Match API работает!", "status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)