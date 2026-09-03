from langgraph.graph import END, START, StateGraph

from app.agents.trip_planner.nodes import (
    ask_question,
    extract_trip_info,
    finish_onboarding,
    validate_state,
)
from app.agents.trip_planner.routing import route_after_validation
from app.agents.trip_planner.state import TripPlanningState


def build_trip_planner_graph():
    """Construct and compile the conversational onboarding StateGraph."""
    graph = StateGraph(TripPlanningState)

    # Register nodes
    graph.add_node("extract_trip_info", extract_trip_info)
    graph.add_node("validate_state", validate_state)
    graph.add_node("ask_question", ask_question)
    graph.add_node("finish_onboarding", finish_onboarding)

    # Define deterministic flow and conditional branches
    graph.add_edge(START, "extract_trip_info")
    graph.add_edge("extract_trip_info", "validate_state")

    graph.add_conditional_edges(
        "validate_state",
        route_after_validation,
        {
            "incomplete": "ask_question",
            "complete": "finish_onboarding",
        },
    )

    graph.add_edge("ask_question", END)
    graph.add_edge("finish_onboarding", END)

    return graph.compile()


trip_planner_graph = build_trip_planner_graph()