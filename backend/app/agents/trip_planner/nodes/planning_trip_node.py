import json
import logging
from typing import Any

from app.agents.trip_planner.planning.graph import planning_graph
from app.agents.trip_planner.planning.state import create_initial_planning_state
from app.agents.trip_planner.state import TripPlanningState
from app.services.llm.service import llm_service

logger = logging.getLogger(__name__)


PLAN_GENERATION_SYSTEM_INSTRUCTION = """
You are TripVerse, a knowledgeable and witty conversational AI travel companion.

The traveler has provided enough information to begin planning, and the planning
research phase has now completed.

Your job is to turn the structured planning research into a useful FIRST-DRAFT
trip plan for the traveler.

You are NOT doing new research. Use the provided planning data and research
results as your source material.

Create a practical high-level plan for the requested duration.

Guidelines:
- Use the destination, duration, origin, research findings, and candidates.
- Prefer realistic sequencing and avoid unnecessarily complicated travel.
- Organize the plan by day ranges or logical trip phases.
- Explain briefly why each major stop or area is included.
- Do not invent unsupported facts.
- Do not claim exact prices, availability, schedules, or booking information.
- Do not pretend anything has been booked.
- Treat the plan as a first draft that the traveler can refine.
- Keep it useful and reasonably concise.
- Do not mention LangGraph, nodes, state, tools, subgraphs, APIs, orchestration,
  or internal implementation details.
- Do not repeat the entire research data back to the traveler.

Formatting requirements:
- Return valid Markdown only.
- Use Markdown headings for sections.
- Use Markdown bullet or numbered lists where useful.
- Use GitHub-Flavored Markdown tables when a table improves clarity.
- Do not use raw HTML tags.
- Do not use <br>, <div>, <table>, <p>, or similar HTML tags.
- Do not wrap the entire response in a code block.

Personality:
- confident
- expressive
- slightly bratty/playful
- warm and genuinely helpful
- conversational rather than robotic
- do not force catchphrases or overdo the personality

End with a natural invitation to refine the plan.
"""


def build_plan_generation_prompt(
    planning_result: dict[str, Any],
    destination: str,
    duration_days: int,
    origin: str | None = None,
    user_name: str | None = None,
) -> str:
    """
    Build the canonical prompt for turning destination research into an initial trip plan.
    Shared across non-streaming (planning_trip) and streaming (process_message_stream) paths.
    """
    planning_context = {
        "traveler_name": user_name,
        "destination": destination,
        "duration_days": duration_days,
        "origin": origin,
        "trip_type": planning_result.get("trip_type"),
        "planning_notes": planning_result.get("planning_notes"),
        "research_queries": planning_result.get("research_queries", []),
        "research_results": planning_result.get("research_results", []),
        "candidates": planning_result.get("candidates", []),
    }

    planning_context_json = json.dumps(
        planning_context,
        ensure_ascii=False,
        indent=2,
        default=str,
    )

    # Protect prompt from exceeding context bounds if search pages are large
    max_context_chars = 30000
    if len(planning_context_json) > max_context_chars:
        logger.info(
            "Planning context is large (%d chars); truncating to %d chars.",
            len(planning_context_json),
            max_context_chars,
        )
        planning_context_json = (
            planning_context_json[:max_context_chars]
            + "\n...[planning context truncated for LLM input]..."
        )

    return f"""TRIP INFORMATION AND RESEARCH:

{planning_context_json}

TASK:

Create the first draft of the travel plan for this trip.

The traveler has not asked for an exact booking plan. Give them a practical,
high-level itinerary they can react to and modify.

Use the researched candidates and findings instead of generic filler.

Formatting:
- Return valid Markdown only.
- Do not use raw HTML tags such as <br>, <div>, <table>, <p>, or <span>.
- Use GitHub-Flavored Markdown tables when presenting structured day-by-day highlights.
- Do not wrap the entire response in a code block.

Traveler name: {user_name or "not provided"}
Destination: {destination}
Duration: {duration_days} days
Origin: {origin or "not specified"}
"""


async def execute_planning_subgraph(
    destination: str,
    duration_days: int,
    origin: str | None = None,
) -> dict[str, Any]:
    """
    Canonical helper to execute the destination research and candidate planning subgraph.
    Shared between main graph adapter (planning_trip) and streaming conversation handler.
    """
    planning_input = create_initial_planning_state(
        destination=destination,
        duration_days=duration_days,
        origin=origin,
    )

    logger.info("🔥 INVOKING planning_graph")
    try:
        planning_result = await planning_graph.ainvoke(planning_input)
    except Exception:
        logger.exception("🔥 PLANNING GRAPH FAILED")
        raise

    logger.info("🔥 planning_graph completed")
    logger.info(
        "Planning subgraph summary: queries=%d results=%d candidates=%d",
        len(planning_result.get("research_queries", [])),
        len(planning_result.get("research_results", [])),
        len(planning_result.get("candidates", [])),
    )
    logger.info("Planning candidates: %s", planning_result.get("candidates", []))

    return planning_result


async def planning_trip(state: TripPlanningState) -> dict[str, Any]:
    """
    Main-graph adapter/orchestrator for the planning phase (non-streaming).

    Flow:
        TripPlanningState
            ↓
        execute_planning_subgraph (PlanningState → research + candidates)
            ↓
        build_plan_generation_prompt
            ↓
        LLM generates first-draft plan
            ↓
        return plan + planning data to parent state
    """
    logger.info("🔥 ENTERED planning_trip")

    destination = state["destination"]
    duration_days = state["duration_days"]
    origin = state.get("origin")
    user_name = state.get("user_name")

    if not destination or duration_days is None:
        raise ValueError(
            "Cannot execute planning_trip without required destination and duration_days."
        )

    logger.info(
        "Planning input: destination=%s duration=%s origin=%s",
        destination,
        duration_days,
        origin,
    )

    # 1. Execute shared planning subgraph
    planning_result = await execute_planning_subgraph(
        destination=destination,
        duration_days=duration_days,
        origin=origin,
    )

    # 2. Build canonical plan prompt
    plan_generation_prompt = build_plan_generation_prompt(
        planning_result=planning_result,
        destination=destination,
        duration_days=duration_days,
        origin=origin,
        user_name=user_name,
    )

    # 3. Generate initial plan
    logger.info("🔥 GENERATING INITIAL PLAN FROM RESEARCH")
    try:
        assistant_response = await llm_service.generate(
            prompt=plan_generation_prompt,
            system_instruction=PLAN_GENERATION_SYSTEM_INSTRUCTION,
            temperature=0.5,
        )
    except Exception:
        logger.exception("🔥 INITIAL PLAN GENERATION FAILED")
        raise

    if not assistant_response or not str(assistant_response).strip():
        raise RuntimeError("Initial plan generation returned an empty response.")

    assistant_response = str(assistant_response).strip()
    logger.info("🔥 INITIAL PLAN GENERATED")

    # 4. Return plan + planning data to parent state
    return {
        "assistant_response": assistant_response,
        "planning_notes": planning_result.get("planning_notes"),
        "research_queries": planning_result.get("research_queries", []),
        "research_results": planning_result.get("research_results", []),
        "candidates": planning_result.get("candidates", []),
    }
