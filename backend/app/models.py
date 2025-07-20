from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, func
from sqlalchemy.orm import declarative_base
from pydantic import BaseModel, Field

from app.db import Base as ORMBase

# ——— SQLAlchemy ORM model ———
class User(ORMBase):
    __tablename__ = "users"

    id:               int     = Column(Integer, primary_key=True, index=True)
    username:         str     = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password:  str     = Column(String(128), nullable=False)
    is_active:        bool    = Column(Boolean, default=True)
    created_at:       datetime= Column(DateTime(timezone=True), server_default=func.now())

    # Profile enhancements
    display_name:     Optional[str] = Column(String(100), nullable=True)
    avatar_url:       Optional[str] = Column(String(2048), nullable=True)
    bio:              Optional[str] = Column(Text, nullable=True)

# ——— Pydantic schemas for Users ———

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class UserRead(BaseModel):
    id:           int
    username:     str
    is_active:    bool
    created_at:   datetime
    display_name: Optional[str] = None
    avatar_url:   Optional[str] = None
    bio:          Optional[str] = None

    class Config:
        from_attributes = True