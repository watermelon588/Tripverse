import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import RequestIdentity
from app.models.enums import MessageRole
from app.repositories.conversation import ConversationRepository
from app.repositories.message import MessageRepository
from app.repositories.trip import TripRepository
from app.schemas.trip import (
    ConversationMessageListResponse,
    ConversationMessageResponse,
    ConversationSessionResponse,
    SendMessageRequest,
    TripResponse,
    TripStateResponse,
)
from app.services.onboarding import process_user_message
from app.services.trip import trip_service


class ConversationService:
    """Service handling conversation interactions, ownership validation, and message workflow."""

    def __init__(
        self,
        trip_repo: TripRepository = None,
        conversation_repo: ConversationRepository = None,
        message_repo: MessageRepository = None,
    ):
        self.trip_repo = trip_repo or TripRepository()
        self.conversation_repo = conversation_repo or ConversationRepository()
        self.message_repo = message_repo or MessageRepository()

    async def process_message(
        self,
        db: AsyncSession,
        trip_id: uuid.UUID,
        request: SendMessageRequest,
        identity: Optional[RequestIdentity] = None,
    ) -> TripStateResponse:
        """Process user message, enforce ownership, update onboarding state, and return updated state."""
        # 1. Fetch trip
        trip = await self.trip_repo.get_by_id(db, trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip with ID '{trip_id}' not found.",
            )

        # 2. Enforce trip-scoped authorization
        trip_service.verify_trip_ownership(trip, identity)

        # 3. Get or create active session
        session = await self.conversation_repo.get_or_create_active_session(
            db, trip.id
        )

        # 4. Save User message
        await self.message_repo.create_message(
            db,
            session_id=session.id,
            role=MessageRole.USER,
            message_type=request.message_type,
            content=request.content,
            payload=request.payload,
        )

        # 5. Run onboarding logic to update state & generate assistant message
        assistant_msg = process_user_message(
            trip=trip,
            session=session,
            content=request.content,
            payload=request.payload,
            message_type=request.message_type,
        )
        db.add(assistant_msg)

        # 6. Commit and refresh
        await db.commit()
        await db.refresh(trip)
        await db.refresh(session)

        return TripStateResponse(
            trip=TripResponse.model_validate(trip),
            conversation=ConversationSessionResponse.model_validate(session),
        )

    async def get_trip_messages(
        self,
        db: AsyncSession,
        trip_id: uuid.UUID,
        identity: Optional[RequestIdentity] = None,
    ) -> ConversationMessageListResponse:
        """Retrieve all ordered conversation messages for a trip after verifying ownership."""
        trip = await self.trip_repo.get_by_id(db, trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip with ID '{trip_id}' not found.",
            )

        # Enforce trip-scoped authorization
        trip_service.verify_trip_ownership(trip, identity)

        session = await self.conversation_repo.get_active_session_by_trip_id(
            db, trip_id
        )
        if not session:
            return ConversationMessageListResponse(messages=[])

        messages = await self.message_repo.get_messages_by_session_id(db, session.id)
        return ConversationMessageListResponse(
            messages=[ConversationMessageResponse.model_validate(m) for m in messages]
        )


conversation_service = ConversationService()
