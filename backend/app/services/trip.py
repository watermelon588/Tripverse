import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.trip_planner.graph import trip_planner_graph
from app.core.auth import RequestIdentity
from app.models.enums import MessageRole, MessageType
from app.models.trip import Trip
from app.repositories.conversation import ConversationRepository
from app.repositories.message import MessageRepository
from app.repositories.trip import TripRepository
from app.schemas.trip import (
    ConversationMessageResponse,
    ConversationSessionResponse,
    TripCreateResponse,
    TripResponse,
    TripStateResponse,
)


class TripService:
    """Service orchestrating trip lifecycle, ownership checks, and initial state creation."""

    def __init__(
        self,
        trip_repo: TripRepository = None,
        conversation_repo: ConversationRepository = None,
        message_repo: MessageRepository = None,
    ):
        self.trip_repo = trip_repo or TripRepository()
        self.conversation_repo = conversation_repo or ConversationRepository()
        self.message_repo = message_repo or MessageRepository()

    def verify_trip_ownership(
        self, trip: Trip, identity: Optional[RequestIdentity] = None
    ) -> None:
        """Enforce strict trip-scoped authorization for authenticated users and guests."""
        if not identity or (identity.user_id is None and identity.guest_id is None):
            # If trip has an owner but request supplied no identity, deny access
            if trip.user_id is not None or trip.guest_id is not None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: Authentication or guest identity required to access this trip.",
                )
            return

        # 1. Authenticated User owned trip
        if trip.user_id is not None:
            if identity.user_id != trip.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You do not have permission to access this trip.",
                )

        # 2. Guest owned trip
        elif trip.guest_id is not None:
            if identity.guest_id != trip.guest_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You do not have permission to access this guest trip.",
                )

    async def create_trip(
        self, db: AsyncSession, identity: Optional[RequestIdentity] = None
    ) -> TripCreateResponse:
        """Orchestrate new trip creation, conversation session, and initial agent greeting."""
        user_id = identity.user_id if identity else None
        guest_id = identity.guest_id if identity else None

        # 1. Create Trip (linked to user_id or guest_id)
        new_trip = await self.trip_repo.create_trip(
            db, user_id=user_id, guest_id=guest_id
        )

        # 2. Create ConversationSession
        new_session = await self.conversation_repo.create_session(db, new_trip.id)

        user_name = identity.user_name if identity else None

        # 3. Invoke Trip Planner LangGraph agent
        initial_state = {
            "trip_id": str(new_trip.id),
            "user_id": str(user_id) if user_id else None,
            "guest_id": str(guest_id) if guest_id else None,
            "user_name": user_name,
            "user_message": "",
            "destination": None,
            "duration_days": None,
            "origin": None,
            "onboarding_complete": False,
            "missing_fields": ["destination", "duration_days"],
            "assistant_response": "",
        }
        graph_result = await trip_planner_graph.ainvoke(initial_state)

        # 4. Save initial Assistant greeting message
        initial_msg = await self.message_repo.create_message(
            db,
            session_id=new_session.id,
            role=MessageRole.ASSISTANT,
            message_type=MessageType.TEXT,
            content=graph_result["assistant_response"],
            payload=None,
        )

        # 5. Commit everything
        await db.commit()
        await db.refresh(initial_msg)

        # 6. Return response schema
        return TripCreateResponse(
            trip_id=new_trip.id,
            session_id=new_session.id,
            assistant_message=ConversationMessageResponse.model_validate(initial_msg),
        )

    async def get_user_trips(
        self, db: AsyncSession, user_id: str
    ) -> list[TripResponse]:
        """Fetch all trips created by the authenticated user."""
        trips = await self.trip_repo.get_by_user_id(db, user_id)
        return [TripResponse.model_validate(t) for t in trips]

    async def get_guest_trips(
        self, db: AsyncSession, guest_id: str
    ) -> list[TripResponse]:
        """Fetch all trips created by a guest."""
        trips = await self.trip_repo.get_by_guest_id(db, guest_id)
        return [TripResponse.model_validate(t) for t in trips]

    async def get_trip(
        self,
        db: AsyncSession,
        trip_id: uuid.UUID,
        identity: Optional[RequestIdentity] = None,
    ) -> TripStateResponse:
        """Fetch trip state and ensure active conversation session exists after authorization check."""
        trip = await self.trip_repo.get_by_id(db, trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip with ID '{trip_id}' not found.",
            )

        # Enforce trip authorization
        self.verify_trip_ownership(trip, identity)

        active_session = await self.conversation_repo.get_active_session_by_trip_id(
            db, trip_id
        )
        if not active_session:
            active_session = await self.conversation_repo.create_session(db, trip.id)
            await db.commit()
            await db.refresh(active_session)

        return TripStateResponse(
            trip=TripResponse.model_validate(trip),
            conversation=ConversationSessionResponse.model_validate(active_session),
        )


trip_service = TripService()
