from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile, status

from app.core.auth import AuthenticatedUser, get_optional_user
from app.services.upload import upload_service

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/avatar", status_code=status.HTTP_200_OK)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_user),
):
    """
    Upload a user profile picture to Cloudinary.
    Supports authenticated users as well as optional guest/anonymous uploads.
    """
    return await upload_service.upload_avatar(file)
