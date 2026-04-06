from sqlalchemy.orm import Session
import database, models
import random

# Данные для генерации
FIRST_NAMES_M = ["Александр", "Дмитрий", "Максим", "Артём", "Андрей", "Иван", "Сергей", "Павел", "Никита", "Егор"]
FIRST_NAMES_F = ["Анна", "Мария", "Елена", "Ольга", "Наталья", "Екатерина", "Алина", "Юлия", "Виктория", "София"]

BIOS = [
    "Люблю путешествия и приключения",
    "Программист, кофе и код",
    "Спортсмен, ЗОЖ",
    "Музыкант, играю на гитаре",
    "Фотограф, ловлю моменты",
    "Студент, учусь и веселюсь",
    "Дизайнер, творческая личность",
    "Врач, помогаю людям",
    "Инженер, люблю технику",
    "Блогер, делюсь жизнью",
]

def create_fake_users(db: Session, count=20):
    users = []
    
    for i in range(count):
        gender = random.choice(["male", "female"])
        first_name = random.choice(FIRST_NAMES_M if gender == "male" else FIRST_NAMES_F)
        
        user = models.User(
            username=f"{first_name}_{i+1}",
            age=random.randint(18, 35),
            gender=gender,
            bio=random.choice(BIOS),
            photo_url=f"https://i.pravatar.cc/150?img={random.randint(1, 50)}"
        )
        users.append(user)
        print(f"Создан пользователь: {first_name}_{i+1}")
    
    db.add_all(users)
    db.commit()
    print(f"\nГотово! Создано {len(users)} пользователей.")

if __name__ == "__main__":
    db = database.SessionLocal()
    try:
        create_fake_users(db, 20)
    finally:
        db.close()