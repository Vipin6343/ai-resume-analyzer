import io
import pytest
from httpx import ASGITransport, AsyncClient
from app.config import Settings
from app.main import create_app
from app.schemas import (
    ColdEmailResponse,
    CustomRewriteResponse,
    LinkedInSummaryResponse,
    RewriteOption,
)


def make_dummy_pdf(text: str = "John Doe\nSoftware Engineer\nPython FastAPI React\njohn@example.com\n2022 - Present") -> io.BytesIO:
    # Minimal PDF structure with valid header and text
    content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 70 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(John Doe Software Engineer Python FastAPI React john@example.com 2022-2024) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000261 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n380\n%%EOF\n"
    return io.BytesIO(content)


@pytest.fixture
def app_with_test_settings():
    settings = Settings(
        provider="gemini",
        gemini_api_key="test-key",
        api_key="test-key",
    )
    return create_app(settings)


@pytest.mark.anyio
async def test_scrape_job_invalid_url(app_with_test_settings):
    async with AsyncClient(transport=ASGITransport(app=app_with_test_settings), base_url="http://test") as client:
        resp = await client.post("/api/v1/jobs/scrape", json={"url": "not-a-valid-url"})
        assert resp.status_code == 400
        data = resp.json()
        assert data["error"]["code"] == "invalid_url"


@pytest.mark.anyio
async def test_rewrite_bullet_empty(app_with_test_settings):
    async with AsyncClient(transport=ASGITransport(app=app_with_test_settings), base_url="http://test") as client:
        resp = await client.post("/api/v1/resumes/rewrite-bullet", data={"bullet": "   "})
        assert resp.status_code == 400
        data = resp.json()
        assert data["error"]["code"] == "invalid_bullet"
