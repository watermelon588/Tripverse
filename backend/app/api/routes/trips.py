import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, RequestIdentity, get_current_user, get_request_identity
from app.core.database import get_db
from app.schemas.trip import (
    ConversationMessageListResponse,
    SendMessageRequest,
    TripCreateResponse,
    TripResponse,
    TripStateResponse,
)
from app.services.conversation import conversation_service
from app.services.trip import trip_service

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.get("/me", response_model=List[TripResponse])
async def get_my_trips(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all trips associated with the authenticated user."""
    return await trip_service.get_user_trips(db, current_user.id)


@router.get("", response_model=List[TripResponse])
async def list_trips(
    identity: RequestIdentity = Depends(get_request_identity),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all trips associated with current identity (authenticated user or guest)."""
    if identity.user_id:
        return await trip_service.get_user_trips(db, identity.user_id)
    elif identity.guest_id:
        return await trip_service.get_guest_trips(db, identity.guest_id)
    return []


@router.post("", response_model=TripCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    identity: RequestIdentity = Depends(get_request_identity),
    db: AsyncSession = Depends(get_db),
):
    """Initialize a new conversational trip session belonging to either user_id or guest_id."""
    return await trip_service.create_trip(db, identity=identity)


@router.post("/{trip_id}/messages", response_model=TripStateResponse)
async def send_trip_message(
    trip_id: uuid.UUID,
    request: SendMessageRequest,
    identity: RequestIdentity = Depends(get_request_identity),
    db: AsyncSession = Depends(get_db),
):
    """Process a conversational user message or UI action for an authorized trip."""
    return await conversation_service.process_message(db, trip_id, request, identity=identity)


@router.post("/{trip_id}/messages/stream")
async def send_trip_message_stream(
    trip_id: uuid.UUID,
    request: SendMessageRequest,
    identity: RequestIdentity = Depends(get_request_identity),
    db: AsyncSession = Depends(get_db),
):
    """Process message and stream tokens via Server-Sent Events (SSE)."""
    # 1. Pre-validate trip existence and ownership before initiating SSE stream
    trip = await trip_service.trip_repo.get_by_id(db, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID '{trip_id}' not found.",
        )
    trip_service.verify_trip_ownership(trip, identity)

    return StreamingResponse(
        conversation_service.process_message_stream(trip_id=trip_id, request=request, identity=identity),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{trip_id}", response_model=TripStateResponse)
async def get_trip(
    trip_id: uuid.UUID,
    identity: RequestIdentity = Depends(get_request_identity),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve current trip state and active conversation session after authorization check."""
    return await trip_service.get_trip(db, trip_id, identity=identity)


@router.get("/{trip_id}/messages", response_model=ConversationMessageListResponse)
async def get_trip_messages(
    trip_id: uuid.UUID,
    identity: RequestIdentity = Depends(get_request_identity),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve ordered conversation messages for an authorized trip."""
    return await conversation_service.get_trip_messages(db, trip_id, identity=identity)


@router.delete("/{trip_id}")
async def delete_trip(
    trip_id: uuid.UUID,
    identity: RequestIdentity = Depends(get_request_identity),
    db: AsyncSession = Depends(get_db),
):
    """Delete a trip and its associated conversation sessions/messages."""
    return await trip_service.delete_trip(db, trip_id, identity=identity)

