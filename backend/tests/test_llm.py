from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.services.llm.base import LLMProvider
from app.services.llm.providers.gemini import GeminiProvider
from app.services.llm.service import LLMService


class MockProvider(LLMProvider):
    def __init__(self, response_text: str = "Mock response"):
        self.response_text = response_text
        self.last_prompt = None
        self.last_system_instruction = None

    async def generate(
        self,
        prompt: str,
        system_instruction: str | None = None,
        temperature: float = 0.7,
        max_output_tokens: int = 500,
        **kwargs,
    ) -> str:
        self.last_prompt = prompt
        self.last_system_instruction = system_instruction
        return self.response_text


@pytest.mark.asyncio
async def test_llm_service_generate_delegation():
    """Verify LLMService delegates generation to underlying provider."""
    mock_provider = MockProvider("Custom generation output")
    service = LLMService(provider=mock_provider)

    result = await service.generate("Hello world", system_instruction="Be helpful")
    assert result == "Custom generation output"
    assert mock_provider.last_prompt == "Hello world"
    assert mock_provider.last_system_instruction == "Be helpful"


@pytest.mark.asyncio
async def test_llm_service_welcome_authenticated():
    """Verify welcome greeting prompt is built for authenticated users with their name."""
    mock_provider = MockProvider("Welcome back Rohit! Where are we going?")
    service = LLMService(provider=mock_provider)

    greeting = await service.generate_welcome_greeting(user_name="Rohit")
    assert greeting == "Welcome back Rohit! Where are we going?"
    assert "Rohit" in mock_provider.last_prompt


@pytest.mark.asyncio
async def test_llm_service_welcome_guest():
    """Verify welcome greeting prompt is built for guest users."""
    mock_provider = MockProvider("Welcome to TripVerse! Where are we going?")
    service = LLMService(provider=mock_provider)

    greeting = await service.generate_welcome_greeting(user_name=None)
    assert greeting == "Welcome to TripVerse! Where are we going?"


@pytest.mark.asyncio
async def test_llm_service_welcome_fallback_on_error():
    """Verify LLMService falls back to safe deterministic greeting when provider fails."""
    class FailingProvider(LLMProvider):
        async def generate(self, *args, **kwargs) -> str:
            raise RuntimeError("API key quota exceeded")

    service = LLMService(provider=FailingProvider())
    greeting_auth = await service.generate_welcome_greeting(user_name="Rohit")
    assert "Rohit" in greeting_auth
    assert "Where would you like to travel?" in greeting_auth

    greeting_guest = await service.generate_welcome_greeting(user_name=None)
    assert greeting_guest == "Welcome to TripVerse! Where would you like to travel?"


@pytest.mark.asyncio
async def test_gemini_provider_generate():
    """Verify GeminiProvider calls google-genai client properly."""
    provider = GeminiProvider(api_key="test-api-key", model="gemini-3.6-flash")

    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "Generated travel response"
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

    with patch.object(provider, "_get_client", return_value=mock_client):
        result = await provider.generate("Plan trip", system_instruction="Travel Guide")
        assert result == "Generated travel response"
        mock_client.aio.models.generate_content.assert_called_once()
