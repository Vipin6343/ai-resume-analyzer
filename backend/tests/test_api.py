from unittest.mock import Mock

import pytest

from app.config import MAX_JOB_CHARS, MAX_REQUEST_BYTES, MAX_UPLOAD_BYTES
from app.errors import AppError
from app.routes import get_provider


def upload(data, name="resume.pdf", content_type="application/pdf"):
    return {"file": (name, data, content_type)}


def test_health_never_calls_provider(client, app):
    provider = Mock(side_effect=AssertionError("Provider must not be called"))
    app.dependency_overrides[get_provider] = lambda: provider
    response = client.get("/health")
    assert response.json() == {"status": "ok"}
    provider.assert_not_called()


def test_real_pdf_extraction(client, pdf_factory):
    response = client.post("/api//resumes/extract", files=upload(pdf_factory(pages=2), name="renamed.txt"))
    assert response.status_code == 200
    assert response.json()["page_count"] == 2
    assert response.json()["text"].count("Python developer.") == 2
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("data,content_type,code,status", [
    (b"", "application/pdf", "empty_pdf", 400),
    (b"not a PDF", "application/pdf", "invalid_pdf", 400),
    (b"%PDF-broken", "application/pdf", "invalid_pdf", 400),
    (b"hello", "text/plain", "invalid_pdf", 400),
])
def test_bad_uploads(client, data, content_type, code, status):
    response = client.post("/api//resumes/extract", files=upload(data, content_type=content_type))
    assert response.status_code == status
    assert response.json()["error"]["code"] == code


@pytest.mark.parametrize("kwargs,code,status", [
    ({"encrypted": True}, "encrypted_pdf", 400),
    ({"pages": 0}, "empty_pdf", 400),
    ({"text": ""}, "no_extractable_text", 422),
    ({"pages": 11}, "too_many_pages", 413),
    ({"text": "x" * 30001}, "resume_text_too_long", 413),
])
def test_pdf_errors(client, pdf_factory, kwargs, code, status):
    response = client.post("/api//resumes/extract", files=upload(pdf_factory(**kwargs)))
    assert response.status_code == status
    assert response.json()["error"]["code"] == code
    if code == "no_extractable_text":
        assert "OCR" in response.json()["error"]["message"]


def test_limits_accept_boundaries(client, pdf_factory):
    data = pdf_factory(pages=10)
    data += b" " * (MAX_UPLOAD_BYTES - len(data))
    response = client.post("/api//resumes/extract", files=upload(data))
    assert response.status_code == 200
    assert response.json()["page_count"] == 10
    response = client.post("/api//resumes/extract", files=upload(data + b"x"))
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "pdf_too_large"


def test_resume_character_limit_includes_page_separators(client, pdf_factory):
    response = client.post("/api//resumes/extract", files=upload(pdf_factory(text="x" * 15000, pages=2)))
    assert response.json()["error"]["code"] == "resume_text_too_long"
    response = client.post("/api//resumes/extract", files=upload(pdf_factory(text="x" * 30000)))
    assert response.status_code == 200


@pytest.mark.parametrize("job,code,status", [
    (" ", "invalid_job_description", 400),
    ("x" * (MAX_JOB_CHARS + 1), "job_description_too_long", 413),
])
def test_job_validation_before_provider(client, app, pdf_factory, job, code, status):
    provider = Mock()
    app.dependency_overrides[get_provider] = lambda: provider
    response = client.post("/api//resumes/analyze", files=upload(pdf_factory()), data={"job_description": job})
    assert response.status_code == status
    assert response.json()["error"]["code"] == code
    provider.assert_not_called()


def test_missing_fields_and_malformed_multipart(client):
    assert client.post("/api//resumes/analyze").json()["error"]["code"] == "invalid_input"
    response = client.post("/api//resumes/extract", content=b"invalid", headers={"content-type": "multipart/form-data"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_input"


def test_analyze_complete_pipeline_with_mocked_provider(client, app, pdf_factory, sample_model, job):
    provider = Mock(return_value=sample_model)
    app.dependency_overrides[get_provider] = lambda: provider
    response = client.post("/api//resumes/analyze", files=upload(pdf_factory()), data={"job_description": job})
    assert response.status_code == 200
    body = response.json()
    assert body["match_score"]["value"] == 40
    assert body["match_score"]["breakdown"]["total_weight"] == 5
    assert body["detected_skills"] == ["Python"]
    assert len(body["matched_requirements"]) == 1
    assert len(body["insufficient_evidence_requirements"]) == 1
    assert body["missing_requirements"][0]["explanation"].startswith("Not evidenced in the resume.")
    assert "canonical_key" not in body["matched_requirements"][0]
    assert "Python developer." in provider.call_args.args[0]
    assert provider.call_args.args[1] == job


def test_no_key_still_allows_extraction_and_health(client, pdf_factory, job):
    response = client.post("/api//resumes/analyze", files=upload(pdf_factory()), data={"job_description": job})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "missing_configuration"
    assert client.get("/health").status_code == 200


@pytest.mark.parametrize("error,status,code", [
    (AppError(429, "provider_rate_limited", "Try again later."), 429, "provider_rate_limited"),
    (AppError(503, "provider_unavailable", "Unavailable."), 503, "provider_unavailable"),
    (RuntimeError("PRIVATE-RESUME-CONTENT"), 500, "internal_error"),
])
def test_safe_provider_errors(client, app, pdf_factory, job, caplog, error, status, code):
    app.dependency_overrides[get_provider] = lambda: Mock(side_effect=error)
    response = client.post("/api//resumes/analyze", files=upload(pdf_factory()), data={"job_description": job})
    assert response.status_code == status
    assert response.json()["error"]["code"] == code
    assert "PRIVATE-RESUME-CONTENT" not in response.text + caplog.text


def test_request_limit_and_cors(client):
    response = client.post("/api//resumes/extract", content=b"x" * (MAX_REQUEST_BYTES + 1),
                           headers={"origin": "http://localhost:3000"})
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "request_too_large"
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_does_not_allow_other_origins(client):
    response = client.options("/api//resumes/analyze", headers={
        "origin": "https://unconfigured.example", "access-control-request-method": "POST"
    })
    assert "access-control-allow-origin" not in response.headers


def test_upload_temp_files_closed(client, pdf_factory, monkeypatch, job):
    import starlette.formparsers
    original = starlette.formparsers.SpooledTemporaryFile
    created = []

    def track(*args, **kwargs):
        result = original(*args, **kwargs)
        created.append(result)
        return result

    monkeypatch.setattr(starlette.formparsers, "SpooledTemporaryFile", track)
    data = pdf_factory() + b" " * (1024 * 1024 + 1)
    client.post("/api/resumes/extract", files=upload(data))
    client.post("/api/resumes/analyze", files=upload(data), data={"job_description": " "})
    client.post("/api/resumes/analyze", files=upload(data), data={"job_description": job})
    assert len(created) == 3
    assert all(item.closed for item in created)


def test_openapi_documents_success_and_error_schemas(client):
    schema = client.get("/openapi.json").json()
    operation = schema["paths"]["/api/v1/resumes/analyze"]["post"]
    assert "multipart/form-data" in operation["requestBody"]["content"]
    assert operation["responses"]["502"]["content"]["application/json"]["schema"]["$ref"].endswith("ErrorResponse")
