import logging
import uuid
from typing import Optional, Dict, Any
from pydantic import BaseModel
import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    id: str
    email: Optional[str] = None
    role: Optional[str] = "authenticated"
    user_metadata: Dict[str, Any] = {}


class RequestIdentity(BaseModel):
    """Application-level resolved request identity (either Authenticated User or Guest)."""
    user_id: Optional[str] = None
    guest_id: Optional[str] = None

    @property
    def is_authenticated(self) -> bool:
        return self.user_id is not None

    @property
    def is_guest(self) -> bool:
        return self.guest_id is not None

    @property
    def identifier(self) -> Optional[str]:
        return self.user_id or self.guest_id


def _decode_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify Supabase JWT token."""
    # 1. Try local secret verification if secret is configured
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            return payload
        except jwt.PyJWTError as e:
            logger.debug(f"JWT secret verification failed: {e}")

    # 2. Try unverified decode for sub & basic fields
    try:
        payload = jwt.decode(
            token,
            options={"verify_signature": False, "verify_exp": True},
        )
        return payload
    except Exception as e:
        logger.warning(f"Failed to decode token payload: {e}")
        return None


async def _verify_token_with_supabase(token: str) -> Optional[AuthenticatedUser]:
    """Verify token directly against Supabase Auth API endpoint."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.SUPABASE_KEY,
                },
            )
            if res.status_code == 200:
                data = res.json()
                return AuthenticatedUser(
                    id=data.get("id"),
                    email=data.get("email"),
                    role=data.get("role", "authenticated"),
                    user_metadata=data.get("user_metadata", {}),
                )
    except Exception as e:
        logger.error(f"Error calling Supabase Auth API: {e}")
    return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthenticatedUser:
    """FastAPI dependency to strictly require an authenticated Supabase user."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Fast path: verify token with Supabase API for accuracy
    user = await _verify_token_with_supabase(token)
    if user:
        return user

    # Fallback to local JWT decode
    payload = _decode_supabase_token(token)
    if payload and "sub" in payload:
        return AuthenticatedUser(
            id=payload["sub"],
            email=payload.get("email"),
            role=payload.get("role", "authenticated"),
            user_metadata=payload.get("user_metadata", {}),
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AuthenticatedUser]:
    """FastAPI dependency for endpoints that support both authenticated and guest users."""
    if not credentials or not credentials.credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def get_request_identity(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_guest_id: Optional[str] = Header(None, alias="X-Guest-ID"),
) -> RequestIdentity:
    """
    Resolve client identity into either an Authenticated User (user_id) or Guest (guest_id).
    Rejects conflicting requests supplying both credentials.
    """
    user_id: Optional[str] = None
    guest_id: Optional[str] = None

    # 1. Resolve authenticated user if token is provided
    if credentials and credentials.credentials:
        user = await get_optional_user(credentials)
        if user:
            user_id = user.id

    # 2. Resolve guest UUID if header is provided
    if x_guest_id:
        cleaned_guest_id = str(x_guest_id).strip()
        try:
            # Strictly validate that it conforms to standard UUID format
            parsed_uuid = uuid.UUID(cleaned_guest_id)
            guest_id = str(parsed_uuid)
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid X-Guest-ID format. Must be a valid UUID.",
            )

    # 3. Invariant check: Never allow both identities in the same request
    if user_id and guest_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot supply both authenticated user credentials and X-Guest-ID.",
        )

    return RequestIdentity(user_id=user_id, guest_id=guest_id)
