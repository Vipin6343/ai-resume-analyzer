import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field, SecretStr


MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024
MAX_PAGES = 10
MAX_RESUME_CHARS = 30_000
MAX_JOB_CHARS = 12_000


class Settings(BaseModel):
    model_config = ConfigDict(frozen=True)

    provider: Literal["openai", "gemini"] = "openai"
    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = Field(default="gemini-flash-lite-latest", min_length=1)
    gemini_timeout: float = Field(default=30, ge=1, le=120)
    gemini_max_retries: int = Field(default=2, ge=0, le=3)
    api_key: SecretStr = SecretStr("")
    model: str = Field(default="gpt-4o-mini", min_length=1)
    timeout: float = Field(default=30, ge=1, le=120)
    max_retries: int = Field(default=2, ge=0, le=3)
    cors_origins: tuple[str, ...] = (
        "http://localhost:3000", "http://localhost:5173"
    )

    @classmethod
    def from_env(cls) -> "Settings":
        env_path = Path(__file__).resolve().parent.parent / ".env"
        load_dotenv(env_path)
        load_dotenv()
        return cls(
            provider=os.getenv("LLM_PROVIDER", "openai").strip().lower(),
            gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
            gemini_model=os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest").strip(),
            gemini_timeout=os.getenv("GEMINI_TIMEOUT_SECONDS", "30"),
            gemini_max_retries=os.getenv("GEMINI_MAX_RETRIES", "2"),
            api_key=os.getenv("OPENAI_API_KEY", "").strip(),
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip(),
            timeout=os.getenv("OPENAI_TIMEOUT_SECONDS", "30"),
            max_retries=os.getenv("OPENAI_MAX_RETRIES", "2"),
            cors_origins=tuple(
                origin.strip()
                for origin in os.getenv(
                    "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
                ).split(",") if origin.strip()
            ),
        )
