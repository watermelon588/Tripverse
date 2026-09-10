from app.agents.trip_planner.state import TripPlanningState


def validate_state(state: TripPlanningState) -> dict:
    """
    Validate the current trip planning state.

    Required onboarding fields:
    - destination
    - duration_days

    Optional fields:
    - origin

    This node is deterministic and does not use an LLM.

    It only evaluates the current state and returns:
    - missing_fields
    - onboarding_complete
    """

    missing_fields: list[str] = []

    destination = state.get("destination")
    duration_days = state.get("duration_days")

    # Destination is required.
    if not destination or not str(destination).strip():
        missing_fields.append("destination")

    # Duration is required.
    if duration_days is None or duration_days <= 0:
        missing_fields.append("duration_days")

    return {
        "missing_fields": missing_fields,
        "onboarding_complete": len(missing_fields) == 0,
    }