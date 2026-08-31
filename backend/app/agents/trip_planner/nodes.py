from app.agents.trip_planner.state import TripPlanningState


def welcome_node(state: TripPlanningState) -> dict:
    """Greeting node for initializing trip planning session."""
    user_message = state.get("user_message", "")

    if not user_message:
        return {
            "assistant_response": "Hi! I'm your AI travel planner. Where would you like to go?"
        }

    return {"assistant_response": f"Exploring {user_message} for you..."}
