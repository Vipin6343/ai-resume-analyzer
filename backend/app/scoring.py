"""Deterministic weighting; no provider calls or model-generated scores."""

from .schemas import EvidenceStatus, MatchScore, Requirement, RequirementKind, ScoreBreakdown


def calculate_score(requirements: list[Requirement]) -> MatchScore:
    required = [r for r in requirements if r.kind == RequirementKind.required]
    preferred = [r for r in requirements if r.kind == RequirementKind.preferred]
    required_matched = sum(r.status == EvidenceStatus.matched for r in required)
    preferred_matched = sum(r.status == EvidenceStatus.matched for r in preferred)
    matched_weight = 2 * required_matched + preferred_matched
    total_weight = 2 * len(required) + len(preferred)
    return MatchScore(
        value=round(100 * matched_weight / total_weight, 2) if total_weight else None,
        explanation=(
            "100 x matched requirement weights / total requirement weights. "
            "Required requirements weigh 2; preferred requirements weigh 1. "
            "Only verified, evidenced matches count. Requirement extraction and matching "
            "use LLM judgment; this is not an employer ATS score or hiring prediction."
            if total_weight else
            "No usable explicit job requirements were found; a score cannot be calculated."
        ),
        breakdown=ScoreBreakdown(
            matched_weight=matched_weight, total_weight=total_weight,
            required_matched=required_matched, required_total=len(required),
            preferred_matched=preferred_matched, preferred_total=len(preferred),
        ),
    )
