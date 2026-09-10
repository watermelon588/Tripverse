from langgraph.graph import END, START, StateGraph

from app.agents.trip_planner.nodes.planning_trip_node import planning_trip
from app.agents.trip_planner.nodes.respond_to_user_node import respond_to_user
from app.agents.trip_planner.nodes.understand_user_msg_node import (
    understand_user_message,
)
from app.agents.trip_planner.nodes.validate_state_node import validate_state
from app.agents.trip_planner.routing import route_after_validation
from app.agents.trip_planner.state import TripPlanningState

def build_trip_planner_graph():
    """
    Build and compile the TripVerse conversational onboarding graph.

    Graph flow:

        START
          ↓
        understand_user_message
          ↓
        validate_state
          ↓
        conditional routing
          ├── incomplete → respond_to_user → END
          └── complete   → planning_trip
    """

    graph = StateGraph(TripPlanningState)

    # --------------------------------------------------
    # Register nodes
    # --------------------------------------------------

    graph.add_node(
        "understand_user_message",
        understand_user_message,
    )

    graph.add_node(
        "validate_state",
        validate_state,
    )

    graph.add_node(
        "respond_to_user",
        respond_to_user,
    )

    graph.add_node(
        "planning_trip",
        planning_trip,
    )

    # --------------------------------------------------
    # Normal edges
    # --------------------------------------------------

    graph.add_edge(
        START,
        "understand_user_message",
    )

    graph.add_edge(
        "understand_user_message",
        "validate_state",
    )

    # --------------------------------------------------
    # Conditional edge
    # --------------------------------------------------

    graph.add_conditional_edges(
        "validate_state",
        route_after_validation,
        {
            "incomplete": "respond_to_user",
            "complete": "planning_trip",
        },
    )

    # --------------------------------------------------
    # Terminal edges
    # --------------------------------------------------

    graph.add_edge(
        "respond_to_user",
        END,
    )

    graph.add_edge(
        "planning_trip",
        END,
    )

    # --------------------------------------------------
    # Compile
    # --------------------------------------------------

    return graph.compile()


trip_planner_graph = build_trip_planner_graph()