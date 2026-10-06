import asyncio
from io import BytesIO
from threading import get_ident

from starlette.datastructures import Headers, UploadFile

from app import pdf
from app.config import MAX_REQUEST_BYTES
from app.middleware import RequestSafetyMiddleware


def test_chunked_request_limit_without_content_length():
    responses = []
    chunks = iter([
        {"type": "http.request", "body": b"x" * MAX_REQUEST_BYTES, "more_body": True},
        {"type": "http.request", "body": b"x", "more_body": False},
    ])

    async def receive():
        return next(chunks)

    async def send(message):
        responses.append(message)

    async def downstream(*_args):
        raise AssertionError("Oversized body must never reach multipart parsing")

    asyncio.run(RequestSafetyMiddleware(downstream)(
        {"type": "http", "method": "POST", "headers": []}, receive, send
    ))
    assert responses[0]["status"] == 413
    assert b"request_too_large" in responses[1]["body"]


def test_pdf_processing_runs_outside_event_loop(pdf_factory, monkeypatch):
    original = pdf._parse_pdf
    worker_threads = []

    def track(data):
        worker_threads.append(get_ident())
        return original(data)

    monkeypatch.setattr(pdf, "_parse_pdf", track)

    async def run():
        loop_thread = get_ident()
        upload = UploadFile(BytesIO(pdf_factory()), headers=Headers({"content-type": "application/pdf"}))
        try:
            result = await pdf.extract_pdf(upload)
        finally:
            await upload.close()
        assert result.page_count == 1
        assert worker_threads[0] != loop_thread
    asyncio.run(run())
