from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import AsyncSessionLocal
from backend.app.crud import get_user_by_username
from app.security import decode_token
from app.schemas import UserRead

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")
router = APIRouter(tags=["profile"])

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    return await get_user_by_username(AsyncSessionLocal(), payload.sub)

@router.get("/users/me", response_model=UserRead)
async def read_profile(current_user=Depends(get_current_user)):
    return current_user