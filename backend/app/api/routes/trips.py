import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.data.demo_trip import DEMO_TRIP_DATA
from app.schemas.trip import (
    ConversationMessageListResponse,
    DemoTripResponse,
    SendMessageRequest,
    TripCreateResponse,
    TripStateResponse,
)
from app.services.conversation import conversation_service
from app.services.trip import trip_service

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.get("/demo", response_model=DemoTripResponse)
def get_demo_trip():
    """Returns the hardcoded 3D demo trip graph for Japan."""
    return DEMO_TRIP_DATA


@router.post("", response_model=TripCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(db: AsyncSession = Depends(get_db)):
    """Initialize a new conversational trip session."""
    return await trip_service.create_trip(db)


@router.post("/{trip_id}/messages", response_model=TripStateResponse)
async def send_trip_message(
    trip_id: uuid.UUID,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """Process a conversational user message or UI action for a trip."""
    return await conversation_service.process_message(db, trip_id, request)


@router.get("/{trip_id}", response_model=TripStateResponse)
async def get_trip(
    trip_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve current trip state and active conversation session."""
    return await trip_service.get_trip(db, trip_id)


@router.get("/{trip_id}/messages", response_model=ConversationMessageListResponse)
async def get_trip_messages(
    trip_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve ordered conversation messages for a trip."""
    return await conversation_service.get_trip_messages(db, trip_id)
