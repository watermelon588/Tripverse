import logging

from app.agents.trip_planner.state import TripPlanningState
from app.services.llm.service import llm_service

logger = logging.getLogger(__name__)


PLANNING_TRIP_SYSTEM_INSTRUCTION = """
You are the trip planning layer of TripVerse.

The user has provided the minimum information required to begin planning:
- destination
- trip duration

Your job for now is to acknowledge that the trip is ready for planning.

Do NOT create a detailed itinerary yet.
Do NOT search for places.
Do NOT calculate a budget.
Do NOT call tools.

Return a short, natural response indicating that you have enough information
to start planning the trip.
"""


async def planning_trip(state: TripPlanningState) -> dict:
    """
    Entry point for the trip-planning phase.

    This is intentionally kept small for now. The actual planning workflow
    will be expanded later into specialized planning steps/subgraphs.
    """

    user_name_clause = f"Traveler Name: {state.get('user_name')}\n" if state.get("user_name") else ""

    prompt = f"""
TRIP INFORMATION:

{user_name_clause}Destination: {state.get("destination")}
Duration: {state.get("duration_days")} days
Origin: {state.get("origin")}

Acknowledge that enough information has been provided to begin planning.
Address the traveler warmly by name if known.
Keep the response short.
"""

    try:
        response = await llm_service.generate(
            prompt=prompt,
            system_instruction=PLANNING_TRIP_SYSTEM_INSTRUCTION,
            temperature=0.7,
        )
    except Exception as exc:
        logger.warning("Planning-trip LLM call failed: %s", exc)

        destination = state.get("destination")
        duration = state.get("duration_days")
        name = f", {state.get('user_name')}" if state.get("user_name") else ""

        response = (
            f"Perfect{name}! I have your trip to {destination} for "
            f"{duration} days. Let's start planning it."
        )

    return {
        "assistant_response": response.strip(),
    }