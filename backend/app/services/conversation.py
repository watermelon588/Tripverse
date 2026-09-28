import asyncio
import logging
import re
import uuid
from datetime import date
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
from sqlalchemy import select

from app.models.trip import ConversationMessage, ConversationSession
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
from app.services.seasonality import trip_season
from app.services.trip import trip_service

SEASON_WAIT = 2.0  # seconds a fresh draft may wait for season facts once research is done


async def _await_season(task: "asyncio.Task[dict | None]") -> dict | None:
    """Season facts are optional: a slow or failing lookup never holds up or breaks the draft.
    It usually finished during research already; shield() lets a slow one complete and cache."""
    # Retrieve a late failure so it isn't reported as "Task exception was never retrieved".
    task.add_done_callback(lambda done: done.cancelled() or done.exception())
    try:
        return await asyncio.wait_for(asyncio.shield(task), SEASON_WAIT)
    except asyncio.TimeoutError:
        logger.info("Season facts not ready in %.1fs; drafting without them", SEASON_WAIT)
    except Exception as exc:  # optional facts: never fail the draft over them
        logger.warning("Season facts unavailable: %s", exc)
    return None


def _start_date(preferences: dict | None) -> date | None:
    try:
        return date.fromisoformat(str((preferences or {}).get("start_date") or ""))
    except ValueError:
        return None


_CHANGE_WORDS = re.compile(r"\b(add|swap|move|replace|remove|change|include|skip|drop|make|switch|shift|put|"
                           r"extend|shorten|cut|plan|rearrange|instead)\b", re.I)


def _is_question(message: str, intent: str | None) -> bool:
    """Answer rather than rewrite the plan. The intent label comes from a small model (or the
    fallback provider), so a question with no change verb is treated as a question either way."""
    if intent in ("trip_question", "casual_conversation"):
        return True
    return message.strip().endswith("?") and not _CHANGE_WORDS.search(message)


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

    async def _copilot_context(self, db: AsyncSession, trip, request: SendMessageRequest) -> dict:
        from app.services.budget import budget_target, latest_copilot_state, traveler_rates
        copilot = await latest_copilot_state(db, trip.id)
        if copilot:
            # Amounts typed into the budget planner are the truth the agent plans against.
            copilot["rates"].update(await traveler_rates(db, trip.id))
        focus = (request.payload or {}).get("copilot_day")
        return {"copilot": copilot, "currency": trip.currency, "budget_target": await budget_target(db, trip.id),
                "focus_day": focus if type(focus) is int else None}

    async def _apply_brief_budget(self, db: AsyncSession, trip, request: SendMessageRequest) -> None:
        """A submitted trip brief's budget and currency go to the budget ledger."""
        payload = request.payload or {}
        if payload.get("action") == "SUBMIT_TRIP_ONBOARDING":
            from app.services.budget import apply_agent_budget
            await apply_agent_budget(db, trip, payload.get("budget_amount"), payload.get("currency"))

    async def _persist_copilot(self, db: AsyncSession, trip, result: dict) -> None:
        copilot = result.get("copilot")
        if copilot:
            from app.services.budget import apply_agent_budget
            await apply_agent_budget(db, trip, copilot.get("budget"), copilot["currency"])

    async def _latest_plan_text(self, db: AsyncSession, trip_id: uuid.UUID) -> str | None:
        """The itinerary text the map currently shows, for revising it in place."""
        result = await db.execute(
            select(ConversationMessage)
            .join(ConversationSession, ConversationMessage.session_id == ConversationSession.id)
            .where(ConversationSession.trip_id == trip_id, ConversationMessage.role == MessageRole.ASSISTANT)
            .order_by(ConversationMessage.created_at.desc(), ConversationMessage.id.desc())
        )
        return next((message.content for message in result.scalars()
                     if (message.payload or {}).get("kind") == "ITINERARY_GRAPH" and message.content), None)

    async def _stream_copilot_turn(self, db: AsyncSession, trip, session, request: SendMessageRequest,
                                   identity: Optional[RequestIdentity], context: dict):
        """One build-with-agent turn: live stages, then the map and day panel, then the reply as it's written."""
        import json
        from app.agents.trip_planner.copilot.graph import (
            RESPOND_INSTRUCTION, _fallback_reply, hold_reply, reply_prompt, stream_build_with_agent,
        )
        from app.services.llm.service import llm_service

        def sse(event: dict) -> str:
            return f"data: {json.dumps(event)}\n\n"

        starting = not context["copilot"]
        yield sse({"type": "stage", "label": "Getting to know your trip" if starting else "Thinking about that"})
        state = {
            "user_message": request.content or "",
            "ui_action": request.payload if request.message_type == MessageType.UI_ACTION else None,
            "destination": trip.destination, "duration_days": trip.duration_days, "origin": trip.origin_text,
            "planning_preferences": trip.planning_preferences or {}, "places_to_visit": trip.places_to_visit or [],
            "user_name": identity.user_name if identity else None, **context,
        }
        result: dict = {}
        async for kind, value in stream_build_with_agent(state):
            if kind == "stage":
                yield sse({"type": "stage", "label": value})
            else:
                result = value
        copilot, graph = result["copilot"], result["itinerary_graph"]
        # The map and the day panel reflect the decision before the reply starts.
        yield sse({"type": "graph", "graph": graph, "final": True})
        yield sse({"type": "copilot", "copilot": copilot})

        text = result["assistant_response"]  # set only when replaying a day's held reply
        if text:
            yield sse({"type": "token", "delta": text})
        else:
            try:
                async for token in llm_service.generate_stream(
                    prompt=reply_prompt(result["facts"]), system_instruction=RESPOND_INSTRUCTION, temperature=0.6,
                ):
                    text += token
                    yield sse({"type": "token", "delta": token})
            except Exception as exc:
                logger.warning("Copilot reply stream failed: %s", exc)
            if not text.strip():
                text = _fallback_reply(result["facts"])
                yield sse({"type": "token", "delta": text})
            hold_reply(copilot, text.strip())

        trip.status = TripStatus.PLANNING
        session.status = ConversationSessionStatus.COMPLETED
        session.current_stage = ConversationStage.COMPLETE
        await self._persist_copilot(db, trip, {"copilot": copilot})
        assistant_msg = await self.message_repo.create_message(
            db, session_id=session.id, role=MessageRole.ASSISTANT, message_type=MessageType.TEXT,
            content=text.strip(), payload=self._graph_payload({"itinerary_graph": graph, "copilot": copilot}),
        )
        await db.commit()
        await db.refresh(trip)
        await db.refresh(session)
        yield sse({"type": "done", "trip": TripResponse.model_validate(trip).model_dump(mode="json"),
                   "conversation": ConversationSessionResponse.model_validate(session).model_dump(mode="json"),
                   "assistant_message": ConversationMessageResponse.model_validate(assistant_msg).model_dump(mode="json")})

    @staticmethod
    def _graph_payload(result: dict) -> dict | None:
        if not result.get("itinerary_graph"):
            return None
        payload = {"kind": "ITINERARY_GRAPH", "graph": result["itinerary_graph"]}
        for key in ("copilot", "day_plan"):
            if result.get(key):
                payload[key] = result[key]
        return payload

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
        if ((request.payload or {}).get("action") == "SUBMIT_TRIP_ONBOARDING"
                and trip.status != TripStatus.DRAFT):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Trip details can only be edited before itinerary generation.")

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

        # 5. The graph handles form onboarding and subsequent conversation.
        user_name = identity.user_name if identity else None
        graph_state = {
            "trip_id": str(trip.id),
            "user_id": str(trip.user_id) if trip.user_id else None,
            "guest_id": str(trip.guest_id) if trip.guest_id else None,
            "user_name": user_name,
            "user_message": request.content or "",
            "destination": trip.destination,
            "places_to_visit": trip.places_to_visit or [],
            "planning_preferences": trip.planning_preferences or {},
            "duration_days": trip.duration_days,
            "origin": trip.origin_text,
            "origin_latitude": trip.origin_latitude,
            "origin_longitude": trip.origin_longitude,
            "onboarding_complete": trip.onboarding_status == OnboardingStatus.COMPLETE,
            "planning_started": trip.status != TripStatus.DRAFT,
            "missing_fields": [],
            "assistant_response": "",
            "ui_action": request.payload if request.message_type == MessageType.UI_ACTION else None,
            **await self._copilot_context(db, trip, request),
        }

        graph_result = await trip_planner_graph.ainvoke(graph_state)
        await self._persist_copilot(db, trip, graph_result)
        await self._apply_brief_budget(db, trip, request)

        # Update Trip entity with extracted fields from graph
        if graph_result.get("user_name") and identity and not identity.user_name:
            identity.user_name = graph_result["user_name"]
        if graph_result.get("destination"):
            trip.destination = graph_result["destination"]
        if graph_result.get("places_to_visit") is not None:
            trip.places_to_visit = graph_result["places_to_visit"]
        if graph_result.get("planning_preferences") is not None:
            trip.planning_preferences = graph_result["planning_preferences"]
        if graph_result.get("duration_days"):
            trip.duration_days = graph_result["duration_days"]
        if graph_result.get("origin"):
            trip.origin_text = graph_result["origin"]

        # The graph validates form data before planning.
        has_origin = bool(
            (trip.origin_text and str(trip.origin_text).strip())
            or (trip.origin_latitude is not None and trip.origin_longitude is not None)
        )

        # Evaluate completion status (strictly destination + duration + origin)
        if graph_result.get("onboarding_complete") and has_origin:
            trip.onboarding_status = OnboardingStatus.COMPLETE
            planned = bool(graph_result.get("itinerary_graph"))
            trip.status = TripStatus.PLANNING if planned else TripStatus.DRAFT
            session.status = ConversationSessionStatus.COMPLETED if planned else ConversationSessionStatus.ACTIVE
            session.current_stage = ConversationStage.COMPLETE if planned else ConversationStage.REVIEW

            origin_clause = f" from {trip.origin_text}" if trip.origin_text else ""
            assistant_text = (
                graph_result.get("assistant_response")
                or f"Perfect! We have a {trip.duration_days}-day trip to {trip.destination}{origin_clause}. We're ready to start planning!"
            )
        else:
            trip.onboarding_status = OnboardingStatus.IN_PROGRESS
            session.status = ConversationSessionStatus.ACTIVE
            session.current_stage = ConversationStage.TRIP_BASICS
            assistant_text = graph_result.get("assistant_response") or "Tell me the basics of your journey."

        assistant_payload = graph_result.get("ui_action") or self._graph_payload(graph_result)
        assistant_msg = await self.message_repo.create_message(
            db,
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            message_type=MessageType.TEXT,
            content=assistant_text,
            payload=assistant_payload,
        )

        if graph_result.get("itinerary_graph"):
            from app.services.budget import sync_budget_for_graph
            await sync_budget_for_graph(db, trip.id, graph_result["itinerary_graph"])

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
        if ((request.payload or {}).get("action") == "SUBMIT_TRIP_ONBOARDING"
                and trip.status != TripStatus.DRAFT):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Trip details can only be edited before itinerary generation.")

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

        # Draft trips move through form -> planning choice -> full itinerary.
        # Neither form nor choice makes an LLM call.
        generating_full_draft = (
            request.message_type == MessageType.UI_ACTION
            and isinstance(request.payload, dict)
            and request.payload.get("action") == "GENERATE_FULL_ITINERARY"
        )
        copilot_context = await self._copilot_context(db, trip, request)
        starting_build = ((request.payload or {}).get("action") == "START_BUILD_WITH_AGENT"
                          and trip.onboarding_status == OnboardingStatus.COMPLETE)
        if (copilot_context["copilot"] or starting_build) and not generating_full_draft:
            async for event in self._stream_copilot_turn(db, trip, session, request, identity, copilot_context):
                yield event
            return
        if trip.status == TripStatus.DRAFT and not generating_full_draft:
            form_state = {
                "trip_id": str(trip.id),
                "user_name": identity.user_name if identity else None,
                "user_message": request.content or "",
                "origin": trip.origin_text,
                "destination": trip.destination,
                "places_to_visit": trip.places_to_visit or [],
                "planning_preferences": trip.planning_preferences or {},
                "duration_days": trip.duration_days,
                "onboarding_complete": trip.onboarding_status == OnboardingStatus.COMPLETE,
                "planning_started": False,
                "ui_action": request.payload if request.message_type == MessageType.UI_ACTION else None,
                "origin_latitude": trip.origin_latitude,
                "origin_longitude": trip.origin_longitude,
                **copilot_context,
            }
            result = await trip_planner_graph.ainvoke(form_state)
            await self._persist_copilot(db, trip, result)
            await self._apply_brief_budget(db, trip, request)
            complete = bool(result.get("onboarding_complete"))
            if complete:
                trip.origin_text = result["origin"]
                trip.destination = result["destination"]
                trip.places_to_visit = result["places_to_visit"]
                trip.planning_preferences = result.get("planning_preferences") or {}
                trip.duration_days = result["duration_days"]
                trip.onboarding_status = OnboardingStatus.COMPLETE
                planned = bool(result.get("itinerary_graph"))
                trip.status = TripStatus.PLANNING if planned else TripStatus.DRAFT
                session.status = ConversationSessionStatus.COMPLETED if planned else ConversationSessionStatus.ACTIVE
                session.current_stage = ConversationStage.COMPLETE if planned else ConversationStage.REVIEW
            else:
                session.current_stage = ConversationStage.TRIP_BASICS

            action = result.get("ui_action")
            assistant_payload = action or self._graph_payload(result)
            response = result.get("assistant_response") or "Tell me the basics of your journey."
            assistant_msg = await self.message_repo.create_message(
                db, session_id=session.id, role=MessageRole.ASSISTANT,
                message_type=MessageType.TEXT, content=response, payload=assistant_payload,
            )
            await db.commit()
            await db.refresh(trip)
            await db.refresh(session)
            yield f"data: {json.dumps({'type': 'metadata', 'destination': trip.destination, 'duration_days': trip.duration_days, 'origin': trip.origin_text, 'onboarding_complete': complete, 'missing_fields': result.get('missing_fields', [])})}\n\n"
            if action:
                yield f"data: {json.dumps({'type': 'action', 'action': action['action'], 'payload': action})}\n\n"
            if result.get("itinerary_graph"):
                yield f"data: {json.dumps({'type': 'graph', 'graph': result['itinerary_graph'], 'final': True})}\n\n"
            if result.get("copilot"):
                yield f"data: {json.dumps({'type': 'copilot', 'copilot': result['copilot']})}\n\n"
            for word in response.split(" "):
                yield f"data: {json.dumps({'type': 'token', 'delta': word + ' '})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'trip': TripResponse.model_validate(trip).model_dump(mode='json'), 'conversation': ConversationSessionResponse.model_validate(session).model_dump(mode='json'), 'assistant_message': ConversationMessageResponse.model_validate(assistant_msg).model_dump(mode='json')})}\n\n"
            return

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
            "places_to_visit": trip.places_to_visit or [],
            "planning_preferences": trip.planning_preferences or {},
            "origin": trip.origin_text,
            "origin_latitude": trip.origin_latitude,
            "origin_longitude": trip.origin_longitude,
            "onboarding_complete": trip.onboarding_status == OnboardingStatus.COMPLETE,
            "missing_fields": [],
            "assistant_response": "",
        }

        # Understand user message
        # This button already has validated journey fields. Skip a second
        # intent-parsing call so the draft can enter the real token stream.
        basics_before = (trip.destination, trip.duration_days, trip.origin_text)
        understood_updates = {} if generating_full_draft else await understand_user_message(current_state)
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
        # A follow-up on an existing one-shot plan revises it (or answers) instead of starting over.
        previous_plan = None
        if is_complete and not generating_full_draft and basics_before == (trip.destination, trip.duration_days, trip.origin_text):
            previous_plan = await self._latest_plan_text(db, trip.id)
        answering = bool(previous_plan) and _is_question(request.content or "", understood_updates.get("intent"))

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

            from app.agents.trip_planner.nodes.planning_trip_node import (
                ANSWER_SYSTEM_INSTRUCTION,
                PLAN_GENERATION_SYSTEM_INSTRUCTION,
                REVISION_SYSTEM_INSTRUCTION,
                build_followup_prompt,
                build_plan_generation_prompt,
                execute_planning_subgraph,
            )

            candidates: list = []
            if previous_plan:
                yield f"data: {json.dumps({'type': 'stage', 'label': 'Thinking about that' if answering else 'Updating your itinerary'})}\n\n"
                plan_prompt = build_followup_prompt(
                    previous_plan, request.content or "", trip.destination, trip.duration_days,
                    trip.origin_text, trip.planning_preferences or {},
                )
                system_instruction = ANSWER_SYSTEM_INSTRUCTION if answering else REVISION_SYSTEM_INSTRUCTION
            else:
                # Fresh draft: destination research and candidate curation first.
                yield f"data: {json.dumps({'type': 'stage', 'label': 'Researching possible stops'})}\n\n"
                # Typical weather for the travel months runs alongside the research (no LLM call).
                season_task = asyncio.create_task(trip_season(
                    trip.destination, _start_date(trip.planning_preferences), trip.duration_days))
                planning_result = await execute_planning_subgraph(
                    destination=trip.destination,
                    duration_days=trip.duration_days,
                    origin=trip.origin_text,
                    places_to_visit=trip.places_to_visit or [],
                    planning_preferences=trip.planning_preferences or {},
                )
                planning_result["season"] = await _await_season(season_task)
                candidates = planning_result.get("candidates", [])
                logger.info("🔥 PLANNING DATA READY: candidates=%d", len(candidates))
                yield f"data: {json.dumps({'type': 'stage', 'label': 'Writing your day-by-day draft'})}\n\n"
                plan_prompt = build_plan_generation_prompt(
                    planning_result=planning_result,
                    destination=trip.destination,
                    duration_days=trip.duration_days,
                    origin=trip.origin_text,
                    user_name=current_state.get("user_name"),
                    places_to_visit=trip.places_to_visit or [],
                    planning_preferences=trip.planning_preferences or {},
                )
                system_instruction = PLAN_GENERATION_SYSTEM_INSTRUCTION

            # Stream the reply; itinerary text also redraws the map as it arrives.
            from app.agents.trip_planner.nodes.extract_itinerary_node import build_itinerary_graph
            last_graph_length = 0
            last_graph_shape = None
            try:
                async for token in llm_service.generate_stream(
                    prompt=plan_prompt,
                    system_instruction=system_instruction,
                    temperature=0.5,
                ):
                    accumulated_text += token
                    yield f"data: {json.dumps({'type': 'token', 'delta': token})}\n\n"
                    if not answering and len(accumulated_text) - last_graph_length >= 700:
                        last_graph_length = len(accumulated_text)
                        preview = build_itinerary_graph(
                            markdown=accumulated_text,
                            origin=trip.origin_text,
                            destination=trip.destination or "Trip",
                            duration_days=trip.duration_days or 1,
                            candidates=candidates,
                            requested_places=trip.places_to_visit or [],
                        )
                        shape = (
                            tuple((node["name"], len(node["nearby_places"])) for node in preview["nodes"]),
                            tuple((edge["source"], edge["target"]) for edge in preview["edges"]),
                        )
                        if shape != last_graph_shape:
                            last_graph_shape = shape
                            yield f"data: {json.dumps({'type': 'graph', 'graph': preview, 'final': False})}\n\n"
            except Exception as exc:
                logger.warning("Error during plan stream generation: %s", exc)
                if not accumulated_text:
                    c_names = [c["name"] for c in candidates if isinstance(c, dict) and "name" in c]
                    c_clause = f" featuring {', '.join(c_names)}" if c_names else ""
                    accumulated_text = (
                        "Sorry, I couldn't finish that just now. Could you send it again?" if previous_plan else
                        f"Here is a first-draft outline for your {trip.duration_days}-day trip to {trip.destination}{c_clause}. "
                        f"Let's refine the sequence and activities together!"
                    )
                    yield f"data: {json.dumps({'type': 'token', 'delta': accumulated_text})}\n\n"

            logger.info("🔥 STREAM PLAN COMPLETED (mode=%s)", "answer" if answering else "revise" if previous_plan else "draft")
            if not answering:
                # A final, evidence-backed graph before persisting keeps the map in sync with this reply.
                from app.agents.trip_planner.nodes.extract_itinerary_node import extract_itinerary

                graph_result = await extract_itinerary({
                    **current_state,
                    "assistant_response": accumulated_text,
                    "candidates": candidates,
                    "places_to_visit": trip.places_to_visit or [],
                })
                itinerary_graph = graph_result.get("itinerary_graph")
                if itinerary_graph:
                    ui_action = {"kind": "ITINERARY_GRAPH", "graph": itinerary_graph,
                                 "day_plan": graph_result.get("day_plan")}
                    yield f"data: {json.dumps({'type': 'graph', 'graph': itinerary_graph, 'final': True})}\n\n"
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

        if ui_action and ui_action.get("kind") == "ITINERARY_GRAPH":
            from app.services.budget import sync_budget_for_graph
            await sync_budget_for_graph(db, trip.id, ui_action["graph"])

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

    async def get_or_create_itinerary_graph(
        self, db: AsyncSession, trip_id: uuid.UUID, identity: Optional[RequestIdentity] = None,
    ) -> dict:
        """Extract and save a graph for a trip planned before graph persistence existed."""
        trip = await self.trip_repo.get_by_id(db, trip_id)
        if not trip:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
        trip_service.verify_trip_ownership(trip, identity)
        if trip.onboarding_status != OnboardingStatus.COMPLETE:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Plan the trip first.")
        session = await self.conversation_repo.get_active_session_by_trip_id(db, trip_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip conversation not found.")
        messages = await self.message_repo.get_messages_by_session_id(db, session.id)
        saved = next((message for message in messages if (message.payload or {}).get("kind") == "ITINERARY_GRAPH"), None)
        if saved and (saved.payload["graph"].get("version") or 0) >= 8:
            return saved.payload["graph"]

        form_index = next((index for index, message in enumerate(messages)
                           if (message.payload or {}).get("action") == "SUBMIT_TRIP_ONBOARDING"), -1)
        candidates = [message for message in messages[form_index + 1:]
                      if message.role == MessageRole.ASSISTANT and message.content
                      and (message.payload or {}).get("action") != "SHOW_ONBOARDING_FORM"]
        plan = saved or (candidates[0] if form_index >= 0 and candidates else max(
            candidates, key=lambda message: len(message.content), default=None,
        ))
        if not plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found.")

        if saved and isinstance(saved.payload.get("graph", {}).get("nodes"), list):
            from app.agents.trip_planner.nodes.extract_itinerary_node import build_itinerary_graph

            old_stops = [node for node in saved.payload["graph"]["nodes"]
                         if isinstance(node, dict) and node.get("kind") != "origin"]
            graph = build_itinerary_graph(
                markdown=plan.content, origin=trip.origin_text,
                destination=trip.destination, duration_days=trip.duration_days,
                requested_places=trip.places_to_visit or [], extracted={"stops": old_stops},
            )
        else:
            from app.agents.trip_planner.nodes.extract_itinerary_node import extract_itinerary

            result = await extract_itinerary({
                "assistant_response": plan.content, "origin": trip.origin_text,
                "destination": trip.destination, "duration_days": trip.duration_days,
                "places_to_visit": trip.places_to_visit or [],
            })
            graph = result["itinerary_graph"]
        plan.payload = {"kind": "ITINERARY_GRAPH", "graph": graph}
        from app.services.budget import sync_budget_for_graph
        await sync_budget_for_graph(db, trip.id, graph)
        await db.commit()
        return graph


conversation_service = ConversationService()
