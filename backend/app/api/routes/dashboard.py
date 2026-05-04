from fastapi import APIRouter, Depends

from app.api.dependencies import get_dashboard_service
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import DashboardService


router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    user_id: str = "demo-user",
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardResponse:
    return await service.get_dashboard(user_id)


@router.delete("/dashboard/reset", response_model=DashboardResponse)
async def reset_dashboard(
    user_id: str = "demo-user",
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardResponse:
    return await service.reset_dashboard(user_id)
