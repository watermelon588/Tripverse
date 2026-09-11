import logging
import uuid
from typing import Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

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
            action = request.payload.get("action")
            if action == "SET_LOCATION" or ("origin_latitude" in request.payload and "origin_longitude" in request.payload):
                lat = request.payload.get("latitude") if request.payload.get("latitude") is not None else request.payload.get("origin_latitude")
                lon = request.payload.get("longitude") if request.payload.get("longitude") is not None else request.payload.get("origin_longitude")
                trip.origin_latitude = lat
                trip.origin_longitude = lon
                if request.payload.get("label"):
                    trip.origin_text = request.payload.get("label")
                elif request.payload.get("origin_text"):
                    trip.origin_text = request.payload.get("origin_text")
                elif not trip.origin_text and lat is not None and lon is not None:
                    trip.origin_text = f"{lat}, {lon}"
            elif action == "SET_ORIGIN" or request.payload.get("origin_text"):
                val = request.payload.get("origin_text") or request.payload.get("origin") or request.payload.get("label")
                if val:
                    trip.origin_text = str(val).strip()

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
            "origin_latitude": trip.origin_latitude,
            "origin_longitude": trip.origin_longitude,
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
        has_origin = bool(
            (trip.origin_text and str(trip.origin_text).strip())
            or (trip.origin_latitude is not None and trip.origin_longitude is not None)
        )
        if not trip.destination or not trip.duration_days or not has_origin:
            from app.services.onboarding import extract_trip_info as regex_extract
            regex_updates = regex_extract(request.content, request.payload, request.message_type, trip)
            for field, val in regex_updates.items():
                if val is not None:
                    setattr(trip, field, val)

        # Re-evaluate origin presence after fallback
        has_origin = bool(
            (trip.origin_text and str(trip.origin_text).strip())
            or (trip.origin_latitude is not None and trip.origin_longitude is not None)
        )

        # Evaluate completion status (strictly destination + duration + origin)
        if trip.destination and trip.duration_days and has_origin:
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
            if not trip.destination:
                session.current_stage = ConversationStage.TRIP_BASICS
                assistant_text = (
                    graph_result.get("assistant_response")
                    or "Where do you want to travel?"
                )
            elif not trip.duration_days:
                session.current_stage = ConversationStage.TRIP_BASICS
                assistant_text = (
                    graph_result.get("assistant_response")
                    or f"Nice! How many days are you thinking for {trip.destination}?"
                )
            else:
                session.current_stage = ConversationStage.ORIGIN
                assistant_text = (
                    graph_result.get("assistant_response")
                    or f"Got it — {trip.duration_days} days in {trip.destination}. Where will you be travelling from?"
                )

        assistant_payload = graph_result.get("ui_action") or None
        assistant_msg = await self.message_repo.create_message(
            db,
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            message_type=MessageType.TEXT,
            content=assistant_text,
            payload=assistant_payload,
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
        db_or_trip_id: Any = None,
        trip_id_or_request: Any = None,
        request_or_identity: Any = None,
        identity: Optional[RequestIdentity] = None,
        db: Optional[AsyncSession] = None,
        trip_id: Optional[uuid.UUID] = None,
        request: Optional[SendMessageRequest] = None,
    ):
        """
        Process user message and yield SSE events in real-time token streaming.
        Supports both self-managed database session (production streaming) and
        caller-injected session (offline tests).
        """
        if isinstance(db_or_trip_id, AsyncSession):
            active_db = db_or_trip_id
            target_trip_id = trip_id_or_request
            target_request = request_or_identity
            target_identity = identity
            use_managed_db = False
        else:
            target_trip_id = trip_id if trip_id is not None else db_or_trip_id
            target_request = request if request is not None else trip_id_or_request
            target_identity = identity if identity is not None else request_or_identity
            active_db = db
            use_managed_db = active_db is None

        if use_managed_db:
            from app.core.database import async_session_maker
            async with async_session_maker() as stream_db:
                async for event in self._process_message_stream_impl(
                    stream_db, target_trip_id, target_request, target_identity
                ):
                    yield event
        else:
            async for event in self._process_message_stream_impl(
                active_db, target_trip_id, target_request, target_identity
            ):
                yield event

    async def _process_message_stream_impl(
        self,
        db: AsyncSession,
        trip_id: uuid.UUID,
        request: SendMessageRequest,
        identity: Optional[RequestIdentity] = None,
    ):
        """Internal generator carrying out message processing and streaming on an active db session."""
        import json
        from app.agents.trip_planner.nodes.understand_user_msg_node import understand_user_message
        from app.agents.trip_planner.nodes.validate_state_node import validate_state
        from app.agents.trip_planner.nodes.respond_to_user_node import respond_to_user
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
            action = request.payload.get("action")
            if action == "SET_LOCATION" or ("origin_latitude" in request.payload and "origin_longitude" in request.payload):
                lat = request.payload.get("latitude") if request.payload.get("latitude") is not None else request.payload.get("origin_latitude")
                lon = request.payload.get("longitude") if request.payload.get("longitude") is not None else request.payload.get("origin_longitude")
                trip.origin_latitude = lat
                trip.origin_longitude = lon
                if request.payload.get("label"):
                    trip.origin_text = request.payload.get("label")
                elif request.payload.get("origin_text"):
                    trip.origin_text = request.payload.get("origin_text")
                elif not trip.origin_text and lat is not None and lon is not None:
                    trip.origin_text = f"{lat}, {lon}"
            elif action == "SET_ORIGIN" or request.payload.get("origin_text"):
                val = request.payload.get("origin_text") or request.payload.get("origin") or request.payload.get("label")
                if val:
                    trip.origin_text = str(val).strip()

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
            "origin_latitude": trip.origin_latitude,
            "origin_longitude": trip.origin_longitude,
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
        yield f"data: {json.dumps({'type': 'metadata', 'destination': trip.destination, 'duration_days': trip.duration_days, 'origin': trip.origin_text, 'onboarding_complete': is_complete, 'missing_fields': validation.get('missing_fields', []), 'user_name': current_state.get('user_name')})}\n\n"

        # 7. Execute node based on completion status
        user_name_display = current_state.get("user_name") or "Friend / Traveler"
        accumulated_text = ""
        ui_action = None

        if is_complete:
            trip.onboarding_status = OnboardingStatus.COMPLETE
            trip.status = TripStatus.PLANNING
            session.status = ConversationSessionStatus.COMPLETED
            session.current_stage = ConversationStage.COMPLETE

            logger.info(
                "🔥 STREAM planning started: destination=%s duration=%s origin=%s",
                trip.destination,
                trip.duration_days,
                trip.origin_text,
            )

            # Execute shared planning subgraph (destination research & candidate curation)
            from app.agents.trip_planner.nodes.planning_trip_node import (
                PLAN_GENERATION_SYSTEM_INSTRUCTION,
                build_plan_generation_prompt,
                execute_planning_subgraph,
            )

            planning_result = await execute_planning_subgraph(
                destination=trip.destination,
                duration_days=trip.duration_days,
                origin=trip.origin_text,
            )

            logger.info(
                "🔥 PLANNING DATA READY: candidates=%d",
                len(planning_result.get("candidates", [])),
            )

            # Build canonical plan prompt
            plan_generation_prompt = build_plan_generation_prompt(
                planning_result=planning_result,
                destination=trip.destination,
                duration_days=trip.duration_days,
                origin=trip.origin_text,
                user_name=current_state.get("user_name"),
            )

            # Stream the generated initial plan tokens
            logger.info("🔥 STREAMING INITIAL PLAN")
            try:
                async for token in llm_service.generate_stream(
                    prompt=plan_generation_prompt,
                    system_instruction=PLAN_GENERATION_SYSTEM_INSTRUCTION,
                    temperature=0.5,
                ):
                    accumulated_text += token
                    yield f"data: {json.dumps({'type': 'token', 'delta': token})}\n\n"
            except Exception as exc:
                logger.warning("Error during plan stream generation: %s", exc)
                if not accumulated_text:
                    candidates = planning_result.get("candidates", [])
                    c_names = [c["name"] for c in candidates if isinstance(c, dict) and "name" in c]
                    c_clause = f" featuring {', '.join(c_names)}" if c_names else ""
                    accumulated_text = (
                        f"Here is a first-draft outline for your {trip.duration_days}-day trip to {trip.destination}{c_clause}. "
                        f"Let's refine the sequence and activities together!"
                    )
                    yield f"data: {json.dumps({'type': 'token', 'delta': accumulated_text})}\n\n"

            logger.info("🔥 STREAM INITIAL PLAN COMPLETED")
        else:
            trip.onboarding_status = OnboardingStatus.IN_PROGRESS
            session.status = ConversationSessionStatus.ACTIVE
            if not trip.destination or not trip.duration_days:
                session.current_stage = ConversationStage.TRIP_BASICS
            else:
                session.current_stage = ConversationStage.ORIGIN

            respond_result = await respond_to_user(current_state)
            accumulated_text = respond_result.get("assistant_response", "")
            ui_action = respond_result.get("ui_action")

            if ui_action:
                yield f"data: {json.dumps({'type': 'action', 'action': ui_action.get('action'), 'payload': ui_action})}\n\n"

            if accumulated_text:
                words = accumulated_text.split(" ")
                for i, w in enumerate(words):
                    chunk = w if i == len(words) - 1 else w + " "
                    yield f"data: {json.dumps({'type': 'token', 'delta': chunk})}\n\n"

        if not accumulated_text.strip():
            accumulated_text = "I'm ready to help plan your trip! Where are you thinking of going?"

        # 8. Save assistant message and commit to database
        assistant_msg = await self.message_repo.create_message(
            db,
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            message_type=MessageType.TEXT,
            content=accumulated_text.strip(),
            payload=ui_action,
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
