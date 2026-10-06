import pytest

from app.analysis import build_analysis
from app.errors import AppError


def test_quality_score_and_review(sample_model, job):
    result = build_analysis(sample_model, "Python developer. Built REST APIs.", job)
    assert result.ai_quality_score.value == 50
    assert len(result.resume_review.sections) == 5
    assert result.resume_review.bullet_rewrites[0].revised == "Developed REST APIs."


@pytest.mark.parametrize("mutation", ["new_number", "false_quote", "duplicate_section", "rating_no_evidence"])
def test_review_rejects_unsupported_content(sample_model, job, mutation):
    review = sample_model.resume_review
    if mutation == "new_number":
        review.bullet_rewrites[0].revised = "Developed 40 REST APIs."
    elif mutation == "false_quote":
        review.strengths[0].evidence = "Managed global infrastructure."
    elif mutation == "duplicate_section":
        review.sections[1].section = review.sections[0].section
    else:
        review.ratings.clarity.evidence = None
    with pytest.raises(AppError) as exc:
        build_analysis(sample_model, "Python developer. Built REST APIs.", job)
    assert exc.value.code == "invalid_model_output"
