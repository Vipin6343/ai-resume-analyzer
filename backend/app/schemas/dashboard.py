from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.job import JobMatch
from app.schemas.resume import AnalyzeResumeResponse, ImproveResumeResponse, UploadResumeResponse


class DashboardStats(BaseModel):
    resume_count: int = 0
    analysis_count: int = 0
    match_count: int = 0
    improvement_count: int = 0


class ActivityItem(BaseModel):
    id: str
    type: str
    title: str
    detail: str
    created_at: datetime


class DashboardResponse(BaseModel):
    user_id: str
    stats: DashboardStats
    latest_resume: Optional[UploadResumeResponse] = None
    latest_analysis: Optional[AnalyzeResumeResponse] = None
    latest_matches: List[JobMatch] = Field(default_factory=list)
    latest_improvement: Optional[ImproveResumeResponse] = None
    activity: List[ActivityItem] = Field(default_factory=list)

