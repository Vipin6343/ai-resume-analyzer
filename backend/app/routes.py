from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile

from starlette.concurrency import run_in_threadpool

from .analysis import analyze_resume
from .ats import calculate_ats_score
from .config import MAX_JOB_CHARS, Settings
from .errors import AppError
from .pdf import extract_pdf
from .provider import (
    AnalysisProvider,
    analyze_with_provider,
    generate_cover_letter,
    generate_interview_questions,
)
from .schemas import (
    AnalysisResponse,
    ATSScore,
    CoverLetterResponse,
    ErrorResponse,
    ExtractResponse,
    InterviewQuestionsResponse,
)


router = APIRouter()
ERROR_RESPONSES = {
    status: {"model": ErrorResponse}
    for status in (400, 413, 422, 429, 500, 502, 503)
}


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_provider() -> AnalysisProvider:
    return analyze_with_provider


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/api//resumes/extract", response_model=ExtractResponse, include_in_schema=False)
@router.post("/api/resumes/extract", response_model=ExtractResponse, include_in_schema=False)
@router.post("/api/v1/resumes/extract", response_model=ExtractResponse, responses=ERROR_RESPONSES)
async def extract(file: Annotated[UploadFile, File(description="PDF, at most 5 MB and 10 pages.")]):
    try:
        return await extract_pdf(file)
    finally:
        await file.close()


@router.post("/api/v1/resumes/ats-check", response_model=ATSScore, responses=ERROR_RESPONSES)
async def ats_check(file: Annotated[UploadFile, File(description="PDF, at most 5 MB and 10 pages.")]):
    """Run compatibility checks without sending the resume to an AI provider."""
    try:
        extracted = await extract_pdf(file)
        return calculate_ats_score(extracted.text, extracted.diagnostics)
    except AppError:
        raise
    except Exception as exc:
        raise AppError(500, "ats_check_failed", "ATS check failed due to an unexpected error.") from exc
    finally:
        await file.close()


@router.post("/api//resumes/analyze", response_model=AnalysisResponse, include_in_schema=False)
@router.post("/api/resumes/analyze", response_model=AnalysisResponse, include_in_schema=False)
@router.post("/api/v1/resumes/analyze", response_model=AnalysisResponse, responses=ERROR_RESPONSES)
async def analyze(
    file: Annotated[UploadFile, File(description="PDF, at most 5 MB and 10 pages.")],
    settings: Annotated[Settings, Depends(get_settings)],
    provider: Annotated[AnalysisProvider, Depends(get_provider)],
    job_description: Annotated[str | None, Form(description="Optional. Omit for standalone resume analysis; supply actual requirements only for job comparison.")] = None,
    target_job: Annotated[str | None, Form(description="Optional target job title, e.g. AI Backend Developer. Up to 200 characters; provide requirements in job_description.")] = None,
):
    try:
        if target_job is not None and (not target_job.strip() or len(target_job) > 200):
            raise AppError(400, "invalid_target_job", "Target job must contain 1 to 200 characters.")
        if job_description is not None and not job_description.strip():
            raise AppError(400, "invalid_job_description", "Job description must not be empty.")
        if job_description is not None and len(job_description) > MAX_JOB_CHARS:
            raise AppError(413, "job_description_too_long", "Job description exceeds 12,000 characters.")
        extracted = await extract_pdf(file)
    finally:
        await file.close()
    result = await analyze_resume(extracted.text, job_description or "", settings, provider)
    result.target_job = target_job.strip() if target_job else None
    result.ats_score = calculate_ats_score(extracted.text, extracted.diagnostics)
    return result


@router.post("/api//resumes/cover-letter", response_model=CoverLetterResponse, include_in_schema=False)
@router.post("/api/resumes/cover-letter", response_model=CoverLetterResponse, include_in_schema=False)
@router.post("/api/v1/resumes/cover-letter", response_model=CoverLetterResponse, responses=ERROR_RESPONSES)
async def cover_letter(
    file: Annotated[UploadFile, File(description="PDF, at most 5 MB and 10 pages.")],
    settings: Annotated[Settings, Depends(get_settings)],
    job_description: Annotated[str | None, Form(description="Optional job description to tailor the letter.")] = None,
    target_job: Annotated[str | None, Form(description="Optional target job title.")] = None,
):
    try:
        if target_job is not None and (not target_job.strip() or len(target_job) > 200):
            raise AppError(400, "invalid_target_job", "Target job must contain 1 to 200 characters.")
        if job_description is not None and not job_description.strip():
            raise AppError(400, "invalid_job_description", "Job description must not be empty.")
        if job_description is not None and len(job_description) > MAX_JOB_CHARS:
            raise AppError(413, "job_description_too_long", "Job description exceeds 12,000 characters.")
        extracted = await extract_pdf(file)
    finally:
        await file.close()

    letter_text = await run_in_threadpool(
        generate_cover_letter,
        extracted.text,
        job_description.strip() if job_description else None,
        target_job.strip() if target_job else None,
        settings,
    )
    words = len(letter_text.split())
    return CoverLetterResponse(cover_letter=letter_text, word_count=words)


@router.post("/api//resumes/interview-questions", response_model=InterviewQuestionsResponse, include_in_schema=False)
@router.post("/api/resumes/interview-questions", response_model=InterviewQuestionsResponse, include_in_schema=False)
@router.post("/api/v1/resumes/interview-questions", response_model=InterviewQuestionsResponse, responses=ERROR_RESPONSES)
async def interview_questions(
    file: Annotated[UploadFile, File(description="PDF, at most 5 MB and 10 pages.")],
    settings: Annotated[Settings, Depends(get_settings)],
    job_description: Annotated[str | None, Form(description="Optional job requirements to predict questions for.")] = None,
    target_job: Annotated[str | None, Form(description="Optional target job title.")] = None,
):
    try:
        if target_job is not None and (not target_job.strip() or len(target_job) > 200):
            raise AppError(400, "invalid_target_job", "Target job must contain 1 to 200 characters.")
        if job_description is not None and not job_description.strip():
            raise AppError(400, "invalid_job_description", "Job description must not be empty.")
        if job_description is not None and len(job_description) > MAX_JOB_CHARS:
            raise AppError(413, "job_description_too_long", "Job description exceeds 12,000 characters.")
        extracted = await extract_pdf(file)
    finally:
        await file.close()

    return await run_in_threadpool(
        generate_interview_questions,
        extracted.text,
        job_description.strip() if job_description else None,
        target_job.strip() if target_job else None,
        settings,
    )

