"""Validate grounding and consolidate requirements before calculating the score."""

import re

from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from .config import Settings
from .ats import calculate_ats_score
from .errors import AppError
from .provider import AnalysisProvider
from .schemas import AIQualityScore, AnalysisResponse, EvidenceStatus, ModelAnalysis, ModelRequirement, Requirement
from .scoring import calculate_score


def normalize_quote(text: str) -> str:
    # Allow PDF line wrapping while retaining the exact words, punctuation and case.
    return re.sub(r"\s+", " ", text).strip()


def concept_key(text: str) -> str:
    # Keep meaningful technology punctuation: C, C++, C#, .NET remain distinct.
    return normalize_quote(text).casefold().rstrip(" .,:;!?").lstrip(" -\u2022")


def verify_excerpt(excerpt: str | None, normalized_source: str) -> None:
    if not excerpt or not normalize_quote(excerpt):
        raise AppError(502, "invalid_model_output", "Model supplied evidence that could not be verified in its source document.")
    norm_excerpt = normalize_quote(excerpt)
    if norm_excerpt in normalized_source:
        return
    # LLMs frequently combine multiple citations with newlines
    parts = [p.strip() for p in re.split(r"[\n\r]+", excerpt) if p.strip()]
    if len(parts) > 1 and all(normalize_quote(p) in normalized_source for p in parts):
        return
    raise AppError(502, "invalid_model_output", "Model supplied evidence that could not be verified in its source document.")


def deduplicate(requirements: list[ModelRequirement]) -> list[Requirement]:
    # Merge matching canonical concepts OR matching labels, including transitive aliases.
    groups: list[list[ModelRequirement]] = []
    for item in requirements:
        keys = {concept_key(item.canonical_key), concept_key(item.requirement)}
        overlaps = [g for g in groups if keys & {
            key for r in g for key in (concept_key(r.canonical_key), concept_key(r.requirement))
        }]
        merged = [item]
        for group in overlaps:
            groups.remove(group)
            merged.extend(group)
        groups.append(merged)

    result = []
    for group in groups:
        rank = {EvidenceStatus.missing: 0, EvidenceStatus.insufficient: 1, EvidenceStatus.matched: 2}
        selected = min(group, key=lambda r: rank[r.status])
        kind = "required" if any(r.kind == "required" for r in group) else "preferred"
        item = Requirement.model_validate({
            **selected.model_dump(exclude={"canonical_key"}), "kind": kind
        })
        if kind == "required":
            item.job_evidence = next(r.job_evidence for r in group if r.kind == "required")
        if item.status == EvidenceStatus.missing:
            item.explanation = "Not evidenced in the resume. Add relevant details only if accurate."
        result.append(item)
    return result


def build_analysis(model: ModelAnalysis, resume_text: str, job_description: str) -> AnalysisResponse:
    try:
        model = ModelAnalysis.model_validate(model.model_dump(warnings=False))
    except (ValidationError, AttributeError):
        raise AppError(502, "invalid_model_output", "Model did not return a valid analysis.") from None
    resume = normalize_quote(resume_text)
    job = normalize_quote(job_description)
    review = model.resume_review
    for rating in review.ratings.model_dump().values():
        if rating["evidence"] is not None:
            verify_excerpt(rating["evidence"], resume)
        elif rating["rating"] > 0:
            raise AppError(502, "invalid_model_output", "AI quality rating lacks supporting evidence.")
    for finding in review.strengths:
        verify_excerpt(finding.evidence, resume)
    for finding in review.issues:
        if finding.evidence is not None:
            verify_excerpt(finding.evidence, resume)
    if len({section.section for section in review.sections}) != 5:
        raise AppError(502, "invalid_model_output", "Section review is incomplete or duplicated.")
    for section in review.sections:
        if section.status == "not_found":
            if section.evidence is not None:
                raise AppError(502, "invalid_model_output", "Section review contains inconsistent evidence.")
        else:
            verify_excerpt(section.evidence, resume)
    def check_numbers(draft, source):
        numbers = lambda value: set(re.findall(r"\d+(?:[.,]\d+)*(?:%)?", value))
        if numbers(draft) - numbers(source):
            raise AppError(502, "invalid_model_output", "Suggested rewrite introduced unsupported numbers.")
    for rewrite in review.bullet_rewrites:
        verify_excerpt(rewrite.original, resume)
        check_numbers(rewrite.revised, rewrite.original)
    if review.improved_summary:
        check_numbers(review.improved_summary, resume)
    for excerpt in model.resume_summary_evidence:
        verify_excerpt(excerpt, resume)
    for skill in model.detected_skills:
        verify_excerpt(skill.evidence, resume)
    for requirement in model.requirements:
        if not concept_key(requirement.canonical_key) or not concept_key(requirement.requirement):
            raise AppError(502, "invalid_model_output", "Model returned an unusable requirement.")
        verify_excerpt(requirement.job_evidence, job)
        if requirement.status == EvidenceStatus.missing:
            if requirement.evidence is not None:
                raise AppError(502, "invalid_model_output", "Model returned inconsistent requirement evidence.")
        else:
            verify_excerpt(requirement.evidence, resume)
    requirements = deduplicate(model.requirements)
    skills = {skill.skill.casefold(): skill.skill for skill in model.detected_skills}
    return AnalysisResponse(
        resume_summary=model.resume_summary,
        detected_skills=list(skills.values()),
        matched_requirements=[r for r in requirements if r.status == EvidenceStatus.matched],
        missing_requirements=[r for r in requirements if r.status == EvidenceStatus.missing],
        insufficient_evidence_requirements=[r for r in requirements if r.status == EvidenceStatus.insufficient],
        improvement_suggestions=model.improvement_suggestions,
        match_score=calculate_score(requirements),
        ats_score=calculate_ats_score(resume_text),
        resume_review=review,
        ai_quality_score=AIQualityScore(
            value=sum(item["rating"] for item in review.ratings.model_dump().values()) * 5,
            breakdown=review.ratings,
            explanation="Five AI-assessed writing criteria, each rated 0–4 and worth 20 points. Total = sum of ratings × 5. This is subjective writing feedback, not an employer ATS score or hiring prediction. Text extraction can affect judgment.",
        ),
    )


async def analyze_resume(text: str, job_description: str, settings: Settings, provider: AnalysisProvider) -> AnalysisResponse:
    # Regenerate once for a malformed or ungrounded model response. Validate the
    # entire new response again; never discard failed requirements to raise a score.
    # Transient HTTP failures have their own bounded SDK retries in the adapter.
    for attempt in range(2):
        try:
            model = await run_in_threadpool(provider, text, job_description, settings)
            return build_analysis(model, text, job_description)
        except AppError as exc:
            if exc.code != "invalid_model_output":
                raise
            if attempt == 1:
                raise AppError(
                    502, "invalid_model_output",
                    "The AI response could not be verified after one automatic retry. "
                    "Please try again. For job matching, paste the actual job requirements, "
                    "not just a job title. No unverified score was returned.",
                ) from None
