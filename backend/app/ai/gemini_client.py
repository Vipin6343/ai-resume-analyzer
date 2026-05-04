import logging

from google import genai
from pydantic import BaseModel
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import get_settings


logger = logging.getLogger(__name__)


class GeminiClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._client: genai.Client | None = None

    def _get_client(self) -> genai.Client:
        if not self.settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured.")

        if self._client is None:
            self._client = genai.Client(api_key=self.settings.gemini_api_key)
        return self._client

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    def generate_structured_output(
        self,
        prompt: str,
        schema_model: type[BaseModel],
        temperature: float = 0.2,
    ) -> BaseModel:
        client = self._get_client()
        response = client.models.generate_content(
            model=self.settings.gemini_model,
            contents=prompt,
            config={
                "temperature": temperature,
                "response_mime_type": "application/json",
                "response_json_schema": schema_model.model_json_schema(),
            },
        )

        if not getattr(response, "text", None):
            logger.error("Gemini returned an empty response.")
            raise RuntimeError("Gemini returned an empty response.")

        return schema_model.model_validate_json(response.text)


gemini_client = GeminiClient()

