from langgraph.graph import StateGraph, START, END
from app.agents.trip_planner.state import TripPlanningState
from app.agents.trip_planner.nodes import welcome_node

builder = StateGraph(TripPlanningState)
builder.add_node("welcome_node", welcome_node)

builder.add_edge(START, "welcome_node")
builder.add_edge("welcome_node", END)

trip_planner_graph = builder.compile()


# if __name__ == "__main__":

#     result = graph.invoke({
#         "name": "Rohit"
#     })

#     print(result)