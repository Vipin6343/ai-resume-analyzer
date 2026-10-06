from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app.config import Settings
from app.main import create_app
from app.schemas import ModelAnalysis


@pytest.fixture
def pdf_factory():
    def make(text="Python developer. Built REST APIs.", pages=1, encrypted=False):
        writer = PdfWriter()
        for _ in range(pages):
            page = writer.add_blank_page(width=600, height=800)
            if text:
                font = DictionaryObject({
                    NameObject("/Type"): NameObject("/Font"),
                    NameObject("/Subtype"): NameObject("/Type1"),
                    NameObject("/BaseFont"): NameObject("/Helvetica"),
                })
                page[NameObject("/Resources")] = DictionaryObject({
                    NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})
                })
                stream = DecodedStreamObject()
                encoded = text.encode("ascii").hex().encode("ascii")
                stream.set_data(b"BT /F1 12 Tf 20 750 Td <" + encoded + b"> Tj ET")
                page[NameObject("/Contents")] = writer._add_object(stream)
        if encrypted:
            writer.encrypt("test-password")
        output = BytesIO()
        writer.write(output)
        return output.getvalue()
    return make


@pytest.fixture
def sample_model():
    return ModelAnalysis.model_validate({
        "resume_summary": "Developer with Python and REST API experience.",
        "resume_summary_evidence": ["Python developer.", "Built REST APIs."],
        "detected_skills": [{"skill": "Python", "evidence": "Python developer."}],
        "requirements": [
            {"requirement": "Python", "canonical_key": "python", "job_evidence": "Python required",
             "kind": "required", "status": "matched", "evidence": "Python developer.",
             "explanation": "Python is explicitly listed."},
            {"requirement": "AWS", "canonical_key": "aws", "job_evidence": "AWS required",
             "kind": "required", "status": "missing", "evidence": None,
             "explanation": "Not evidenced in the resume."},
            {"requirement": "Five years of REST API experience", "canonical_key": "rest api experience 5 years",
             "job_evidence": "Five years of REST API experience preferred",
             "kind": "preferred", "status": "insufficient", "evidence": "Built REST APIs.",
             "explanation": "API experience is mentioned, but its duration is not established."},
        ],
        "improvement_suggestions": ["If accurate, add the duration of your REST API experience."],
        "resume_review": {
            "ratings": {name: {"rating": 2, "explanation": "Some specifics, but limited detail.",
                "evidence": "Built REST APIs."} for name in
                ("clarity", "demonstrated_impact", "specificity", "organization", "language")},
            "strengths": [{"heading": "Concrete technology", "explanation": "Python is named.",
                "evidence": "Python developer.", "action": "Keep the skill specific.", "priority": "low"}],
            "issues": [{"heading": "Limited project context", "explanation": "Scope is unclear.",
                "evidence": "Built REST APIs.", "action": "If accurate, describe what the API serves.", "priority": "high"}],
            "sections": [{"section": section, "status": "not_found", "feedback": "No section heading found.",
                "evidence": None, "suggestion": "Add a clear heading if applicable."}
                for section in ("summary", "experience", "projects", "skills", "education")],
            "bullet_rewrites": [{"original": "Built REST APIs.", "revised": "Developed REST APIs.",
                "reason": "Concise alternative wording."}],
            "improved_summary": "Python developer with REST API experience."
        },
    })


@pytest.fixture
def job():
    return "Python required. AWS required. Five years of REST API experience preferred."


@pytest.fixture
def app():
    return create_app(Settings(api_key=""))


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client
