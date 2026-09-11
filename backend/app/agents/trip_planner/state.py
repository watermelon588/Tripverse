from typing import Any, TypedDict


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
    origin_latitude: float | None
    origin_longitude: float | None

    intent: str | None
    onboarding_complete: bool
    missing_fields: list[str]

    assistant_response: str
    ui_action: dict[str, Any] | None
    tool_calls: list[dict[str, Any]] | None

    # Planning output fields populated by planning subgraph
    planning_notes: str | None
    research_queries: list[str] | None
    research_results: list[dict[str, Any]] | None
    candidates: list[dict[str, Any]] | None