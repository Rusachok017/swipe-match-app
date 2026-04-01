from database import engine, Base

print("Успешное подключение к бд")
print(f"URL: {engine.url}")