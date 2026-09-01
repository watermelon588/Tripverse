import logging
from typing import Any, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.services.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class GeminiProvider(LLMProvider):
    """
    Google Gemini provider implementing the LLMProvider abstraction using Google GenAI SDK.
    Handles client lifecycle, model invocation, and provider-specific error catching.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        self._api_key = api_key or settings.GEMINI_API_KEY
        self._model_name = model_name or settings.GEMINI_MODEL or "gemini-3.6-flash"

    def _get_client(self) -> genai.Client:
        """Create or return client bound to current execution environment."""
        if not self._api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")
        return genai.Client(api_key=self._api_key)

    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_output_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> str:
        """
        Generate completion text asynchronously via Gemini API.
        """
        try:
            client = self._get_client()

            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            )

            response = await client.aio.models.generate_content(
                model=self._model_name,
                contents=prompt,
                config=config,
            )

            if response and response.text:
                return response.text.strip()

            return ""

        except Exception as e:
            logger.error(f"Gemini API invocation error: {type(e).__name__} - {str(e)}")
            raise
