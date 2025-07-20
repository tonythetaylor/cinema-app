# backend/app/routers/users/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import AsyncSessionLocal
from app.models.user import UserCreate, UserRead
import app.crud as crud

router = APIRouter()

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/", response_model=UserRead)
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await crud.get_user_by_username(db, user_in.username)
    if existing:
        raise HTTPException(400, "Username already exists")
    user = await crud.create_user(db, user_in)
    return user