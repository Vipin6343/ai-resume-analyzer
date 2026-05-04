from functools import lru_cache
import json
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    app_name: str = Field(default="AI Resume Analyzer and Job Matcher", alias="APP_NAME")
    app_debug: bool = Field(default=False, alias="APP_DEBUG")
    app_cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        alias="APP_CORS_ORIGINS",
    )
    mongodb_url: str = Field(default="mongodb://localhost:27017", alias="MONGODB_URL")
    mongodb_database: str = Field(default="ai_resume_analyzer", alias="MONGODB_DATABASE")
    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")
    sentence_transformer_model: str = Field(
        default="all-MiniLM-L6-v2",
        alias="SENTENCE_TRANSFORMER_MODEL",
    )
    top_k_matches: int = Field(default=5, alias="TOP_K_MATCHES")
    ai_cache_ttl_seconds: int = Field(default=7 * 24 * 60 * 60, alias="AI_CACHE_TTL_SECONDS")
    max_upload_size_mb: int = Field(default=5, alias="MAX_UPLOAD_SIZE_MB")
    request_timeout_seconds: int = Field(default=60, alias="REQUEST_TIMEOUT_SECONDS")
    sample_jobs_path: str = str(PROJECT_DIR / "data" / "jobs.json")
    resume_upload_dir: str = str(PROJECT_DIR / "data" / "resumes")
    faiss_index_path: str = str(PROJECT_DIR / "data" / "faiss_index" / "jobs.index")
    faiss_meta_path: str = str(PROJECT_DIR / "data" / "faiss_index" / "jobs_meta.json")

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        value = self.app_cors_origins.strip()
        if not value:
            return []

        if value.startswith("["):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except json.JSONDecodeError:
                pass

        return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
