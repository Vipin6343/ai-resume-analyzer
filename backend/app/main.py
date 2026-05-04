import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.resume import router as resume_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.mongo import mongo_manager
from app.db.repositories import ensure_indexes
from app.services.job_matching_service import JobMatchingService


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    settings = get_settings()
    database = await mongo_manager.connect()
    await ensure_indexes(database)

    job_service = JobMatchingService(database)
    seeded = await job_service.seed_jobs()
    logger.info("Seeded %s sample jobs.", seeded)

    try:
        await job_service.ensure_index()
        logger.info("FAISS index is ready.")
    except Exception as error:  # noqa: BLE001
        logger.warning("FAISS index warm-up failed: %s", error)

    yield
    await mongo_manager.disconnect()


settings = get_settings()
app = FastAPI(title=settings.app_name, debug=settings.app_debug, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(resume_router)
app.include_router(jobs_router)
app.include_router(dashboard_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
