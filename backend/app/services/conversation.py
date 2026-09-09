import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.trip_planner.graph import trip_planner_graph
from app.core.auth import RequestIdentity
from app.models.enums import (
    ConversationSessionStatus,
    ConversationStage,
    MessageRole,
    MessageType,
    OnboardingStatus,
    TripStatus,
)
from app.models.trip import ConversationMessage
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
        """Process user message via LangGraph agent, enforce ownership, update state, and return updated state."""
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

        # 5. Handle UI actions if present
        if request.message_type == MessageType.UI_ACTION and request.payload:
            if request.payload.get("action") == "SET_LOCATION":
                trip.origin_latitude = request.payload.get("latitude")
                trip.origin_longitude = request.payload.get("longitude")
                if request.payload.get("label"):
                    trip.origin_text = request.payload.get("label")
                elif not trip.origin_text:
                    trip.origin_text = f"{request.payload.get('latitude')}, {request.payload.get('longitude')}"

        # 6. Prepare state and invoke LangGraph trip planner agent
        user_name = identity.user_name if identity else None
        graph_state = {
            "trip_id": str(trip.id),
            "user_id": str(trip.user_id) if trip.user_id else None,
            "guest_id": str(trip.guest_id) if trip.guest_id else None,
            "user_name": user_name,
            "user_message": request.content or "",
            "destination": trip.destination,
            "duration_days": trip.duration_days,
            "origin": trip.origin_text,
            "onboarding_complete": trip.onboarding_status == OnboardingStatus.COMPLETE,
            "missing_fields": [],
            "assistant_response": "",
        }

        graph_result = await trip_planner_graph.ainvoke(graph_state)

        # Update Trip entity with extracted fields from graph
        if graph_result.get("destination"):
            trip.destination = graph_result["destination"]
        if graph_result.get("duration_days"):
            trip.duration_days = graph_result["duration_days"]
        if graph_result.get("origin"):
            trip.origin_text = graph_result["origin"]

        # Fallback to deterministic regex extraction if graph returned no updates
        if not trip.destination or not trip.duration_days:
            from app.services.onboarding import extract_trip_info as regex_extract
            regex_updates = regex_extract(request.content, request.payload, request.message_type, trip)
            for field, val in regex_updates.items():
                if val is not None:
                    setattr(trip, field, val)

        # Evaluate completion status
        if trip.destination and trip.duration_days:
            trip.onboarding_status = OnboardingStatus.COMPLETE
            trip.status = TripStatus.PLANNING
            session.status = ConversationSessionStatus.COMPLETED
            session.current_stage = ConversationStage.COMPLETE

            origin_clause = f" from {trip.origin_text}" if trip.origin_text else ""
            if not graph_result.get("assistant_response") or "Where do you want" in graph_result.get("assistant_response", ""):
                assistant_text = f"Perfect! We have a {trip.duration_days}-day trip to {trip.destination}{origin_clause}. We're ready to start planning!"
            else:
                assistant_text = graph_result["assistant_response"]
        else:
            trip.onboarding_status = OnboardingStatus.IN_PROGRESS
            session.status = ConversationSessionStatus.ACTIVE
            if trip.destination and not trip.duration_days:
                session.current_stage = ConversationStage.TRIP_BASICS
                assistant_text = graph_result.get("assistant_response") or f"Nice! How many days are you thinking for {trip.destination}?"
            else:
                session.current_stage = ConversationStage.TRIP_BASICS
                assistant_text = graph_result.get("assistant_response") or "Where do you want to travel?"

        assistant_msg = await self.message_repo.create_message(
            db,
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            message_type=MessageType.TEXT,
            content=assistant_text,
            payload=None,
        )

        # 7. Commit and refresh
        await db.commit()
        await db.refresh(trip)
        await db.refresh(session)

        return TripStateResponse(
            trip=TripResponse.model_validate(trip),
            conversation=ConversationSessionResponse.model_validate(session),
            assistant_message=ConversationMessageResponse.model_validate(assistant_msg),
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
