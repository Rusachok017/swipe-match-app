from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class FilterType(str, enum.Enum):
    USER = "user"       
    KEYWORD = "keyword"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=False)
    bio = Column(Text, nullable=True)
    photo_url = Column(String(255), nullable=True)
    password = Column(String(255), nullable=True) 
    created_at = Column(DateTime, default=datetime.utcnow)

class Swipe(Base):
    __tablename__ = "swipes"
    
    id = Column(Integer, primary_key=True, index=True)
    swiper_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    swiped_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_like = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

