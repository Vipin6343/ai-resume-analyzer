from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_job_matching_service
from app.schemas.job import MatchJobsRequest, MatchJobsResponse
from app.services.job_matching_service import JobMatchingService


router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/match", response_model=MatchJobsResponse)
async def match_jobs(
    request: MatchJobsRequest,
    service: JobMatchingService = Depends(get_job_matching_service),
) -> MatchJobsResponse:
    try:
        return await service.match_jobs(request)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error

