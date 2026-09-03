from unittest.mock import AsyncMock
import pytest

from app.agents.trip_planner.nodes.extraction import (
    _extract_json,
    _normalize_duration,
    extract_trip_info,
)
from app.services.llm.service import llm_service


def test_extract_json_direct():
    """Verify direct JSON parsing."""
    raw = '{"destination": "Japan", "duration_days": 10, "origin": null}'
    assert _extract_json(raw) == {
        "destination": "Japan",
        "duration_days": 10,
        "origin": None,
    }


def test_extract_json_with_markdown():
    """Verify extraction when enclosed in markdown code block."""
    raw = '```json\n{"destination": "Paris", "duration_days": 7, "origin": "London"}\n```'
    assert _extract_json(raw) == {
        "destination": "Paris",
        "duration_days": 7,
        "origin": "London",
    }


def test_extract_json_with_surrounding_prose():
    """Verify extraction when surrounded by conversational text."""
    raw = 'Sure! Here is the extracted info:\n{"destination": "Italy", "duration_days": null, "origin": null}\nHope this helps!'
    assert _extract_json(raw) == {
        "destination": "Italy",
        "duration_days": None,
        "origin": None,
    }


def test_extract_json_invalid():
    """Verify invalid JSON returns empty dict."""
    assert _extract_json("Not a json at all") == {}
    assert _extract_json("") == {}
    assert _extract_json(None) == {}


def test_normalize_duration_variations():
    """Verify duration normalization across integers, strings, weeks, and edge cases."""
    assert _normalize_duration(10) == 10
    assert _normalize_duration("10") == 10
    assert _normalize_duration("10 days") == 10
    assert _normalize_duration("2 weeks") == 14
    assert _normalize_duration("1 week") == 7
    assert _normalize_duration(0) is None
    assert _normalize_duration(-5) is None
    assert _normalize_duration(400) is None
    assert _normalize_duration("unknown") is None
    assert _normalize_duration(None) is None


@pytest.mark.asyncio
async def test_extract_trip_info_empty_message():
    """Verify empty user message returns empty dict without LLM call."""
    result = await extract_trip_info({"user_message": ""})
    assert result == {}


@pytest.mark.asyncio
async def test_extract_trip_info_destination_only(monkeypatch):
    """Verify destination extraction when only destination is stated."""
    mock_generate = AsyncMock(
        return_value='{"destination": "Japan", "duration_days": null, "origin": null}'
    )
    monkeypatch.setattr(llm_service, "generate", mock_generate)

    state = {"user_message": "Japan"}
    result = await extract_trip_info(state)

    assert result == {"destination": "Japan"}
    mock_generate.assert_called_once()


@pytest.mark.asyncio
async def test_extract_trip_info_duration_only(monkeypatch):
    """Verify duration extraction when only duration is stated."""
    mock_generate = AsyncMock(
        return_value='{"destination": null, "duration_days": 10, "origin": null}'
    )
    monkeypatch.setattr(llm_service, "generate", mock_generate)

    state = {"user_message": "10 days"}
    result = await extract_trip_info(state)

    assert result == {"duration_days": 10}


@pytest.mark.asyncio
async def test_extract_trip_info_weeks_conversion(monkeypatch):
    """Verify duration given in weeks is converted to days."""
    mock_generate = AsyncMock(
        return_value='{"destination": "Italy", "duration_days": "2 weeks", "origin": null}'
    )
    monkeypatch.setattr(llm_service, "generate", mock_generate)

    state = {"user_message": "Italy for 2 weeks"}
    result = await extract_trip_info(state)

    assert result == {"destination": "Italy", "duration_days": 14}


@pytest.mark.asyncio
async def test_extract_trip_info_multi_field(monkeypatch):
    """Verify multi-field extraction for destination, duration, and origin."""
    mock_generate = AsyncMock(
        return_value='{"destination": "Japan", "duration_days": 10, "origin": "Kolkata"}'
    )
    monkeypatch.setattr(llm_service, "generate", mock_generate)

    state = {"user_message": "I want to visit Japan for 10 days from Kolkata"}
    result = await extract_trip_info(state)

    assert result == {
        "destination": "Japan",
        "duration_days": 10,
        "origin": "Kolkata",
    }


@pytest.mark.asyncio
async def test_extract_trip_info_llm_failure(monkeypatch):
    """Verify that an exception during LLM generation returns empty dict safely."""
    mock_generate = AsyncMock(side_effect=RuntimeError("Provider offline"))
    monkeypatch.setattr(llm_service, "generate", mock_generate)

    state = {"user_message": "France"}
    result = await extract_trip_info(state)

    assert result == {}
