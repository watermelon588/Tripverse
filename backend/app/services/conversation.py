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
        if graph_result.get("user_name") and identity and not identity.user_name:
            identity.user_name = graph_result["user_name"]
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
            assistant_text = (
                graph_result.get("assistant_response")
                or f"Perfect! We have a {trip.duration_days}-day trip to {trip.destination}{origin_clause}. We're ready to start planning!"
            )
        else:
            trip.onboarding_status = OnboardingStatus.IN_PROGRESS
            session.status = ConversationSessionStatus.ACTIVE
            session.current_stage = ConversationStage.TRIP_BASICS
            if trip.destination and not trip.duration_days:
                assistant_text = (
                    graph_result.get("assistant_response")
                    or f"Nice! How many days are you thinking for {trip.destination}?"
                )
            else:
                assistant_text = (
                    graph_result.get("assistant_response")
                    or "Where do you want to travel?"
                )

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

    async def process_message_stream(
        self,
        db: AsyncSession,
        trip_id: uuid.UUID,
        request: SendMessageRequest,
        identity: Optional[RequestIdentity] = None,
    ):
        """
        Process user message and yield SSE events in real-time token streaming.
        Event schema:
        - metadata: {"type": "metadata", "destination": ..., "duration_days": ..., "origin": ..., "onboarding_complete": bool}
        - token: {"type": "token", "delta": "text chunk"}
        - done: {"type": "done", "trip": {...}, "conversation": {...}, "assistant_message": {...}}
        """
        import json
        from app.agents.trip_planner.nodes.understand_user_msg_node import understand_user_message
        from app.agents.trip_planner.nodes.validate_state_node import validate_state
        from app.agents.trip_planner.nodes.respond_to_user_node import RESPOND_TO_USER_SYSTEM_INSTRUCTION
        from app.agents.trip_planner.nodes.planning_trip_node import PLANNING_TRIP_SYSTEM_INSTRUCTION
        from app.services.llm.service import llm_service

        # 1. Fetch trip & enforce ownership
        trip = await self.trip_repo.get_by_id(db, trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trip with ID '{trip_id}' not found.",
            )
        trip_service.verify_trip_ownership(trip, identity)

        # 2. Get or create active session
        session = await self.conversation_repo.get_or_create_active_session(db, trip.id)

        # 3. Save User message
        await self.message_repo.create_message(
            db,
            session_id=session.id,
            role=MessageRole.USER,
            message_type=request.message_type,
            content=request.content,
            payload=request.payload,
        )

        # 4. Handle UI actions if present
        if request.message_type == MessageType.UI_ACTION and request.payload:
            if request.payload.get("action") == "SET_LOCATION":
                trip.origin_latitude = request.payload.get("latitude")
                trip.origin_longitude = request.payload.get("longitude")
                if request.payload.get("label"):
                    trip.origin_text = request.payload.get("label")

        # 5. Build state and understand user message
        user_name = identity.user_name if identity else None
        current_state = {
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

        # Understand user message
        understood_updates = await understand_user_message(current_state)
        current_state.update(understood_updates)

        if current_state.get("user_name") and identity and not identity.user_name:
            identity.user_name = current_state["user_name"]
        if current_state.get("destination"):
            trip.destination = current_state["destination"]
        if current_state.get("duration_days"):
            trip.duration_days = current_state["duration_days"]
        if current_state.get("origin"):
            trip.origin_text = current_state["origin"]

        # Validate state
        validation = validate_state(current_state)
        current_state.update(validation)

        is_complete = validation["onboarding_complete"]

        # 6. Emit metadata event immediately
        yield f"data: {json.dumps({'type': 'metadata', 'destination': trip.destination, 'duration_days': trip.duration_days, 'origin': trip.origin_text, 'onboarding_complete': is_complete, 'user_name': current_state.get('user_name')})}\n\n"

        # 7. Choose system instruction and prompt for streaming
        user_name_display = current_state.get("user_name") or "Friend / Traveler"
        if is_complete:
            trip.onboarding_status = OnboardingStatus.COMPLETE
            trip.status = TripStatus.PLANNING
            session.status = ConversationSessionStatus.COMPLETED
            session.current_stage = ConversationStage.COMPLETE

            sys_instruction = PLANNING_TRIP_SYSTEM_INSTRUCTION
            stream_prompt = f"""TRIP INFORMATION:
Traveler Name: {user_name_display}
Destination: {trip.destination}
Duration: {trip.duration_days} days
Origin: {trip.origin_text}

Acknowledge that enough information has been provided to begin planning.
Address the traveler warmly by name if known.
Keep the response short."""
        else:
            trip.onboarding_status = OnboardingStatus.IN_PROGRESS
            session.status = ConversationSessionStatus.ACTIVE
            session.current_stage = ConversationStage.TRIP_BASICS

            sys_instruction = RESPOND_TO_USER_SYSTEM_INSTRUCTION
            stream_prompt = f"""CURRENT TRIP STATE:
Traveler Name: {user_name_display}
Trip ID: {str(trip.id)}
Destination: {trip.destination}
Duration (days): {trip.duration_days}
Origin: {trip.origin_text}

MISSING REQUIRED FIELDS:
{validation.get('missing_fields', [])}

USER'S LATEST MESSAGE:
"{request.content or ''}"

Write the best natural response to the user."""

        accumulated_text = ""
        try:
            async for token in llm_service.generate_stream(
                prompt=stream_prompt,
                system_instruction=sys_instruction,
                temperature=0.7,
            ):
                accumulated_text += token
                yield f"data: {json.dumps({'type': 'token', 'delta': token})}\n\n"
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(f"Error during stream token generation: {exc}")
            if not accumulated_text:
                if is_complete:
                    accumulated_text = f"Perfect! I have your trip to {trip.destination} for {trip.duration_days} days. Let's start planning."
                else:
                    accumulated_text = "Where would you like to travel?"
                yield f"data: {json.dumps({'type': 'token', 'delta': accumulated_text})}\n\n"

        if not accumulated_text.strip():
            accumulated_text = "I'm ready to help plan your trip! Where are you thinking of going?"

        # 8. Save assistant message and commit to database
        assistant_msg = await self.message_repo.create_message(
            db,
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            message_type=MessageType.TEXT,
            content=accumulated_text.strip(),
            payload=None,
        )

        await db.commit()
        await db.refresh(trip)
        await db.refresh(session)

        # 9. Emit final done event with full persistent state
        done_payload = {
            "type": "done",
            "trip": TripResponse.model_validate(trip).model_dump(mode="json"),
            "conversation": ConversationSessionResponse.model_validate(session).model_dump(mode="json"),
            "assistant_message": ConversationMessageResponse.model_validate(assistant_msg).model_dump(mode="json"),
        }
        yield f"data: {json.dumps(done_payload)}\n\n"

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
