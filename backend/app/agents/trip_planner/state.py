from typing import TypedDict


class TripPlanningState(TypedDict, total=False):
    """LangGraph state schema for conversational trip planning and onboarding."""

    trip_id: str

    user_id: str | None
    guest_id: str | None
    user_name: str | None

    user_message: str

    destination: str | None
    duration_days: int | None
    origin: str | None

    onboarding_complete: bool
    missing_fields: list[str]

    assistant_response: str