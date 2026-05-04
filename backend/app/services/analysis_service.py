import hashlib
import json
from uuid import uuid4

from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.ai.gemini_client import gemini_client
from app.ai.prompts import build_analysis_prompt
from app.core.config import get_settings
from app.db.repositories import (
    AICacheRepository,
    AnalysisRepository,
    HistoryRepository,
    ResumeRepository,
    utc_now,
)
from app.schemas.resume import AnalyzeResumeRequest, AnalyzeResumeResponse, ParsedResume, ResumeAnalysis


class AnalysisService:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.settings = get_settings()
        self.resume_repository = ResumeRepository(database)
        self.analysis_repository = AnalysisRepository(database)
        self.history_repository = HistoryRepository(database)
        self.cache_repository = AICacheRepository(database)

    async def analyze_resume(self, request: AnalyzeResumeRequest) -> AnalyzeResumeResponse:
        resume = await self.resume_repository.get_by_id(request.resume_id)
        if not resume:
            raise ValueError("Resume not found.")

        parsed_resume = ParsedResume.model_validate(resume["parsed_resume"])
        cache_key = self._hash_payload(
            {
                "type": "resume_analysis",
                "resume_id": request.resume_id,
                "resume_text": resume["raw_text"],
                "target_job_titles": request.target_job_titles,
            }
        )

        if not request.force_refresh:
            cache_entry = await self.cache_repository.get(cache_key)
            cached_analysis = await self.analysis_repository.get_by_cache_key(cache_key)
            if cache_entry and cached_analysis:
                return AnalyzeResumeResponse(
                    analysis_id=cached_analysis["id"],
                    resume_id=request.resume_id,
                    user_id=request.user_id,
                    cached=True,
                    analysis=ResumeAnalysis.model_validate(cached_analysis["analysis"]),
                    created_at=cached_analysis["created_at"],
                )

        prompt = build_analysis_prompt(parsed_resume, request.target_job_titles)
        analysis = await run_in_threadpool(gemini_client.generate_structured_output, prompt, ResumeAnalysis)
        created_at = utc_now()
        analysis_id = str(uuid4())

        document = {
            "_id": analysis_id,
            "resume_id": request.resume_id,
            "user_id": request.user_id,
            "cache_key": cache_key,
            "analysis": analysis.model_dump(),
            "created_at": created_at,
        }
        await self.analysis_repository.create(document)
        await self.cache_repository.set(cache_key, analysis.model_dump(), self.settings.ai_cache_ttl_seconds)
        await self.history_repository.create(
            {
                "_id": str(uuid4()),
                "user_id": request.user_id,
                "type": "resume_analysis",
                "title": "Resume analyzed",
                "detail": f"Score {analysis.score}/100",
                "created_at": created_at,
            }
        )

        return AnalyzeResumeResponse(
            analysis_id=analysis_id,
            resume_id=request.resume_id,
            user_id=request.user_id,
            cached=False,
            analysis=analysis,
            created_at=created_at,
        )

    def _hash_payload(self, payload: dict) -> str:
        serialized = json.dumps(payload, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
