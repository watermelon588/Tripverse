from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.agents.trip_planner.graph import trip_planner_graph
from app.agents.trip_planner.nodes import welcome_node
from app.agents.trip_planner.state import TripPlanningState
from app.services.llm.base import LLMProvider
from app.services.llm.providers.gemini import GeminiProvider
from app.services.llm.service import LLMService


class MockLLMProvider(LLMProvider):
    """Mock LLM Provider for unit testing."""

    def __init__(self, response_text: str = "Mocked Welcome!", should_fail: bool = False):
        self.response_text = response_text
        self.should_fail = should_fail
        self.last_prompt = None
        self.last_system_instruction = None

    async def generate(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.7,
        max_output_tokens: int | None = None,
        **kwargs,
    ) -> str:
        self.last_prompt = prompt
        self.last_system_instruction = system_instruction
        if self.should_fail:
            raise RuntimeError("Simulated Gemini API Failure")
        return self.response_text


@pytest.mark.asyncio
async def test_llm_service_success_authenticated():
    """Verify LLMService builds prompt with user_name and returns provider response."""
    mock_provider = MockLLMProvider(response_text="Welcome back Rohit! Where to?")
    service = LLMService(provider=mock_provider)

    greeting = await service.generate_welcome_greeting(user_name="Rohit")
    assert greeting == "Welcome back Rohit! Where to?"
    assert "Traveler Name: Rohit" in mock_provider.last_prompt


@pytest.mark.asyncio
async def test_llm_service_success_guest():
    """Verify LLMService builds prompt for guest and returns provider response."""
    mock_provider = MockLLMProvider(response_text="Welcome to TripVerse! Where are we going?")
    service = LLMService(provider=mock_provider)

    greeting = await service.generate_welcome_greeting(user_name=None)
    assert greeting == "Welcome to TripVerse! Where are we going?"
    assert "Guest / New Explorer" in mock_provider.last_prompt


@pytest.mark.asyncio
async def test_llm_service_fallback_on_provider_failure():
    """Verify LLMService uses graceful fallback when provider raises exception."""
    mock_failing_provider = MockLLMProvider(should_fail=True)
    service = LLMService(provider=mock_failing_provider)

    # Guest fallback
    guest_greeting = await service.generate_welcome_greeting(user_name=None)
    assert "Welcome to TripVerse! Where would you like to travel?" in guest_greeting

    # Authenticated fallback
    user_greeting = await service.generate_welcome_greeting(user_name="Rohit")
    assert "Welcome to TripVerse, Rohit! Where would you like to travel?" in user_greeting


@pytest.mark.asyncio
async def test_welcome_node_integration():
    """Verify welcome_node executes and returns assistant_response dictionary."""
    state: TripPlanningState = {
        "trip_id": "test-trip-uuid",
        "user_id": "user-123",
        "guest_id": None,
        "user_name": "Rohit",
        "user_message": "",
        "destination": None,
        "duration_days": None,
        "origin": None,
        "assistant_response": "",
    }

    mock_provider = MockLLMProvider(response_text="Hello Rohit! Where would you like to explore?")
    with patch("app.agents.trip_planner.nodes.llm_service", LLMService(provider=mock_provider)):
        result = await welcome_node(state)
        assert result == {"assistant_response": "Hello Rohit! Where would you like to explore?"}


@pytest.mark.asyncio
async def test_trip_planner_graph_ainvoke():
    """Verify LangGraph compiled graph executes asynchronously end-to-end."""
    initial_state: TripPlanningState = {
        "trip_id": "test-trip-uuid",
        "user_id": None,
        "guest_id": "guest-456",
        "user_name": None,
        "user_message": "",
        "destination": None,
        "duration_days": None,
        "origin": None,
        "assistant_response": "",
    }

    mock_provider = MockLLMProvider(response_text="Welcome Guest! Where are we traveling?")
    with patch("app.agents.trip_planner.nodes.llm_service", LLMService(provider=mock_provider)):
        output_state = await trip_planner_graph.ainvoke(initial_state)
        assert output_state["assistant_response"] == "Welcome Guest! Where are we traveling?"


@pytest.mark.asyncio
async def test_gemini_provider_generate():
    """Verify GeminiProvider formats request and invokes google-genai client."""
    provider = GeminiProvider(api_key="mock_api_key", model_name="gemini-2.5-flash")

    mock_response = MagicMock()
    mock_response.text = "Hello from Gemini!"

    mock_aio_models = MagicMock()
    mock_aio_models.generate_content = AsyncMock(return_value=mock_response)

    mock_client = MagicMock()
    mock_client.aio.models = mock_aio_models

    provider._client = mock_client

    result = await provider.generate(
        prompt="Hi",
        system_instruction="System prompt",
        temperature=0.5,
        max_output_tokens=100,
    )

    assert result == "Hello from Gemini!"
    mock_aio_models.generate_content.assert_awaited_once()
