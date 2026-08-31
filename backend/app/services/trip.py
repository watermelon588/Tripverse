import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.trip_planner.graph import trip_planner_graph
from app.models.enums import MessageRole, MessageType
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
    """Service orchestrating trip lifecycle and initial state creation."""

    def __init__(
        self,
        trip_repo: TripRepository = None,
        conversation_repo: ConversationRepository = None,
        message_repo: MessageRepository = None,
    ):
        self.trip_repo = trip_repo or TripRepository()
        self.conversation_repo = conversation_repo or ConversationRepository()
        self.message_repo = message_repo or MessageRepository()

    async def create_trip(self, db: AsyncSession) -> TripCreateResponse:
        """Orchestrate new trip creation, conversation session, and initial agent greeting."""
        # 1. Create Trip
        new_trip = await self.trip_repo.create_trip(db)

        # 2. Create ConversationSession
        new_session = await self.conversation_repo.create_session(db, new_trip.id)

        # 3. Invoke Trip Planner LangGraph agent
        initial_state = {
            "trip_id": "abc-123",
            "user_message": "Japan for 10 days",
            "destination": None,
            "duration_days": None,
            "origin": None,
            "assistant_response": "",
        }
        graph_result = trip_planner_graph.invoke(initial_state)

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

    async def get_trip(
        self, db: AsyncSession, trip_id: uuid.UUID
    ) -> TripStateResponse:
        """Fetch trip state and ensure active conversation session exists."""
        trip = await self.trip_repo.get_by_id(db, trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip with ID '{trip_id}' not found.",
            )

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
