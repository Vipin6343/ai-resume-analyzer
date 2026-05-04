from fastapi import Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_database
from app.services.analysis_service import AnalysisService
from app.services.dashboard_service import DashboardService
from app.services.improvement_service import ImprovementService
from app.services.job_matching_service import JobMatchingService
from app.services.resume_service import ResumeService


def get_resume_service(database: AsyncIOMotorDatabase = Depends(get_database)) -> ResumeService:
    return ResumeService(database)


def get_analysis_service(database: AsyncIOMotorDatabase = Depends(get_database)) -> AnalysisService:
    return AnalysisService(database)


def get_job_matching_service(database: AsyncIOMotorDatabase = Depends(get_database)) -> JobMatchingService:
    return JobMatchingService(database)


def get_improvement_service(database: AsyncIOMotorDatabase = Depends(get_database)) -> ImprovementService:
    return ImprovementService(database)


def get_dashboard_service(database: AsyncIOMotorDatabase = Depends(get_database)) -> DashboardService:
    return DashboardService(database)

