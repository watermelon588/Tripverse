import logging
from typing import Optional

from app.services.llm.base import LLMProvider
from app.services.llm.providers.gemini import GeminiProvider

logger = logging.getLogger(__name__)

WELCOME_SYSTEM_INSTRUCTION = (
    "You are TripVerse's friendly, inspiring AI travel-planning companion. "
    "Your role is to welcome the traveler naturally and ask where they would like to travel. "
    "Keep your response concise and conversational (1 to 2 sentences maximum). "
    "If a traveler's name is provided, personalize the greeting warmly with their name. "
    "Do not invent trip details, do not generate an itinerary, and do not ask multiple questions."
)


class LLMService:
    """
    Application-level LLM Service.
    Coordinates LLM provider calls, builds structured prompts, and provides safe fallbacks
    so agent workflows never crash due to provider errors or rate limits.
    """

    def __init__(self, provider: Optional[LLMProvider] = None):
        self._provider = provider or GeminiProvider()

    def set_provider(self, provider: LLMProvider) -> None:
        """Allow runtime swapping of the underlying LLM provider."""
        self._provider = provider

    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_output_tokens: Optional[int] = None,
    ) -> str:
        """Delegate raw text generation to the active LLM provider."""
        return await self._provider.generate(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )

    async def generate_welcome_greeting(
        self,
        user_name: Optional[str] = None,
        user_message: Optional[str] = None,
    ) -> str:
        """
        Generate a dynamic, personalized welcome greeting for initializing a trip session.
        Safely falls back to a deterministic greeting if the provider fails.
        """
        prompt_parts = []
        if user_name:
            prompt_parts.append(f"Traveler Name: {user_name}")
        else:
            prompt_parts.append("Traveler: Guest / New Explorer")

        if user_message and user_message.strip():
            prompt_parts.append(f"Initial Note: {user_message.strip()}")

        prompt_parts.append(
            "Generate a warm welcome greeting inviting the traveler to share where they'd like to travel."
        )
        prompt = "\n".join(prompt_parts)

        try:
            response = await self._provider.generate(
                prompt=prompt,
                system_instruction=WELCOME_SYSTEM_INSTRUCTION,
                temperature=0.7,
                max_output_tokens=500,
            )
            if response and response.strip():
                return response.strip()

        except Exception as exc:
            logger.warning(
                f"LLM generation failed ({type(exc).__name__}). Using safe fallback greeting."
            )

        # Resilient Fallback
        if user_name:
            return f"Welcome to TripVerse, {user_name}! Where would you like to travel?"
        return "Welcome to TripVerse! Where would you like to travel?"


llm_service = LLMService()
