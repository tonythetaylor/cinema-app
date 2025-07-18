from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import AsyncSessionLocal
from app.models import UserCreate, UserRead
import backend.app.crud as crud

router = APIRouter(prefix="/users", tags=["users"])

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/", response_model=UserRead)
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    user = await crud.create_user(db, user_in)
    if not user:
        raise HTTPException(400, "Username already exists")
    return user