from unittest.mock import AsyncMock
import pytest

from app.agents.trip_planner.graph import trip_planner_graph
from app.services.llm.service import llm_service


@pytest.mark.asyncio
async def test_graph_destination_only(monkeypatch):
    """Verify graph execution with single destination message routes to ask duration."""
    mock_generate = AsyncMock(
        return_value='{"destination": "Japan", "duration_days": null, "origin": null}'
    )
    monkeypatch.setattr(llm_service, "generate", mock_generate)

    initial_state = {
        "trip_id": "test-trip-1",
        "user_id": None,
        "guest_id": None,
        "user_message": "Japan",
        "destination": None,
        "duration_days": None,
        "origin": None,
        "onboarding_complete": False,
        "missing_fields": [],
        "assistant_response": "",
    }

    result = await trip_planner_graph.ainvoke(initial_state)

    assert result["destination"] == "Japan"
    assert result["duration_days"] is None
    assert result["onboarding_complete"] is False
    assert result["missing_fields"] == ["duration_days"]
    assert (
        result["assistant_response"]
        == "Nice! How many days are you thinking for Japan?"
    )


@pytest.mark.asyncio
async def test_graph_full_trip_with_origin(monkeypatch):
    """Verify complete trip message finishes onboarding with origin."""
    mock_generate = AsyncMock(
        return_value='{"destination": "Japan", "duration_days": 10, "origin": "Kolkata"}'
    )
    monkeypatch.setattr(llm_service, "generate", mock_generate)

    initial_state = {
        "trip_id": "test-trip-2",
        "user_id": None,
        "guest_id": None,
        "user_message": "I want to visit Japan for 10 days from Kolkata",
        "destination": None,
        "duration_days": None,
        "origin": None,
        "onboarding_complete": False,
        "missing_fields": [],
        "assistant_response": "",
    }

    result = await trip_planner_graph.ainvoke(initial_state)

    assert result["destination"] == "Japan"
    assert result["duration_days"] == 10
    assert result["origin"] == "Kolkata"
    assert result["onboarding_complete"] is True
    assert result["missing_fields"] == []
    assert (
        result["assistant_response"]
        == "Perfect! We have a 10-day trip to Japan from Kolkata. We're ready to start planning!"
    )


@pytest.mark.asyncio
async def test_graph_full_trip_without_origin(monkeypatch):
    """Verify complete trip message finishes onboarding without origin."""
    mock_generate = AsyncMock(
        return_value='{"destination": "Iceland", "duration_days": 7, "origin": null}'
    )
    monkeypatch.setattr(llm_service, "generate", mock_generate)

    initial_state = {
        "trip_id": "test-trip-3",
        "user_id": None,
        "guest_id": None,
        "user_message": "Iceland for 7 days",
        "destination": None,
        "duration_days": None,
        "origin": None,
        "onboarding_complete": False,
        "missing_fields": [],
        "assistant_response": "",
    }

    result = await trip_planner_graph.ainvoke(initial_state)

    assert result["destination"] == "Iceland"
    assert result["duration_days"] == 7
    assert result["origin"] is None
    assert result["onboarding_complete"] is True
    assert result["missing_fields"] == []
    assert (
        result["assistant_response"]
        == "Perfect! We have a 7-day trip to Iceland. We're ready to start planning!"
    )


@pytest.mark.asyncio
async def test_graph_empty_message():
    """Verify empty message routes immediately to asking for destination without LLM call."""
    initial_state = {
        "trip_id": "test-trip-4",
        "user_id": None,
        "guest_id": None,
        "user_message": "",
        "destination": None,
        "duration_days": None,
        "origin": None,
        "onboarding_complete": False,
        "missing_fields": [],
        "assistant_response": "",
    }

    result = await trip_planner_graph.ainvoke(initial_state)

    assert result["destination"] is None
    assert result["duration_days"] is None
    assert result["onboarding_complete"] is False
    assert result["missing_fields"] == ["destination", "duration_days"]
    assert result["assistant_response"] == "Where do you want to travel?"
