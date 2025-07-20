# backend/app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import AsyncSessionLocal
from app.crud import authenticate_user, create_user
from app.schemas.user import UserCreate, UserRead, Token, TokenPayload
from app.security import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["authentication"])

async def get_db():
    async with AsyncSessionLocal() as db:
        yield db

@router.post("/register", response_model=UserRead)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    if not user_in.username:
        user_in.username = user_in.email.split('@')[0]  # or just user_in.email
    user = await create_user(db, user_in)
    if not user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return user

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect credentials")
    access = create_access_token(user.id, user.username)
    refresh = create_refresh_token(user.id, user.username)
    return Token(
        access_token=access,
        token_type="bearer",
        refresh_token=refresh,
    )

@router.post("/token/refresh", response_model=Token)
async def refresh_token(
    payload: TokenPayload = Depends(decode_token),
):
    access = create_access_token(payload.sub)
    refresh = create_refresh_token(payload.sub)
    return Token(
        access_token=access,
        token_type="bearer",
        refresh_token=refresh,
    )