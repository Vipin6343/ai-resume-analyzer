import re
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.db.repositories import HistoryRepository, ResumeRepository, UserRepository, utc_now
from app.schemas.resume import UploadResumeResponse
from app.services.resume_parser import resume_parser_service


class ResumeService:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.settings = get_settings()
        self.user_repository = UserRepository(database)
        self.resume_repository = ResumeRepository(database)
        self.history_repository = HistoryRepository(database)

    async def upload_resume(self, user_id: str, file: UploadFile) -> UploadResumeResponse:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported.")

        content = await file.read()
        max_size_bytes = self.settings.max_upload_size_mb * 1024 * 1024
        if len(content) > max_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds {self.settings.max_upload_size_mb} MB.",
            )

        await self.user_repository.ensure_user(user_id)

        resume_id = str(uuid4())
        safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", file.filename)
        file_path = Path(self.settings.resume_upload_dir) / f"{resume_id}_{safe_name}"
        await run_in_threadpool(file_path.write_bytes, content)

        raw_text, parsed_resume = await run_in_threadpool(resume_parser_service.parse, file_path)
        created_at = utc_now()

        await self.resume_repository.create(
            {
                "_id": resume_id,
                "user_id": user_id,
                "file_name": file.filename,
                "file_path": str(file_path),
                "raw_text": raw_text,
                "parsed_resume": parsed_resume.model_dump(),
                "created_at": created_at,
            }
        )
        await self.history_repository.create(
            {
                "_id": str(uuid4()),
                "user_id": user_id,
                "type": "resume_upload",
                "title": "Resume uploaded",
                "detail": file.filename,
                "created_at": created_at,
            }
        )

        return UploadResumeResponse(
            resume_id=resume_id,
            user_id=user_id,
            file_name=file.filename,
            raw_text_preview=raw_text[:1000],
            parsed_resume=parsed_resume,
            created_at=created_at,
        )

    async def get_resume_or_404(self, resume_id: str) -> dict:
        resume = await self.resume_repository.get_by_id(resume_id)
        if not resume:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found.")
        return resume

