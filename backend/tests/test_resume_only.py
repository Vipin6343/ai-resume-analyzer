from unittest.mock import Mock

from app.routes import get_provider


def test_resume_only_upload_does_not_require_job(client, app, pdf_factory, sample_model):
    sample_model.requirements = []
    provider = Mock(return_value=sample_model)
    app.dependency_overrides[get_provider] = lambda: provider
    response = client.post("/api/v1/resumes/analyze",
        files={"file": ("resume.pdf", pdf_factory(), "application/pdf")})
    assert response.status_code == 200
    result = response.json()
    assert result["resume_summary"]
    assert result["detected_skills"] == ["Python"]
    assert result["improvement_suggestions"]
    assert result["ats_score"]["value"] is not None
    assert result["match_score"]["value"] is None
    assert provider.call_args.args[1] == ""
