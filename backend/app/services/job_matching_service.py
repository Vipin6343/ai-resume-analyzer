import hashlib
import json
from pathlib import Path
from uuid import uuid4

import faiss
import numpy as np
from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.db.repositories import HistoryRepository, JobRepository, MatchRepository, ResumeRepository, utc_now
from app.schemas.job import JobMatch, JobPosting, MatchJobsRequest, MatchJobsResponse
from app.schemas.resume import ParsedResume
from app.services.embedding_service import embedding_service


class JobMatchingService:
    _shared_index: faiss.Index | None = None
    _shared_job_ids: list[str] = []

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.settings = get_settings()
        self.job_repository = JobRepository(database)
        self.resume_repository = ResumeRepository(database)
        self.match_repository = MatchRepository(database)
        self.history_repository = HistoryRepository(database)

    async def seed_jobs(self) -> int:
        sample_jobs = await run_in_threadpool(self._load_sample_jobs)
        await self.job_repository.upsert_many(sample_jobs)
        return len(sample_jobs)

    async def ensure_index(self) -> None:
        jobs = await self.job_repository.list_all()
        if not jobs:
            return

        if self.__class__._shared_index is not None and len(self.__class__._shared_job_ids) == len(jobs):
            return

        index_path = Path(self.settings.faiss_index_path)
        meta_path = Path(self.settings.faiss_meta_path)
        if index_path.exists() and meta_path.exists():
            metadata = json.loads(meta_path.read_text(encoding="utf-8"))
            if len(metadata.get("job_ids", [])) == len(jobs):
                self.__class__._shared_index = await run_in_threadpool(faiss.read_index, str(index_path))
                self.__class__._shared_job_ids = metadata["job_ids"]
                return

        await self._rebuild_index(jobs)

    async def match_jobs(self, request: MatchJobsRequest) -> MatchJobsResponse:
        resume = await self.resume_repository.get_by_id(request.resume_id)
        if not resume:
            raise ValueError("Resume not found.")

        cache_key = self._hash_payload(
            {
                "type": "job_match",
                "resume_id": request.resume_id,
                "resume_text": resume["raw_text"],
                "limit": request.limit,
            }
        )
        if not request.force_refresh:
            cached_match = await self.match_repository.get_by_cache_key(cache_key)
            if cached_match:
                return MatchJobsResponse(
                    match_id=cached_match["id"],
                    resume_id=request.resume_id,
                    user_id=request.user_id,
                    matches=[JobMatch.model_validate(item) for item in cached_match["matches"]],
                    created_at=cached_match["created_at"],
                )

        await self.ensure_index()
        if self.__class__._shared_index is None or not self.__class__._shared_job_ids:
            raise RuntimeError("Job index is unavailable.")

        parsed_resume = ParsedResume.model_validate(resume["parsed_resume"])
        resume_text = self._build_resume_embedding_text(parsed_resume, resume["raw_text"])
        query_vector = await run_in_threadpool(embedding_service.encode, [resume_text])
        scores, positions = await run_in_threadpool(self.__class__._shared_index.search, query_vector, request.limit)

        selected_job_ids = [
            self.__class__._shared_job_ids[index]
            for index in positions[0]
            if 0 <= index < len(self.__class__._shared_job_ids)
        ]
        jobs = await self.job_repository.get_many_by_ids(selected_job_ids)
        job_map = {job["id"]: job for job in jobs}
        resume_skills = {skill.lower() for skill in parsed_resume.skills}

        matches: list[JobMatch] = []
        for job_id, raw_score in zip(selected_job_ids, scores[0], strict=False):
            job = job_map.get(job_id)
            if not job:
                continue
            job_skills = [skill.strip() for skill in job.get("skills", [])]
            matching_skills = [skill for skill in job_skills if skill.lower() in resume_skills]
            missing_skills = [skill for skill in job_skills if skill.lower() not in resume_skills]
            score = round(float(max(raw_score, 0.0) * 100), 2)
            matches.append(
                JobMatch(
                    job=JobPosting.model_validate(job),
                    match_score=score,
                    matching_skills=matching_skills,
                    missing_skills=missing_skills,
                    priority_skills=missing_skills[:5],
                    rationale=self._build_rationale(job["title"], matching_skills, missing_skills),
                )
            )

        created_at = utc_now()
        match_id = str(uuid4())
        document = {
            "_id": match_id,
            "resume_id": request.resume_id,
            "user_id": request.user_id,
            "cache_key": cache_key,
            "matches": [match.model_dump() for match in matches],
            "created_at": created_at,
        }
        await self.match_repository.create(document)
        await self.history_repository.create(
            {
                "_id": str(uuid4()),
                "user_id": request.user_id,
                "type": "job_match",
                "title": "Job matching completed",
                "detail": f"{len(matches)} matches generated",
                "created_at": created_at,
            }
        )

        return MatchJobsResponse(
            match_id=match_id,
            resume_id=request.resume_id,
            user_id=request.user_id,
            matches=matches,
            created_at=created_at,
        )

    async def _rebuild_index(self, jobs: list[dict]) -> None:
        texts = [self._build_job_embedding_text(job) for job in jobs]
        vectors = await run_in_threadpool(embedding_service.encode, texts)
        dimension = int(vectors.shape[1])

        index = faiss.IndexFlatIP(dimension)
        index.add(vectors.astype(np.float32))
        self.__class__._shared_index = index
        self.__class__._shared_job_ids = [job["id"] for job in jobs]

        await run_in_threadpool(faiss.write_index, index, self.settings.faiss_index_path)
        meta = {"job_ids": self.__class__._shared_job_ids}
        await run_in_threadpool(Path(self.settings.faiss_meta_path).write_text, json.dumps(meta), "utf-8")

    def _load_sample_jobs(self) -> list[dict]:
        sample_path = Path(self.settings.sample_jobs_path)
        jobs = json.loads(sample_path.read_text(encoding="utf-8"))
        return [{"_id": job["id"], **job} for job in jobs]

    def _build_job_embedding_text(self, job: dict) -> str:
        return (
            f"{job['title']} at {job['company']}. "
            f"Level: {job['experience_level']}. "
            f"Skills: {', '.join(job.get('skills', []))}. "
            f"Description: {job['description']}"
        )

    def _build_resume_embedding_text(self, parsed_resume: ParsedResume, raw_text: str) -> str:
        return (
            f"Summary: {parsed_resume.summary or ''}\n"
            f"Skills: {', '.join(parsed_resume.skills)}\n"
            f"Experience: {' '.join(parsed_resume.experience)}\n"
            f"Projects: {' '.join(parsed_resume.projects)}\n"
            f"Resume text: {raw_text[:3000]}"
        )

    def _build_rationale(self, title: str, matching_skills: list[str], missing_skills: list[str]) -> str:
        if matching_skills:
            return (
                f"Strong overlap for {title} through {', '.join(matching_skills[:4])}. "
                f"Closing gaps in {', '.join(missing_skills[:3]) or 'role-specific keywords'} will improve fit."
            )
        return f"Limited direct overlap for {title}; prioritize the missing role keywords to improve alignment."

    def _hash_payload(self, payload: dict) -> str:
        serialized = json.dumps(payload, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
