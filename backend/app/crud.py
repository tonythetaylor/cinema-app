from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.user import UserCreate
from app.security import hash_password, verify_password

async def get_user_by_username(db: AsyncSession, username: str):
    q = await db.execute(select(User).where(User.username == username))
    return q.scalars().first()

async def create_user(db: AsyncSession, user_in: UserCreate):
    user = User(
        username=user_in.username,
         email=user_in.email,
        hashed_password=hash_password(user_in.password),
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
        return user
    except IntegrityError:
        await db.rollback()
        return None

async def update_user_profile(db, user_id: int, update_data: dict):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user

async def authenticate_user(db: AsyncSession, username: str, password: str):
    user = await get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user