from fastapi import APIRouter, Depends, HTTPException, status, Body, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import AsyncSessionLocal
from app.crud import get_user_by_username, update_user_profile
from app.security import decode_token
from app.schemas.user import UserRead, UserUpdate
from app.aws.s3_client import upload_avatar_to_s3
import logging

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")
router = APIRouter(prefix="/profile", tags=["profile"])

logger = logging.getLogger(__name__)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserRead:
    payload = decode_token(token)
    print("Decoded token payload:", payload.dict())

    async with AsyncSessionLocal() as db:
        user = await get_user_by_username(db, payload.username)
        print("Queried user from DB:", user)

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or inactive user",
            )
        return user

@router.get("/me", response_model=UserRead)
async def read_profile(current_user: UserRead = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserRead)
async def update_profile(
    update: UserUpdate = Body(...),
    current_user: UserRead = Depends(get_current_user)
):
    async with AsyncSessionLocal() as db:
        updated_user = await update_user_profile(db, current_user.id, update.dict(exclude_unset=True))
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        return updated_user

@router.post("/profile/me/avatar", response_model=UserRead)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: UserRead = Depends(get_current_user)
):
    # Security: Only allow image MIME types
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only images allowed.")

    try:
        avatar_url = upload_avatar_to_s3(current_user.id, file)

        async with AsyncSessionLocal() as db:
            updated_user = await update_user_profile(db, current_user.id, {"avatar_url": avatar_url})
            return updated_user

    except Exception as e:
        logger.error(f"Avatar upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload failed.")