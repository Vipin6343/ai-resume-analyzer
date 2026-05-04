from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class JobPosting(BaseModel):
    id: str
    title: str
    company: str
    location: str
    employment_type: str
    experience_level: str
    skills: List[str] = Field(default_factory=list)
    description: str


class MatchJobsRequest(BaseModel):
    resume_id: str
    user_id: str = "demo-user"
    limit: int = Field(default=5, ge=1, le=10)
    force_refresh: bool = False


class JobMatch(BaseModel):
    job: JobPosting
    match_score: float = Field(ge=0, le=100)
    matching_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    priority_skills: List[str] = Field(default_factory=list)
    rationale: str


class MatchJobsResponse(BaseModel):
    match_id: str
    resume_id: str
    user_id: str
    matches: List[JobMatch] = Field(default_factory=list)
    created_at: datetime

