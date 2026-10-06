from unittest.mock import Mock

import pytest

from app.ats import calculate_ats_score
from app.routes import get_provider
from app.schemas import PDFDiagnostics


def test_full_rubric():
    text = "candidate@example.test +91 9876543210\nSkills\nPython, SQL\nProjects\nBuilt a Python application using SQL and tested its API endpoints.\nEducation\nComputer science 2025."
    result = calculate_ats_score(text, PDFDiagnostics(page_count=1, characters_per_page=[len(text)], pages_without_text=[], pages_with_images=[]))
    assert result.value == 100
    assert all(check.passed for check in result.breakdown)
    assert result.improvement_suggestions == []
    assert "not an employer ATS score" in result.explanation


def test_no_signals_scores_zero():
    result = calculate_ats_score("Short text")
    assert result.value == 0
    assert len(result.breakdown) == 10
    assert result.possible_points == 90


def test_prose_does_not_count_as_section_heading():
    result = calculate_ats_score("My skills and education improved through experience.")
    assert result.value == 0


def test_garbled_text_fails_readability_check():
    result = calculate_ats_score("x" * 150 + "\ufffd")
    assert not next(c for c in result.breakdown if c.check == "text_encoding").passed


def test_target_job_and_two_scores(client, app, pdf_factory, sample_model, job):
    app.dependency_overrides[get_provider] = lambda: Mock(return_value=sample_model)
    response = client.post("/api/v1/resumes/analyze",
        files={"file": ("resume.pdf", pdf_factory(), "application/pdf")},
        data={"target_job": "  AI Backend Developer  ", "job_description": job})
    assert response.status_code == 200
    data = response.json()
    assert data["target_job"] == "AI Backend Developer"
    assert data["match_score"]["value"] == 40
    assert data["ats_score"]["value"] == 10
    assert len(data["ats_score"]["breakdown"]) == 10


def test_empty_headings_do_not_count_as_content():
    result = calculate_ats_score("Skills\nExperience\nEducation")
    assert not any(c.passed for c in result.breakdown if c.check.endswith("_content"))


def test_inline_sections_and_date_detection():
    result = calculate_ats_score("Skills: Python, SQL\nProjects: Built an API in 2025\nEducation: BSc 2024")
    assert "skills" in result.parsed_fields["recognized_sections"]
    assert "2025" in result.parsed_fields["date_tokens"]
    assert next(c for c in result.breakdown if c.check == "skills_content").passed


def test_unknown_pdf_metadata_is_not_marked_passed():
    check = next(c for c in calculate_ats_score("text").breakdown if c.check == "text_on_each_page")
    assert check.status == "not_checked"
    assert check.max_points == 0


def test_mixed_pdf_pages_warn_and_lose_coverage_points():
    result = calculate_ats_score("Some text", PDFDiagnostics(page_count=2,
        characters_per_page=[9,0],pages_without_text=[2],pages_with_images=[2]))
    check = next(c for c in result.breakdown if c.check == "text_on_each_page")
    assert check.status == "needs_review"
    assert check.points == 0
    assert "2" in check.explanation


def test_ats_endpoint_never_calls_provider(client, app, pdf_factory):
    provider = Mock(side_effect=AssertionError("ATS check must not call AI"))
    app.dependency_overrides[get_provider] = lambda: provider
    response = client.post("/api/v1/resumes/ats-check", files={"file":("resume.pdf",pdf_factory(),"application/pdf")})
    assert response.status_code == 200
    assert response.json()["rubric_version"] == "2.0"
    assert response.json()["text_preview"]
    provider.assert_not_called()


@pytest.mark.parametrize("target", [" ", "x" * 201])
def test_invalid_target_job(client, app, pdf_factory, job, target):
    provider = Mock()
    app.dependency_overrides[get_provider] = lambda: provider
    response = client.post("/api/v1/resumes/analyze",
        files={"file": ("resume.pdf", pdf_factory(), "application/pdf")},
        data={"target_job": target, "job_description": job})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_target_job"
    provider.assert_not_called()
