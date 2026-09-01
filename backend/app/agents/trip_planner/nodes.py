from app.agents.trip_planner.state import TripPlanningState
from app.services.llm.service import llm_service


async def welcome_node(state: TripPlanningState) -> dict:
    """
    Greeting node for initializing trip planning session with AI-generated welcome.
    Delegates generation to LLMService, keeping LangGraph decoupled from provider details.
    """
    user_name = state.get("user_name")
    user_message = state.get("user_message", "")

    response = await llm_service.generate_welcome_greeting(
        user_name=user_name,
        user_message=user_message,
    )

    return {"assistant_response": response}
