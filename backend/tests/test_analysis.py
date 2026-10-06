import pytest
from pydantic import ValidationError

from app.analysis import build_analysis, concept_key
from app.errors import AppError
from app.schemas import EvidenceStatus, ModelRequirement, RequirementKind


RESUME = "Python developer. Built REST APIs."


def test_weighted_score(sample_model, job):
    response = build_analysis(sample_model, RESUME, job)
    assert response.match_score.value == 40
    assert response.match_score.label == "application-defined match score"
    assert response.match_score.breakdown.model_dump() == {
        "matched_weight": 2, "total_weight": 5,
        "required_matched": 1, "required_total": 2,
        "preferred_matched": 0, "preferred_total": 1,
    }


def test_empty_requirements_return_null(sample_model, job):
    sample_model.requirements = []
    score = build_analysis(sample_model, RESUME, job).match_score
    assert score.value is None
    assert score.breakdown.total_weight == 0
    assert "No usable" in score.explanation


@pytest.mark.parametrize("status,expected", [("matched", 100), ("missing", 0), ("insufficient", 0)])
def test_only_evidenced_matches_count(sample_model, job, status, expected):
    sample_model.requirements = sample_model.requirements[:1]
    sample_model.requirements[0].status = EvidenceStatus(status)
    sample_model.requirements[0].evidence = None if status == "missing" else "Python"
    assert build_analysis(sample_model, RESUME, job).match_score.value == expected


def test_preferred_weight_and_rounding(sample_model, job):
    sample_model.requirements = [sample_model.requirements[0], sample_model.requirements[2]]
    assert build_analysis(sample_model, RESUME, job).match_score.value == 66.67


def test_aliases_and_punctuation_do_not_inflate_score(sample_model, job):
    duplicate = sample_model.requirements[0].model_copy(deep=True)
    duplicate.requirement = "Python programming."
    duplicate.canonical_key = "PYTHON."
    sample_model.requirements.extend([duplicate, duplicate.model_copy(deep=True)])
    result = build_analysis(sample_model, RESUME, job)
    assert result.match_score.value == 40
    assert len(result.matched_requirements) == 1


def test_conflicting_duplicates_keep_required_and_weakest_status(sample_model, job):
    sample_model.requirements = sample_model.requirements[:1]
    duplicate = sample_model.requirements[0].model_copy(deep=True)
    duplicate.kind = RequirementKind.preferred
    duplicate.status = EvidenceStatus.insufficient
    sample_model.requirements.append(duplicate)
    result = build_analysis(sample_model, RESUME, job)
    assert result.match_score.value == 0
    assert result.match_score.breakdown.total_weight == 2
    assert result.insufficient_evidence_requirements[0].kind == "required"


def test_distinct_technology_names_remain_distinct():
    assert len({concept_key(name) for name in ("C", "C++", "C#", ".NET", "NET")}) == 5


@pytest.mark.parametrize("field,value", [
    ("evidence", "Invented experience"),
    ("evidence", "python developer."),
    ("evidence", "   "),
    ("evidence", None),
    ("job_evidence", "PhD required"),
    ("canonical_key", "..."),
])
def test_invalid_requirement_evidence_rejected(sample_model, job, field, value):
    setattr(sample_model.requirements[0], field, value)
    with pytest.raises(AppError) as exc:
        build_analysis(sample_model, RESUME, job)
    assert exc.value.code == "invalid_model_output"


def test_validate_duplicates_before_discarding(sample_model, job):
    duplicate = sample_model.requirements[0].model_copy(deep=True)
    duplicate.evidence = "Made up"
    sample_model.requirements.append(duplicate)
    with pytest.raises(AppError):
        build_analysis(sample_model, RESUME, job)


@pytest.mark.parametrize("target", ["summary", "skill"])
def test_summary_and_skill_excerpts_checked(sample_model, job, target):
    if target == "summary":
        sample_model.resume_summary_evidence = ["Invented achievement"]
    else:
        sample_model.detected_skills[0].evidence = "Invented skill"
    with pytest.raises(AppError):
        build_analysis(sample_model, RESUME, job)


def test_whitespace_normalization_allows_pdf_line_wrapping(sample_model, job):
    assert build_analysis(sample_model, "Python\ndeveloper. Built\tREST APIs.", job).match_score.value == 40


def test_missing_wording_is_application_owned_and_does_not_mutate_input(sample_model, job):
    before = sample_model.model_dump()
    result = build_analysis(sample_model, RESUME, job)
    assert result.missing_requirements[0].explanation.startswith("Not evidenced in the resume.")
    assert sample_model.model_dump() == before


def test_model_rejects_extra_fields(sample_model):
    data = sample_model.requirements[0].model_dump()
    data["score"] = 100
    with pytest.raises(ValidationError):
        ModelRequirement.model_validate(data)
