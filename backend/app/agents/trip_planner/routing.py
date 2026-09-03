from app.agents.trip_planner.state import TripPlanningState


def route_after_validation(state: TripPlanningState) -> str:
    """Determine the next step in onboarding based on state validation."""
    if state.get("onboarding_complete"):
        return "complete"

    return "incomplete"