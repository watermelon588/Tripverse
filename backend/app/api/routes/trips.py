import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedUser, RequestIdentity, get_current_user, get_request_identity
from app.core.database import get_db
from app.data.demo_trip import DEMO_TRIP_DATA
from app.schemas.trip import (
    ConversationMessageListResponse,
    DemoTripResponse,
    SendMessageRequest,
    TripCreateResponse,
    TripResponse,
    TripStateResponse,
)
from app.services.conversation import conversation_service
from app.services.trip import trip_service

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.get("/demo", response_model=DemoTripResponse)
def get_demo_trip():
    """Returns the hardcoded 3D demo trip graph for Japan."""
    return DEMO_TRIP_DATA


@router.get("/me", response_model=List[TripResponse])
async def get_my_trips(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all trips associated with the authenticated user."""
    return await trip_service.get_user_trips(db, current_user.id)


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
