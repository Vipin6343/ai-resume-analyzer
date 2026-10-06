from io import BytesIO
from pypdf import PdfReader
from fastapi import UploadFile
from starlette.concurrency import run_in_threadpool
from .config import MAX_PAGES, MAX_RESUME_CHARS, MAX_UPLOAD_BYTES
from .errors import AppError
from .schemas import ExtractResponse, PDFDiagnostics


async def extract_pdf(upload: UploadFile) -> ExtractResponse:
    if upload.content_type not in ("application/pdf", "application/octet-stream"):
        raise AppError(400, "invalid_pdf", "Upload a PDF file.")
    data = await upload.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise AppError(413, "pdf_too_large", "PDF must be at most 5 MB.")
    if not data:
        raise AppError(400, "empty_pdf", "Uploaded PDF is empty.")
    if not data.startswith(b"%PDF-"):
        raise AppError(400, "invalid_pdf", "File is not a valid PDF.")
    return await run_in_threadpool(_parse_pdf, data)


def _parse_pdf(data: bytes) -> ExtractResponse:
    try:
        reader = PdfReader(BytesIO(data), strict=True)
        if reader.is_encrypted:
            raise AppError(400, "encrypted_pdf", "Encrypted PDFs are not supported.")
        count = len(reader.pages)
        if count == 0:
            raise AppError(400, "empty_pdf", "PDF has no pages.")
        if count > MAX_PAGES:
            raise AppError(413, "too_many_pages", "PDF must have at most 10 pages.")
        parts = []
        length = 0
        image_pages = []
        for index, page in enumerate(reader.pages, start=1):
            part = page.extract_text() or ""
            length += len(part) + (1 if parts else 0)
            if length > MAX_RESUME_CHARS:
                raise AppError(413, "resume_text_too_long", "Extracted resume text exceeds 30,000 characters.")
            parts.append(part)
            resources = page.get("/Resources", {})
            if hasattr(resources, "get_object"):
                resources = resources.get_object()
            objects = resources.get("/XObject", {})
            if hasattr(objects, "get_object"):
                objects = objects.get_object()
            if any(obj.get_object().get("/Subtype") == "/Image" for obj in objects.values()):
                image_pages.append(index)
        result = "\n".join(parts).strip()
        if not result:
            raise AppError(422, "no_extractable_text", "No extractable text found. Scanned or image-only PDFs need OCR, which is not supported in this version.")
        return ExtractResponse(text=result, page_count=count, diagnostics=PDFDiagnostics(
            page_count=count, characters_per_page=[len(part.strip()) for part in parts],
            pages_without_text=[i for i, part in enumerate(parts, start=1) if not part.strip()],
            pages_with_images=image_pages,
        ))
    except AppError:
        raise
    except Exception:
        raise AppError(400, "invalid_pdf", "PDF is malformed or cannot be parsed.") from None
