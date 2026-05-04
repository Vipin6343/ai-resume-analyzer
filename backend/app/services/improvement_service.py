import hashlib
import json
from uuid import uuid4

from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.gemini_client import gemini_client
from app.ai.prompts import build_improvement_prompt
from app.core.config import get_settings
from app.db.repositories import (
    AICacheRepository,
    AnalysisRepository,
    HistoryRepository,
    ImprovementRepository,
    ResumeRepository,
    utc_now,
)
from app.schemas.resume import (
    ImproveResumeRequest,
    ImproveResumeResponse,
    ParsedResume,
    ResumeImprovement,
)


class ImprovementService:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.settings = get_settings()
        self.resume_repository = ResumeRepository(database)
        self.analysis_repository = AnalysisRepository(database)
        self.improvement_repository = ImprovementRepository(database)
        self.history_repository = HistoryRepository(database)
        self.cache_repository = AICacheRepository(database)

    async def improve_resume(self, request: ImproveResumeRequest) -> ImproveResumeResponse:
        resume = await self.resume_repository.get_by_id(request.resume_id)
        if not resume:
            raise ValueError("Resume not found.")

        latest_analysis = await self.analysis_repository.get_latest_for_resume(request.resume_id)
        prior_suggestions = latest_analysis.get("analysis", {}).get("suggestions", []) if latest_analysis else []
        parsed_resume = ParsedResume.model_validate(resume["parsed_resume"])
        cache_key = self._hash_payload(
            {
                "type": "resume_improvement",
                "resume_id": request.resume_id,
                "resume_text": resume["raw_text"],
                "target_job_title": request.target_job_title,
                "focus_areas": request.focus_areas,
                "prior_suggestions": prior_suggestions,
            }
        )

        if not request.force_refresh:
            cache_entry = await self.cache_repository.get(cache_key)
            cached_improvement = await self.improvement_repository.get_by_cache_key(cache_key)
            if cache_entry and cached_improvement:
                return ImproveResumeResponse(
                    improvement_id=cached_improvement["id"],
                    resume_id=request.resume_id,
                    user_id=request.user_id,
                    cached=True,
                    improvement=ResumeImprovement.model_validate(cached_improvement["improvement"]),
                    created_at=cached_improvement["created_at"],
                )

        prompt = build_improvement_prompt(
            parsed_resume,
            request.target_job_title,
            request.focus_areas,
            prior_suggestions,
        )
        improvement = await run_in_threadpool(gemini_client.generate_structured_output, prompt, ResumeImprovement)
        created_at = utc_now()
        improvement_id = str(uuid4())
        document = {
            "_id": improvement_id,
            "resume_id": request.resume_id,
            "user_id": request.user_id,
            "cache_key": cache_key,
            "improvement": improvement.model_dump(),
            "created_at": created_at,
        }
        await self.improvement_repository.create(document)
        await self.cache_repository.set(cache_key, improvement.model_dump(), self.settings.ai_cache_ttl_seconds)
        await self.history_repository.create(
            {
                "_id": str(uuid4()),
                "user_id": request.user_id,
                "type": "resume_improvement",
                "title": "Resume improvement generated",
                "detail": request.target_job_title or "General optimization",
                "created_at": created_at,
            }
        )

        return ImproveResumeResponse(
            improvement_id=improvement_id,
            resume_id=request.resume_id,
            user_id=request.user_id,
            cached=False,
            improvement=improvement,
            created_at=created_at,
        )

    def _hash_payload(self, payload: dict) -> str:
        serialized = json.dumps(payload, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
