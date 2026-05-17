from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models, database
import os
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "300"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def generate_2fa_code():
    return str(random.randint(100000, 999999))

def send_2fa_email(email: str, code: str, max_retries: int = 3):
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_name = os.getenv("SMTP_FROM_NAME", "Swipe Match")
    
    if not all([smtp_server, smtp_email, smtp_password]):
        print("SMTP не настроен!")
        return False
    
    msg = MIMEMultipart()
    msg['From'] = f"{from_name} <{smtp_email}>"
    msg['To'] = email
    msg['Subject'] = "Код подтверждения Swipe Match"
    
    body = f"""
Здравствуйте!

Ваш код подтверждения: {code}

Код действителен 10 минут.

Если вы не запрашивали этот код, просто проигнорируйте письмо.

"""
    
    msg.attach(MIMEText(body, 'plain'))
    
    for attempt in range(max_retries):
        try:
            print(f"Попытка {attempt + 1}/{max_retries} отправки email на {email}...")
            
            server = smtplib.SMTP(smtp_server, smtp_port, timeout=30)
            server.set_debuglevel(0)
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
            server.quit()
            
            print(f"Email отправлен на {email} с попытки {attempt + 1}")
            return True
            
        except smtplib.SMTPServerDisconnected as e:
            print(f"SMTP сервер отключился (попытка {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                import time
                wait_time = 2 ** attempt
                print(f"Ждём {wait_time} сек перед следующей попыткой...")
                time.sleep(wait_time)
            continue
            
        except Exception as e:
            print(f"Ошибка отправки email (попытка {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                import time
                time.sleep(2)
            continue
    
    print(f"Не удалось отправить email после {max_retries} попыток")
    return False

def verify_2fa_code(user, code: str):
    if not user.email_2fa_enabled:
        return True
    
    if not user.email_2fa_code or not user.email_2fa_expires:
        return False
    
    if datetime.utcnow() > user.email_2fa_expires:
        return False
    
    return user.email_2fa_code == code

def send_match_email(user_email: str, user_name: str, match_email: str, match_name: str):
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_name = os.getenv("SMTP_FROM_NAME", "Swipe Match")
    
    if not all([smtp_server, smtp_email, smtp_password]):
        print("SMTP не настроен!")
        return False
    
    msg = MIMEMultipart()
    msg['From'] = f"{from_name} <{smtp_email}>"
    msg['To'] = user_email
    msg['Subject'] = "У вас мэтч в Swipe Match!"
    
    body = f"""
Здравствуйте, {user_name}!

У вас взаимная симпатия!

Вы понравились друг другу, и мы хотим помочь вам начать общение.

Данные вашего мэтча:
   Имя: {match_name}
   Email для связи: {match_email}
"""
    
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_email, smtp_password)
        server.send_message(msg)
        server.quit()
        print(f"Email о мэтче отправлен {user_email}")
        return True
    except Exception as e:
        print(f"Ошибка отправки email о мэтче: {e}")
        return False