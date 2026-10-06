import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.exceptions import HTTPException

from .config import Settings
from .errors import AppError, app_error_handler
from .middleware import RequestSafetyMiddleware
from .routes import router


def create_app(settings: Settings | None = None) -> FastAPI:
    # SDK/parser debug messages can contain input data or raw response bodies.
    for name in ("openai", "httpx", "httpcore", "pypdf", "python_multipart", "multipart"):
        logger = logging.getLogger(name)
        logger.handlers = [logging.NullHandler()]
        logger.propagate = False
        logger.setLevel(logging.CRITICAL + 1)
    if settings is None:
        try:
            settings = Settings.from_env()
        except ValidationError:
            raise RuntimeError("Invalid backend configuration. Check timeout, retries, and model settings.") from None
    application = FastAPI(title="AI Resume Analyzer + Job Matcher", version="0.1.0")
    application.state.settings = settings
    application.add_exception_handler(AppError, app_error_handler)

    @application.exception_handler(RequestValidationError)
    async def validation_error(_request, _exc):
        return JSONResponse(status_code=422, content={
            "error": {"code": "invalid_input", "message": "Required multipart fields are missing or invalid."}
        })

    @application.exception_handler(HTTPException)
    async def http_error(_request, exc):
        messages = {
            400: ("invalid_input", "Multipart request could not be parsed."),
            404: ("not_found", "Endpoint not found."),
            405: ("method_not_allowed", "Method not allowed."),
        }
        code, message = messages.get(exc.status_code, ("invalid_input", "Request could not be processed."))
        return JSONResponse(status_code=exc.status_code, headers=exc.headers, content={
            "error": {"code": code, "message": message}
        })

    application.include_router(router)
    application.add_middleware(RequestSafetyMiddleware)
    # Outer CORS middleware also decorates upload-limit and provider-error responses.
    application.add_middleware(
        CORSMiddleware, allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST"], allow_headers=["Content-Type"], allow_credentials=False,
    )
    return application


app = create_app()
