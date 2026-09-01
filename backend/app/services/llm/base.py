from abc import ABC, abstractmethod
from typing import Any, Optional


class LLMProvider(ABC):
    """
    Abstract contract for LLM providers in TripVerse.
    Isolates agent nodes and workflows from specific provider SDKs and client interfaces.
    """

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_output_tokens: Optional[int] = None,
        **kwargs: Any,
    ) -> str:
        """
        Generate completion text asynchronously given a prompt and optional parameters.
        """
        pass
