from pathlib import Path

from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.db.repositories import (
    AnalysisRepository,
    HistoryRepository,
    ImprovementRepository,
    MatchRepository,
    ResumeRepository,
)
from app.schemas.dashboard import ActivityItem, DashboardResponse, DashboardStats
from app.schemas.job import JobMatch
from app.schemas.resume import (
    AnalyzeResumeResponse,
    ImproveResumeResponse,
    ParsedResume,
    ResumeAnalysis,
    ResumeImprovement,
    UploadResumeResponse,
)


class DashboardService:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.settings = get_settings()
        self.resume_repository = ResumeRepository(database)
        self.analysis_repository = AnalysisRepository(database)
        self.match_repository = MatchRepository(database)
        self.improvement_repository = ImprovementRepository(database)
        self.history_repository = HistoryRepository(database)

    async def get_dashboard(self, user_id: str) -> DashboardResponse:
        latest_resume_doc = await self.resume_repository.get_latest(user_id)
        latest_analysis_doc = await self.analysis_repository.get_latest_for_user(user_id)
        latest_match_doc = await self.match_repository.get_latest_for_user(user_id)
        latest_improvement_doc = await self.improvement_repository.get_latest_for_user(user_id)
        activity_docs = await self.history_repository.list_recent(user_id)

        latest_resume = None
        if latest_resume_doc:
            latest_resume = UploadResumeResponse(
                resume_id=latest_resume_doc["id"],
                user_id=user_id,
                file_name=latest_resume_doc["file_name"],
                raw_text_preview=latest_resume_doc["raw_text"][:1000],
                parsed_resume=ParsedResume.model_validate(latest_resume_doc["parsed_resume"]),
                created_at=latest_resume_doc["created_at"],
            )

        latest_analysis = None
        if latest_analysis_doc:
            latest_analysis = AnalyzeResumeResponse(
                analysis_id=latest_analysis_doc["id"],
                resume_id=latest_analysis_doc["resume_id"],
                user_id=user_id,
                cached=False,
                analysis=ResumeAnalysis.model_validate(latest_analysis_doc["analysis"]),
                created_at=latest_analysis_doc["created_at"],
            )

        latest_matches = []
        if latest_match_doc:
            latest_matches = [JobMatch.model_validate(item) for item in latest_match_doc["matches"]]

        latest_improvement = None
        if latest_improvement_doc:
            latest_improvement = ImproveResumeResponse(
                improvement_id=latest_improvement_doc["id"],
                resume_id=latest_improvement_doc["resume_id"],
                user_id=user_id,
                cached=False,
                improvement=ResumeImprovement.model_validate(latest_improvement_doc["improvement"]),
                created_at=latest_improvement_doc["created_at"],
            )

        return DashboardResponse(
            user_id=user_id,
            stats=DashboardStats(
                resume_count=await self.resume_repository.count_by_user(user_id),
                analysis_count=await self.analysis_repository.count_by_user(user_id),
                match_count=await self.match_repository.count_by_user(user_id),
                improvement_count=await self.improvement_repository.count_by_user(user_id),
            ),
            latest_resume=latest_resume,
            latest_analysis=latest_analysis,
            latest_matches=latest_matches,
            latest_improvement=latest_improvement,
            activity=[ActivityItem.model_validate(item) for item in activity_docs],
        )

    async def reset_dashboard(self, user_id: str) -> DashboardResponse:
        resume_docs = await self.resume_repository.list_by_user(user_id)
        await self._delete_resume_files(resume_docs)

        await self.resume_repository.delete_by_user(user_id)
        await self.analysis_repository.delete_by_user(user_id)
        await self.match_repository.delete_by_user(user_id)
        await self.improvement_repository.delete_by_user(user_id)
        await self.history_repository.delete_by_user(user_id)

        return DashboardResponse(
            user_id=user_id,
            stats=DashboardStats(),
            latest_resume=None,
            latest_analysis=None,
            latest_matches=[],
            latest_improvement=None,
            activity=[],
        )

    async def _delete_resume_files(self, resume_docs: list[dict]) -> None:
        upload_root = Path(self.settings.resume_upload_dir).resolve()
        for resume_doc in resume_docs:
            file_path_value = resume_doc.get("file_path")
            if not file_path_value:
                continue

            file_path = Path(file_path_value).resolve()
            try:
                file_path.relative_to(upload_root)
            except ValueError:
                continue

            try:
                await run_in_threadpool(file_path.unlink, True)
            except OSError:
                continue
