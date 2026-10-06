from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class Schema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RequirementKind(str, Enum):
    required = "required"
    preferred = "preferred"


class EvidenceStatus(str, Enum):
    matched = "matched"
    insufficient = "insufficient"
    missing = "missing"


class Requirement(Schema):
    requirement: ShortText
    job_evidence: NonEmptyText = Field(description="Exact excerpt from the job description establishing the requirement.")
    kind: RequirementKind
    status: EvidenceStatus
    evidence: NonEmptyText | None
    explanation: NonEmptyText


class ModelRequirement(Requirement):
    canonical_key: ShortText = Field(description="Normalized concept and threshold, identical for synonymous requirements. Keep distinct levels, durations, and skills separate.")


class DetectedSkill(Schema):
    skill: ShortText
    evidence: NonEmptyText


class QualityRating(Schema):
    rating: int = Field(ge=0, le=4, strict=True)
    explanation: NonEmptyText
    evidence: NonEmptyText | None


class QualityRatings(Schema):
    clarity: QualityRating
    demonstrated_impact: QualityRating
    specificity: QualityRating
    organization: QualityRating
    language: QualityRating


class ReviewFinding(Schema):
    heading: ShortText
    explanation: NonEmptyText
    evidence: NonEmptyText | None
    action: NonEmptyText
    priority: Literal["high", "medium", "low"]


class SectionReview(Schema):
    section: Literal["summary", "experience", "projects", "skills", "education"]
    status: Literal["strong", "needs_detail", "not_found"]
    feedback: NonEmptyText
    evidence: NonEmptyText | None
    suggestion: NonEmptyText


class BulletRewrite(Schema):
    original: NonEmptyText
    revised: NonEmptyText
    reason: NonEmptyText


class ResumeReview(Schema):
    ratings: QualityRatings
    strengths: list[ReviewFinding] = Field(max_length=5)
    issues: list[ReviewFinding] = Field(max_length=8)
    sections: list[SectionReview] = Field(min_length=5, max_length=5)
    bullet_rewrites: list[BulletRewrite] = Field(max_length=4)
    improved_summary: NonEmptyText | None


class AIQualityScore(Schema):
    label: str = "AI-assessed resume quality estimate"
    value: int = Field(ge=0, le=100)
    explanation: str
    breakdown: QualityRatings


class ModelAnalysis(Schema):
    resume_summary: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
    resume_summary_evidence: list[NonEmptyText] = Field(min_length=1, max_length=10)
    detected_skills: list[DetectedSkill] = Field(max_length=100)
    requirements: list[ModelRequirement] = Field(max_length=80)
    improvement_suggestions: list[NonEmptyText] = Field(max_length=15)
    resume_review: ResumeReview


class ScoreBreakdown(Schema):
    matched_weight: int
    total_weight: int
    required_matched: int
    required_total: int
    preferred_matched: int
    preferred_total: int


class MatchScore(Schema):
    label: Literal["application-defined match score"] = "application-defined match score"
    value: float | None = Field(ge=0, le=100)
    explanation: str
    breakdown: ScoreBreakdown


class ATSCheck(Schema):
    check: str
    passed: bool
    points: int
    max_points: int
    explanation: str
    status: Literal["passed", "needs_review", "not_checked"] = "needs_review"
    evidence: list[str] = Field(default_factory=list)
    suggestion: str | None = None


class ATSScore(Schema):
    label: Literal["application-defined ATS-readiness estimate"] = "application-defined ATS-readiness estimate"
    value: int = Field(ge=0, le=100)
    explanation: str
    breakdown: list[ATSCheck]
    improvement_suggestions: list[str]
    rubric_version: str = "2.0"
    assessed_points: int = 0
    possible_points: int = 100
    parsed_fields: dict[str, list[str]] = Field(default_factory=dict)
    text_preview: str = ""
    preview_truncated: bool = False
    limitations: list[str] = Field(default_factory=list)


class PDFDiagnostics(Schema):
    page_count: int
    characters_per_page: list[int]
    pages_without_text: list[int]
    pages_with_images: list[int]


class AnalysisResponse(Schema):
    target_job: str | None = None
    resume_summary: str
    detected_skills: list[str]
    matched_requirements: list[Requirement]
    missing_requirements: list[Requirement]
    insufficient_evidence_requirements: list[Requirement]
    improvement_suggestions: list[str]
    match_score: MatchScore
    ats_score: ATSScore
    ai_quality_score: AIQualityScore
    resume_review: ResumeReview


class ExtractResponse(Schema):
    text: str
    page_count: int
    diagnostics: PDFDiagnostics | None = None


class ErrorDetail(Schema):
    code: str
    message: str


class ErrorResponse(Schema):
    error: ErrorDetail


class CoverLetterResponse(Schema):
    cover_letter: str  # The full cover letter text
    word_count: int


class InterviewQuestion(Schema):
    question: str
    category: str  # e.g. 'Technical', 'Behavioral', 'Experience'
    why: str  # Why this question is likely based on resume/JD


class InterviewQuestionsResponse(Schema):
    questions: list[InterviewQuestion]
    tip: str  # One general interview tip
