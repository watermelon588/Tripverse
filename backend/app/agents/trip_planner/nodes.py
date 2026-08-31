from app.agents.trip_planner.state import TripPlanningState


def welcome_node(state: TripPlanningState) -> dict:
    """
    Greeting node for initializing trip planning session with personalized identity context.
    Generates tailored welcome messages depending on authenticated user vs guest visitor.
    """
    user_id = state.get("user_id")
    guest_id = state.get("guest_id")
    user_message = state.get("user_message", "")

    if user_id:
        greeting = "Welcome back, Voyager! I'm your AI travel planner connected to your cloud journeys."
    elif guest_id:
        greeting = "Welcome to TripVerse! I'm your AI travel planner for this guest session."
    else:
        greeting = "Welcome to TripVerse! I'm your AI travel planner."

    if user_message:
        return {"assistant_response": f"{greeting} Let's explore {user_message}."}

    return {"assistant_response": f"{greeting} Where would you like to explore?"}
