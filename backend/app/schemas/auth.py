from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class SignUpRequest(BaseModel):
    email: str = Field(
        ...,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        description="Valid email address",
    )
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")
    full_name: Optional[str] = Field(None, description="User full display name")


class LoginRequest(BaseModel):
    email: str = Field(
        ...,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        description="User email address",
    )
    password: str = Field(..., description="User password")


class ForgotPasswordRequest(BaseModel):
    email: str = Field(
        ...,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        description="Registered email to send password reset instructions to",
    )


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, description="New password (at least 6 characters)")


class UserProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    role: Optional[str] = "authenticated"
    full_name: Optional[str] = None
    user_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[str] = None


class AuthSessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = None
    refresh_token: Optional[str] = None
    user: UserProfileResponse


class MessageResponse(BaseModel):
    message: str
    status: str = "success"
