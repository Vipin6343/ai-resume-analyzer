from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.dependencies import get_analysis_service, get_improvement_service, get_resume_service
from app.schemas.resume import (
    AnalyzeResumeRequest,
    AnalyzeResumeResponse,
    ImproveResumeRequest,
    ImproveResumeResponse,
    UploadResumeResponse,
)
from app.services.analysis_service import AnalysisService
from app.services.improvement_service import ImprovementService
from app.services.resume_service import ResumeService


router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("/upload", response_model=UploadResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    user_id: str = Form(default="demo-user"),
    file: UploadFile = File(...),
    service: ResumeService = Depends(get_resume_service),
) -> UploadResumeResponse:
    return await service.upload_resume(user_id=user_id, file=file)


@router.post("/analyze", response_model=AnalyzeResumeResponse)
async def analyze_resume(
    request: AnalyzeResumeRequest,
    service: AnalysisService = Depends(get_analysis_service),
) -> AnalyzeResumeResponse:
    try:
        return await service.analyze_resume(request)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error


@router.post("/improve", response_model=ImproveResumeResponse)
async def improve_resume(
    request: ImproveResumeRequest,
    service: ImprovementService = Depends(get_improvement_service),
) -> ImproveResumeResponse:
    try:
        return await service.improve_resume(request)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error

