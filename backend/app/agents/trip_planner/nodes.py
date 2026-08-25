from app.agents.trip_planner.state import TripPlanningState


def welcome_node(state: TripPlanningState) -> dict:
    """Greeting node for initializing trip planning session."""
    return {
        "assistant_response": f"Welcome {state['name']}. Where do you want to head out to?"
    }
