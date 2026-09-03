import json
import logging
import re
from typing import Any

from app.agents.trip_planner.state import TripPlanningState
from app.services.llm.service import llm_service

logger = logging.getLogger(__name__)

EXTRACT_TRIP_INFO_SYSTEM_INSTRUCTION = """You are a travel-planning information extraction system.

Your job is to extract trip information from the user's latest message.

Extract ONLY these fields:

- destination: string or null
- duration_days: integer or null
- origin: string or null

Rules:

1. Extract only information explicitly stated or clearly implied by the user's message.
2. Do not invent missing information.
3. If a field is not present, return null.
4. Convert weeks to days.
   Example: "2 weeks" -> 14.
5. duration_days must be an integer.
6. Keep destination and origin as concise place names.
7. Return ONLY valid JSON.
8. Do not include markdown.
9. Do not include explanations.

Example:

User:
"I want to visit Japan for 10 days from Kolkata"

Response:
{
  "destination": "Japan",
  "duration_days": 10,
  "origin": "Kolkata"
}

Example:

User:
"Japan"

Response:
{
  "destination": "Japan",
  "duration_days": null,
  "origin": null
}

Example:

User:
"10 days"

Response:
{
  "destination": null,
  "duration_days": 10,
  "origin": null
}
"""


def _extract_json(text: str) -> dict[str, Any]:
    """Parse JSON from model response, recovering from markdown code blocks or surrounding text."""
    if not text or not isinstance(text, str):
        return {}

    cleaned = text.strip()

    # Try direct parse first
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict):
            return data
    except (json.JSONDecodeError, TypeError):
        pass

    # Try regex extraction of JSON object {...}
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict):
                return data
        except (json.JSONDecodeError, TypeError):
            pass

    return {}


def _normalize_duration(value: Any) -> int | None:
    """Normalize duration representation into an integer number of days between 1 and 365."""
    if value is None:
        return None

    if isinstance(value, (int, float)):
        int_val = int(value)
        return int_val if 1 <= int_val <= 365 else None

    if isinstance(value, str):
        val_str = value.strip().lower()

        # Check for weeks
        week_match = re.search(r"(\d+)\s*week", val_str)
        if week_match:
            days = int(week_match.group(1)) * 7
            return days if 1 <= days <= 365 else None

        # Check for days or raw digit
        day_match = re.search(r"(\d+)", val_str)
        if day_match:
            days = int(day_match.group(1))
            return days if 1 <= days <= 365 else None

    return None


async def extract_trip_info(state: TripPlanningState) -> dict:
    """LangGraph node: Extract destination, duration, and origin from the latest user message."""
    user_message = state.get("user_message", "")
    if not user_message or not str(user_message).strip():
        return {}

    prompt = f'User:\n"{user_message}"\n\nResponse:'

    try:
        raw_response = await llm_service.generate(
            prompt=prompt,
            system_instruction=EXTRACT_TRIP_INFO_SYSTEM_INSTRUCTION,
            temperature=0.0,
        )
    except Exception as e:
        logger.warning(f"Extraction LLM call failed: {str(e)}")
        return {}

    parsed = _extract_json(raw_response)
    if not parsed:
        return {}

    updates: dict[str, Any] = {}

    # Extract destination
    dest = parsed.get("destination")
    if isinstance(dest, str) and dest.strip() and dest.strip().lower() not in ("null", "none"):
        updates["destination"] = dest.strip()

    # Extract duration
    dur = _normalize_duration(parsed.get("duration_days"))
    if dur is not None:
        updates["duration_days"] = dur

    # Extract origin
    origin = parsed.get("origin")
    if isinstance(origin, str) and origin.strip() and origin.strip().lower() not in ("null", "none"):
        updates["origin"] = origin.strip()

    return updates
