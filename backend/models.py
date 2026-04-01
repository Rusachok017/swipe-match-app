from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

# Тип записи в списках
class FilterType(str, enum.Enum):
    USER = "user"       # Блокировка конкретного пользователя
    KEYWORD = "keyword" # Блокировка по ключевому слову

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False)
    bio = Column(Text, nullable=True)
    photo_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи со списками
    blacklist = relationship("Blacklist", back_populates="owner", foreign_keys="Blacklist.user_id")
    whitelist = relationship("Whitelist", back_populates="owner", foreign_keys="Whitelist.user_id")

class Swipe(Base):
    __tablename__ = "swipes"
    
    id = Column(Integer, primary_key=True, index=True)
    swiper_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    swiped_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_like = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Blacklist(Base):
    __tablename__ = "blacklist"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Владелец списка
    filter_type = Column(String(10), nullable=False, default="user")   # "user" или "keyword"
    
    # Поля (одно из двух будет заполнено)
    blocked_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Если type="user"
    keyword = Column(String(100), nullable=True)                               # Если type="keyword"
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship("User", back_populates="blacklist", foreign_keys=[user_id])

class Whitelist(Base):
    __tablename__ = "whitelist"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Владелец списка
    filter_type = Column(String(10), nullable=False, default="user")   # "user" или "keyword"
    
    # Поля (одно из двух будет заполнено)
    priority_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Если type="user"
    keyword = Column(String(100), nullable=True)                                # Если type="keyword"
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship("User", back_populates="whitelist", foreign_keys=[user_id])