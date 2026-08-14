import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.data.demo_trip import DEMO_TRIP_DATA
from app.models.enums import (
    ConversationSessionStatus,
    ConversationStage,
    MessageRole,
    MessageType,
    OnboardingStatus,
    TripStatus,
)
from app.models.trip import ConversationMessage, ConversationSession, Trip
from app.schemas.trip import (
    ConversationMessageListResponse,
    ConversationMessageResponse,
    ConversationSessionResponse,
    DemoTripResponse,
    SendMessageRequest,
    TripCreateResponse,
    TripResponse,
    TripStateResponse,
)
from app.services.onboarding import process_user_message

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.get("/demo", response_model=DemoTripResponse)
def get_demo_trip():
    """Returns the hardcoded 3D demo trip graph for Japan."""
    return DEMO_TRIP_DATA


@router.post("", response_model=TripCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(db: AsyncSession = Depends(get_db)):
    """Initialize a new conversational trip session."""
    # 1. Create Trip instance
    new_trip = Trip(
        status=TripStatus.DRAFT,
        onboarding_status=OnboardingStatus.IN_PROGRESS,
        currency="INR",
    )
    db.add(new_trip)
    await db.flush()

    # 2. Create ConversationSession
    new_session = ConversationSession(
        trip_id=new_trip.id,
        status=ConversationSessionStatus.ACTIVE,
        current_stage=ConversationStage.TRIP_BASICS,
    )
    db.add(new_session)
    await db.flush()

    # 3. Create initial Assistant message
    initial_msg = ConversationMessage(
        session_id=new_session.id,
        role=MessageRole.ASSISTANT,
        message_type=MessageType.TEXT,
        content="Where do you want to head out to?",
        payload=None,
    )
    db.add(initial_msg)
    await db.commit()
    await db.refresh(initial_msg)

    return TripCreateResponse(
        trip_id=new_trip.id,
        session_id=new_session.id,
        assistant_message=ConversationMessageResponse.model_validate(initial_msg),
    )


@router.post("/{trip_id}/messages", response_model=TripStateResponse)
async def send_trip_message(
    trip_id: uuid.UUID,
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """Process a conversational user message or UI action for a trip."""
    # 1. Fetch Trip
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID '{trip_id}' not found.",
        )

    # 2. Fetch active ConversationSession
    session_stmt = (
        select(ConversationSession)
        .where(ConversationSession.trip_id == trip_id)
        .order_by(ConversationSession.created_at.desc())
    )
    session_result = await db.execute(session_stmt)
    session = session_result.scalars().first()

    if not session:
        session = ConversationSession(
            trip_id=trip.id,
            status=ConversationSessionStatus.ACTIVE,
            current_stage=ConversationStage.TRIP_BASICS,
        )
        db.add(session)
        await db.flush()

    # 3. Save User message
    user_msg = ConversationMessage(
        session_id=session.id,
        role=MessageRole.USER,
        message_type=request.message_type,
        content=request.content,
        payload=request.payload,
    )
    db.add(user_msg)

    # 4. Process logic & generate assistant response
    assistant_msg = process_user_message(
        trip=trip,
        session=session,
        content=request.content,
        payload=request.payload,
        message_type=request.message_type,
    )
    db.add(assistant_msg)

    await db.commit()
    await db.refresh(trip)
    await db.refresh(session)

    return TripStateResponse(
        trip=TripResponse.model_validate(trip),
        conversation=ConversationSessionResponse.model_validate(session),
    )


@router.get("/{trip_id}", response_model=TripStateResponse)
async def get_trip(
    trip_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve current trip state and active conversation session."""
    trip_stmt = select(Trip).where(Trip.id == trip_id)
    trip_result = await db.execute(trip_stmt)
    trip = trip_result.scalar_one_or_none()

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID '{trip_id}' not found.",
        )

    session_stmt = (
        select(ConversationSession)
        .where(ConversationSession.trip_id == trip_id)
        .order_by(ConversationSession.created_at.desc())
    )
    session_result = await db.execute(session_stmt)
    session = session_result.scalars().first()

    if not session:
        session = ConversationSession(
            trip_id=trip.id,
            status=ConversationSessionStatus.ACTIVE,
            current_stage=ConversationStage.TRIP_BASICS,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    return TripStateResponse(
        trip=TripResponse.model_validate(trip),
        conversation=ConversationSessionResponse.model_validate(session),
    )


@router.get("/{trip_id}/messages", response_model=ConversationMessageListResponse)
async def get_trip_messages(
    trip_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve ordered conversation messages for a trip."""
    trip_stmt = select(Trip).where(Trip.id == trip_id)
    trip_result = await db.execute(trip_stmt)
    trip = trip_result.scalar_one_or_none()

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID '{trip_id}' not found.",
        )

    session_stmt = (
        select(ConversationSession)
        .where(ConversationSession.trip_id == trip_id)
        .order_by(ConversationSession.created_at.desc())
    )
    session_result = await db.execute(session_stmt)
    session = session_result.scalars().first()

    if not session:
        return ConversationMessageListResponse(messages=[])

    msg_stmt = (
        select(ConversationMessage)
        .where(ConversationMessage.session_id == session.id)
        .order_by(ConversationMessage.created_at.asc())
    )
    msg_result = await db.execute(msg_stmt)
    messages = msg_result.scalars().all()

    return ConversationMessageListResponse(
        messages=[ConversationMessageResponse.model_validate(m) for m in messages]
    )
