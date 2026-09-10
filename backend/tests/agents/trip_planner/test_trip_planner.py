import asyncio
from unittest.mock import AsyncMock, patch
import pytest

from app.agents.trip_planner.graph import trip_planner_graph
from app.agents.trip_planner.nodes.validate_state_node import validate_state


# ==============================================================================
# Automated Pytest Suite
# ==============================================================================

def test_validate_state_missing_all():
    """Verify validation node identifies missing destination and duration."""
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


def test_validate_state_partial_destination():
    """Verify validation node flags duration when only destination is provided."""
    state = {
        "trip_id": "test-2",
        "destination": "Paris",
        "duration_days": None,
        "origin": None,
    }
    result = validate_state(state)
    assert result["onboarding_complete"] is False
    assert result["missing_fields"] == ["duration_days"]


def test_validate_state_invalid_duration():
    """Verify non-positive duration is flagged as missing."""
    state = {
        "trip_id": "test-3",
        "destination": "Paris",
        "duration_days": 0,
        "origin": None,
    }
    result = validate_state(state)
    assert result["onboarding_complete"] is False
    assert "duration_days" in result["missing_fields"]


def test_validate_state_complete():
    """Verify validation node marks state complete when required fields exist."""
    state = {
        "trip_id": "test-4",
        "destination": "Kyoto",
        "duration_days": 7,
        "origin": "Tokyo",
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

    with patch("app.services.llm.service.llm_service.generate", side_effect=[mock_understand_json, mock_respond_text]):
        result = await trip_planner_graph.ainvoke(initial_state)

    assert result["onboarding_complete"] is False
    assert "destination" in result["missing_fields"]
    assert "duration_days" in result["missing_fields"]
    assert result["assistant_response"] == mock_respond_text


@pytest.mark.asyncio
async def test_trip_planner_graph_complete_flow():
    """Verify graph routes to planning_trip when required fields are provided."""
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
    mock_planning_text = "Perfect! I have your trip to Tokyo for 5 days. Let's start planning."

    with patch("app.services.llm.service.llm_service.generate", side_effect=[mock_understand_json, mock_planning_text]):
        result = await trip_planner_graph.ainvoke(initial_state)

    assert result["onboarding_complete"] is True
    assert result["destination"] == "Tokyo"
    assert result["duration_days"] == 5
    assert result["origin"] == "New York"
    assert result["missing_fields"] == []
    assert result["assistant_response"] == mock_planning_text


@pytest.mark.asyncio
async def test_trip_planner_multi_turn_accumulation():
    """Verify graph accumulates state over multi-turn conversation."""
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

    with patch("app.services.llm.service.llm_service.generate", side_effect=[mock_turn1_json, mock_turn1_resp]):
        result1 = await trip_planner_graph.ainvoke(state)

    state.update(result1)
    assert state["destination"] == "Rome"
    assert state["duration_days"] is None
    assert state["onboarding_complete"] is False

    # Turn 2: Duration provided
    state["user_message"] = "Around 4 days"
    mock_turn2_json = '{"intent": "trip_information", "destination": null, "duration_days": 4, "origin": null}'
    mock_turn2_resp = "Great! 4 days in Rome sounds wonderful. Let's begin planning."

    with patch("app.services.llm.service.llm_service.generate", side_effect=[mock_turn2_json, mock_turn2_resp]):
        result2 = await trip_planner_graph.ainvoke(state)

    state.update(result2)
    assert state["destination"] == "Rome"
    assert state["duration_days"] == 4
    assert state["onboarding_complete"] is True


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