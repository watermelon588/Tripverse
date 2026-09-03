from app.agents.trip_planner.routing import route_after_validation


def test_route_after_validation_complete():
    """Verify router returns 'complete' when onboarding_complete is True."""
    state = {"onboarding_complete": True}
    assert route_after_validation(state) == "complete"


def test_route_after_validation_incomplete():
    """Verify router returns 'incomplete' when onboarding_complete is False."""
    state = {"onboarding_complete": False}
    assert route_after_validation(state) == "incomplete"


def test_route_after_validation_empty_state():
    """Verify router returns 'incomplete' when onboarding_complete is missing."""
    state = {}
    assert route_after_validation(state) == "incomplete"
