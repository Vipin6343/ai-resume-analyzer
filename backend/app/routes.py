import html
import re
from typing import Annotated

import httpx
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
    generate_cold_email,
    generate_cover_letter,
    generate_custom_bullet_rewrites,
    generate_interview_questions,
    generate_linkedin_summary,
)
from .schemas import (
    AnalysisResponse,
    ATSScore,
    ColdEmailResponse,
    CompareResumesResponse,
    CoverLetterResponse,
    CustomRewriteResponse,
    ErrorResponse,
    ExtractResponse,
    InterviewQuestionsResponse,
    LinkedInSummaryResponse,
    ScrapeJobRequest,
    ScrapeJobResponse,
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


@router.post("/api/v1/resumes/linkedin-summary", response_model=LinkedInSummaryResponse, responses=ERROR_RESPONSES)
async def linkedin_summary(
    file: Annotated[UploadFile, File(description="PDF, at most 5 MB and 10 pages.")],
    settings: Annotated[Settings, Depends(get_settings)],
    target_job: Annotated[str | None, Form(description="Optional target job title.")] = None,
):
    try:
        if target_job is not None and (not target_job.strip() or len(target_job) > 200):
            raise AppError(400, "invalid_target_job", "Target job must contain 1 to 200 characters.")
        extracted = await extract_pdf(file)
    finally:
        await file.close()

    return await run_in_threadpool(
        generate_linkedin_summary,
        extracted.text,
        target_job.strip() if target_job else None,
        settings,
    )


@router.post("/api/v1/resumes/cold-email", response_model=ColdEmailResponse, responses=ERROR_RESPONSES)
async def cold_email(
    file: Annotated[UploadFile, File(description="PDF, at most 5 MB and 10 pages.")],
    settings: Annotated[Settings, Depends(get_settings)],
    job_description: Annotated[str | None, Form(description="Optional job description.")] = None,
    target_job: Annotated[str | None, Form(description="Optional target job title.")] = None,
):
    try:
        if target_job is not None and (not target_job.strip() or len(target_job) > 200):
            raise AppError(400, "invalid_target_job", "Target job must contain 1 to 200 characters.")
        if job_description is not None and len(job_description) > MAX_JOB_CHARS:
            raise AppError(413, "job_description_too_long", "Job description exceeds 12,000 characters.")
        extracted = await extract_pdf(file)
    finally:
        await file.close()

    return await run_in_threadpool(
        generate_cold_email,
        extracted.text,
        job_description.strip() if job_description else None,
        target_job.strip() if target_job else None,
        settings,
    )


@router.post("/api/v1/resumes/rewrite-bullet", response_model=CustomRewriteResponse, responses=ERROR_RESPONSES)
async def rewrite_bullet(
    bullet: Annotated[str, Form(description="The single bullet point to rewrite.")],
    settings: Annotated[Settings, Depends(get_settings)],
    target_role: Annotated[str | None, Form(description="Optional target role.")] = None,
):
    clean_bullet = bullet.strip()
    if not clean_bullet or len(clean_bullet) > 1000:
        raise AppError(400, "invalid_bullet", "Bullet point must be between 1 and 1000 characters.")

    return await run_in_threadpool(
        generate_custom_bullet_rewrites,
        clean_bullet,
        target_role.strip() if target_role else None,
        settings,
    )


@router.post("/api/v1/jobs/scrape", response_model=ScrapeJobResponse, responses=ERROR_RESPONSES)
async def scrape_job(payload: ScrapeJobRequest):
    url = payload.url.strip()
    if not url.startswith(("http://", "https://")):
        raise AppError(400, "invalid_url", "URL must start with http:// or https://")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code >= 400:
                raise AppError(400, "scrape_failed", f"Failed to fetch job posting (HTTP {resp.status_code}). Please paste the job description manually.")
            html_text = resp.text
    except httpx.RequestError:
        raise AppError(400, "scrape_failed", "Unable to connect to job URL. Please paste the job description manually.")

    # Extract title tag
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html_text, re.IGNORECASE | re.DOTALL)
    raw_title = html.unescape(title_match.group(1)).strip() if title_match else None
    if raw_title:
        raw_title = re.sub(r"\s+", " ", raw_title)

    # Clean HTML: remove script, style, nav, footer, header, svg, noscript
    clean = re.sub(r"<(script|style|nav|footer|header|svg|noscript|iframe)[^>]*>.*?</\1>", " ", html_text, flags=re.IGNORECASE | re.DOTALL)
    clean = re.sub(r"<(?:br|/p|/li|/div|/h[1-6])[^>]*>", "\n", clean, flags=re.IGNORECASE)
    clean = re.sub(r"<[^>]+>", " ", clean)
    clean = html.unescape(clean)

    # Filter out empty or whitespace lines
    lines = [line.strip() for line in clean.splitlines() if line.strip()]
    description = "\n".join(lines)
    if len(description) > 12000:
        description = description[:12000]

    if len(description.strip()) < 50:
        raise AppError(400, "scrape_no_content", "No legible job text found on this page. Please paste the job description directly.")

    return ScrapeJobResponse(title=raw_title, company=None, description=description)


@router.post("/api/v1/resumes/compare", response_model=CompareResumesResponse, responses=ERROR_RESPONSES)
async def compare_resumes(
    file_a: Annotated[UploadFile, File(description="First resume PDF")],
    file_b: Annotated[UploadFile, File(description="Second resume PDF")],
    settings: Annotated[Settings, Depends(get_settings)],
    provider: Annotated[AnalysisProvider, Depends(get_provider)],
    job_description: Annotated[str | None, Form(description="Optional job description.")] = None,
    target_job: Annotated[str | None, Form(description="Optional target job title.")] = None,
):
    try:
        extracted_a = await extract_pdf(file_a)
        extracted_b = await extract_pdf(file_b)
    finally:
        await file_a.close()
        await file_b.close()

    ats_a = calculate_ats_score(extracted_a.text, extracted_a.diagnostics)
    ats_b = calculate_ats_score(extracted_b.text, extracted_b.diagnostics)

    analysis_a = await analyze_resume(extracted_a.text, job_description or "", settings, provider)
    analysis_b = await analyze_resume(extracted_b.text, job_description or "", settings, provider)

    score_a = analysis_a.ai_quality_score.value
    score_b = analysis_b.ai_quality_score.value

    comp_a = (score_a * 0.6) + (ats_a.value * 0.4)
    comp_b = (score_b * 0.6) + (ats_b.value * 0.4)

    diff = comp_a - comp_b
    if diff > 3:
        winner = "A"
        rec = f"Version A ({file_a.filename or 'Resume A'}) has stronger overall metrics, earning a higher combined quality and ATS score."
    elif diff < -3:
        winner = "B"
        rec = f"Version B ({file_b.filename or 'Resume B'}) outperforms Version A across key structural and AI quality criteria."
    else:
        winner = "TIE"
        rec = "Both resumes are remarkably close in overall strength. Choose the one with the more relevant project emphasis for your target role."

    strengths_a = [s.heading for s in analysis_a.resume_review.strengths[:3]] or ["Clear basic structure"]
    strengths_b = [s.heading for s in analysis_b.resume_review.strengths[:3]] or ["Clear basic structure"]

    summary = (
        f"Version A scored {score_a}/100 (ATS: {ats_a.value}%), while Version B scored {score_b}/100 (ATS: {ats_b.value}%). "
        f"{rec}"
    )

    return CompareResumesResponse(
        name_a=file_a.filename or "Resume A",
        name_b=file_b.filename or "Resume B",
        quality_score_a=score_a,
        quality_score_b=score_b,
        ats_score_a=ats_a.value,
        ats_score_b=ats_b.value,
        winner=winner,
        recommendation=rec,
        strengths_a=strengths_a,
        strengths_b=strengths_b,
        verdict_summary=summary,
    )


