from app.agents.trip_planner.nodes.onboarding import (
    ask_question,
    finish_onboarding,
    validate_state,
)


def test_validate_state_empty():
    """Verify that an empty state reports destination and duration_days as missing."""
    state = {}
    result = validate_state(state)
    assert result["onboarding_complete"] is False
    assert result["missing_fields"] == ["destination", "duration_days"]


def test_validate_state_destination_only():
    """Verify that having destination only leaves duration_days missing."""
    state = {"destination": "Japan"}
    result = validate_state(state)
    assert result["onboarding_complete"] is False
    assert result["missing_fields"] == ["duration_days"]


def test_validate_state_duration_only():
    """Verify that having duration only leaves destination missing."""
    state = {"duration_days": 10}
    result = validate_state(state)
    assert result["onboarding_complete"] is False
    assert result["missing_fields"] == ["destination"]


def test_validate_state_destination_and_duration():
    """Verify that having both destination and duration completes onboarding validation."""
    state = {"destination": "Japan", "duration_days": 10}
    result = validate_state(state)
    assert result["onboarding_complete"] is True
    assert result["missing_fields"] == []


def test_validate_state_origin_alone():
    """Verify that origin alone does not fulfill required onboarding fields."""
    state = {"origin": "Kolkata"}
    result = validate_state(state)
    assert result["onboarding_complete"] is False
    assert "destination" in result["missing_fields"]
    assert "duration_days" in result["missing_fields"]


def test_validate_state_all_fields():
    """Verify that having destination, duration, and origin is complete."""
    state = {"destination": "Japan", "duration_days": 10, "origin": "Kolkata"}
    result = validate_state(state)
    assert result["onboarding_complete"] is True
    assert result["missing_fields"] == []


def test_ask_question_missing_destination():
    """Verify question when destination is missing."""
    state = {"destination": None, "duration_days": None}
    result = ask_question(state)
    assert result["assistant_response"] == "Where do you want to travel?"


def test_ask_question_missing_duration():
    """Verify question when destination is present but duration is missing."""
    state = {"destination": "Japan", "duration_days": None}
    result = ask_question(state)
    assert (
        result["assistant_response"]
        == "Nice! How many days are you thinking for Japan?"
    )


def test_finish_onboarding_with_origin():
    """Verify completion message when origin is provided."""
    state = {"destination": "Japan", "duration_days": 10, "origin": "Kolkata"}
    result = finish_onboarding(state)
    assert (
        result["assistant_response"]
        == "Perfect! We have a 10-day trip to Japan from Kolkata. We're ready to start planning!"
    )


def test_finish_onboarding_without_origin():
    """Verify completion message when origin is not provided."""
    state = {"destination": "Japan", "duration_days": 10, "origin": None}
    result = finish_onboarding(state)
    assert (
        result["assistant_response"]
        == "Perfect! We have a 10-day trip to Japan. We're ready to start planning!"
    )
