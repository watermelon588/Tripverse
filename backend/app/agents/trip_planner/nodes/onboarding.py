from app.agents.trip_planner.state import TripPlanningState


def validate_state(state: TripPlanningState) -> dict:
    """Validate whether required onboarding fields are present.

    Required fields: destination, duration_days.
    Origin is optional.
    """
    missing_fields: list[str] = []

    if not state.get("destination"):
        missing_fields.append("destination")

    if not state.get("duration_days"):
        missing_fields.append("duration_days")

    return {
        "missing_fields": missing_fields,
        "onboarding_complete": len(missing_fields) == 0,
    }


def ask_question(state: TripPlanningState) -> dict:
    """Generate the next onboarding question deterministically based on missing fields."""
    destination = state.get("destination")
    duration_days = state.get("duration_days")

    if not destination:
        return {"assistant_response": "Where do you want to travel?"}

    if not duration_days:
        return {
            "assistant_response": f"Nice! How many days are you thinking for {destination}?"
        }

    return {"assistant_response": "Where do you want to travel?"}


def finish_onboarding(state: TripPlanningState) -> dict:
    """Generate the completion message when all required onboarding fields are provided."""
    destination = state.get("destination")
    duration_days = state.get("duration_days")
    origin = state.get("origin")

    if origin:
        message = (
            f"Perfect! We have a {duration_days}-day trip to {destination} from {origin}. "
            f"We're ready to start planning!"
        )
    else:
        message = (
            f"Perfect! We have a {duration_days}-day trip to {destination}. "
            f"We're ready to start planning!"
        )

    return {"assistant_response": message}
