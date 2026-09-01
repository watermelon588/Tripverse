from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from app.core.auth import AuthenticatedUser, get_current_user, security
from app.schemas.auth import (
    AuthSessionResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignUpRequest,
    UserProfileResponse,
)
from app.services.auth import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignUpRequest):
    """Register a new user account with email and password via Supabase Auth."""
    return await auth_service.sign_up(
        email=request.email,
        password=request.password,
        full_name=request.full_name,
    )


@router.post("/login", response_model=AuthSessionResponse)
async def login(request: LoginRequest):
    """Authenticate with email and password, returning JWT access token and user profile."""
    return await auth_service.login(
        email=request.email,
        password=request.password,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Log out the current authenticated user and invalidate the session."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await auth_service.logout(credentials.credentials)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset instructions/OTP to the registered email address."""
    return await auth_service.forgot_password(email=request.email)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    request: ResetPasswordRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Update password using recovery/access token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid recovery token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await auth_service.reset_password(
        token=credentials.credentials,
        new_password=request.new_password,
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieve profile and metadata of the currently authenticated user."""
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role or "authenticated",
        full_name=current_user.user_metadata.get("full_name"),
        user_metadata=current_user.user_metadata,
    )
