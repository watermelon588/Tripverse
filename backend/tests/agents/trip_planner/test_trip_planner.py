import asyncio
from unittest.mock import AsyncMock, patch
import pytest

from app.agents.trip_planner.graph import trip_planner_graph
from app.agents.trip_planner.nodes.validate_state_node import validate_state
from app.services.llm.base import LLMResult


# ==============================================================================
# Automated Pytest Suite
# ==============================================================================

def test_validate_state_missing_all():
    """Verify validation node identifies missing destination, duration, and origin."""
    state = {
        "trip_id": "test-1",
        "destination": None,
        "duration_days": None,
        "origin": None,
    }
    result = validate_state(state)
    assert result["onboarding_complete"] is False
    assert "destination" in result["missing_fields"]
    assert "duration_days" in result["missing_fields"]
    assert "origin" in result["missing_fields"]


def test_validate_state_partial_destination():
    """Verify validation node flags duration and origin when only destination is provided."""
    state = {
        "trip_id": "test-2",
        "destination": "Paris",
        "duration_days": None,
        "origin": None,
    }
    result = validate_state(state)
    assert result["onboarding_complete"] is False
    assert set(result["missing_fields"]) == {"duration_days", "origin"}


def test_validate_state_missing_origin():
    """Verify validation node flags origin as missing when destination and duration exist."""
    state = {
        "trip_id": "test-3",
        "destination": "Japan",
        "duration_days": 10,
        "origin": None,
    }
    result = validate_state(state)
    assert result["onboarding_complete"] is False
    assert result["missing_fields"] == ["origin"]


def test_validate_state_invalid_duration():
    """Verify validation node treats non-positive duration as missing."""
    state = {
        "trip_id": "test-invalid-dur",
        "destination": "Tokyo",
        "duration_days": 0,
        "origin": "Delhi",
    }
    result = validate_state(state)
    assert result["onboarding_complete"] is False
    assert "duration_days" in result["missing_fields"]


def test_validate_state_complete():
    """Verify validation node succeeds only when destination, duration, and origin exist."""
    state = {
        "trip_id": "test-4",
        "destination": "Tokyo",
        "duration_days": 5,
        "origin": "Delhi",
    }
    result = validate_state(state)
    assert result["onboarding_complete"] is True
    assert result["missing_fields"] == []


def test_validate_state_complete_with_coordinates():
    """Verify validation node accepts geolocation coordinates as valid origin."""
    state = {
        "trip_id": "test-5",
        "destination": "Kyoto",
        "duration_days": 7,
        "origin": None,
        "origin_latitude": 35.6762,
        "origin_longitude": 139.6503,
    }
    result = validate_state(state)
    assert result["onboarding_complete"] is True
    assert result["missing_fields"] == []


@pytest.mark.asyncio
async def test_trip_planner_graph_incomplete_flow():
    """Verify graph routes to respond_to_user when required fields are missing."""
    initial_state = {
        "trip_id": "test-incomplete",
        "user_id": None,
        "guest_id": "guest-1",
        "user_name": None,
        "user_message": "Hi there!",
        "destination": None,
        "duration_days": None,
        "origin": None,
        "onboarding_complete": False,
        "missing_fields": [],
        "assistant_response": "",
    }

    mock_understand_json = '{"intent": "casual_conversation", "destination": null, "duration_days": null, "origin": null}'
    mock_respond_text = "Where would you like to travel?"

    with (
        patch("app.services.llm.service.llm_service.generate", return_value=mock_understand_json),
        patch("app.services.llm.service.llm_service.generate_with_tools", return_value=LLMResult(text=mock_respond_text)),
    ):
        result = await trip_planner_graph.ainvoke(initial_state)

    assert result["onboarding_complete"] is False
    assert "destination" in result["missing_fields"]
    assert "duration_days" in result["missing_fields"]
    assert "origin" in result["missing_fields"]
    assert result["assistant_response"] == mock_respond_text


@pytest.mark.asyncio
async def test_trip_planner_graph_complete_flow():
    """Verify graph routes to planning_trip and generates initial plan when required fields are provided."""
    initial_state = {
        "trip_id": "test-complete",
        "user_id": None,
        "guest_id": "guest-1",
        "user_name": None,
        "user_message": "I want to visit Tokyo for 5 days from New York",
        "destination": None,
        "duration_days": None,
        "origin": None,
        "onboarding_complete": False,
        "missing_fields": [],
        "assistant_response": "",
    }

    mock_understand_json = '{"intent": "trip_information", "destination": "Tokyo", "duration_days": 5, "origin": "New York"}'
    mock_understand_trip_json = '{"trip_type": "single_city", "planning_notes": "5-day trip to Tokyo."}'
    mock_research_json = '{"needs_search": false, "search_queries": [], "candidates": [{"name": "Tokyo", "type": "city", "reason": "Capital"}]}'
    mock_plan_text = "Here is your 5-day plan for Tokyo from New York! Days 1-5 exploring Tokyo."

    with patch("app.services.llm.service.llm_service.generate", side_effect=[mock_understand_json, mock_understand_trip_json, mock_research_json, mock_plan_text]):
        result = await trip_planner_graph.ainvoke(initial_state)

    assert result["onboarding_complete"] is True
    assert result["destination"] == "Tokyo"
    assert result["duration_days"] == 5
    assert result["origin"] == "New York"
    assert result["missing_fields"] == []
    assert result["assistant_response"] == mock_plan_text
    assert len(result["candidates"]) == 1
    assert result["candidates"][0]["name"] == "Tokyo"
    assert result["planning_notes"] == "5-day trip to Tokyo."


@pytest.mark.asyncio
async def test_trip_planner_multi_turn_accumulation():
    """Verify graph accumulates state over multi-turn conversation (destination -> duration -> origin) and generates plan."""
    state = {
        "trip_id": "test-multi-turn",
        "user_id": None,
        "guest_id": "guest-1",
        "user_name": None,
        "user_message": "I want to go to Rome",
        "destination": None,
        "duration_days": None,
        "origin": None,
        "onboarding_complete": False,
        "missing_fields": [],
        "assistant_response": "",
    }

    # Turn 1: Destination provided
    mock_turn1_json = '{"intent": "trip_information", "destination": "Rome", "duration_days": null, "origin": null}'
    mock_turn1_resp = "How many days are you planning to stay in Rome?"

    with (
        patch("app.services.llm.service.llm_service.generate", return_value=mock_turn1_json),
        patch("app.services.llm.service.llm_service.generate_with_tools", return_value=LLMResult(text=mock_turn1_resp)),
    ):
        result1 = await trip_planner_graph.ainvoke(state)

    state.update(result1)
    assert state["destination"] == "Rome"
    assert state["duration_days"] is None
    assert state["origin"] is None
    assert state["onboarding_complete"] is False

    # Turn 2: Duration provided
    state["user_message"] = "Around 4 days"
    mock_turn2_json = '{"intent": "trip_information", "destination": null, "duration_days": 4, "origin": null}'
    mock_turn2_resp = "Where will you be travelling from?"

    with (
        patch("app.services.llm.service.llm_service.generate", return_value=mock_turn2_json),
        patch("app.services.llm.service.llm_service.generate_with_tools", return_value=LLMResult(text=mock_turn2_resp)),
    ):
        result2 = await trip_planner_graph.ainvoke(state)

    state.update(result2)
    assert state["destination"] == "Rome"
    assert state["duration_days"] == 4
    assert state["origin"] is None
    assert state["onboarding_complete"] is False

    # Turn 3: Origin provided -> invokes planning subgraph and generates initial plan
    state["user_message"] = "From London"
    mock_turn3_json = '{"intent": "trip_information", "destination": null, "duration_days": null, "origin": "London"}'
    mock_understand_trip_json = '{"trip_type": "single_city", "planning_notes": "4 days in Rome."}'
    mock_research_json = '{"needs_search": false, "search_queries": [], "candidates": [{"name": "Rome", "type": "city", "reason": "Historic capital"}]}'
    mock_turn3_plan = "Great! Here is your 4-day plan for Rome starting from London."

    with patch("app.services.llm.service.llm_service.generate", side_effect=[mock_turn3_json, mock_understand_trip_json, mock_research_json, mock_turn3_plan]):
        result3 = await trip_planner_graph.ainvoke(state)

    state.update(result3)
    assert state["destination"] == "Rome"
    assert state["duration_days"] == 4
    assert state["origin"] == "London"
    assert state["onboarding_complete"] is True
    assert state["assistant_response"] == mock_turn3_plan
    assert len(state["candidates"]) == 1
    assert state["candidates"][0]["name"] == "Rome"
    assert state["planning_notes"] == "4 days in Rome."


# ==============================================================================
# Interactive Terminal CLI Loop (for manual testing via `python -m ...`)
# ==============================================================================

async def main():
    print("\n=== TripVerse Trip Planner Test ===")
    print("Type 'exit' to quit.\n")

    trip_state = {
        "trip_id": "terminal-test",
        "user_id": None,
        "guest_id": "terminal-test-guest",
        "user_name": None,
        "destination": None,
        "duration_days": None,
        "origin": None,
        "onboarding_complete": False,
        "missing_fields": [],
        "assistant_response": "",
    }

    while True:
        try:
            user_message = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if user_message.lower() == "exit":
            break

        if not user_message:
            continue

        # Each message starts a new graph execution,
        # while the trip state is carried forward.
        trip_state["user_message"] = user_message

        result = await trip_planner_graph.ainvoke(trip_state)

        # Carry graph state forward to the next message.
        trip_state.update(result)

        print(f"TripVerse: {result.get('assistant_response', '')}\n")


if __name__ == "__main__":
    asyncio.run(main())