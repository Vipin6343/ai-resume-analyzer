from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ParsedResume(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)
    education: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    raw_sections: dict[str, str] = Field(default_factory=dict)


class UploadResumeResponse(BaseModel):
    resume_id: str
    user_id: str
    file_name: str
    raw_text_preview: str
    parsed_resume: ParsedResume
    created_at: datetime


class AnalyzeResumeRequest(BaseModel):
    resume_id: str
    user_id: str = "demo-user"
    target_job_titles: List[str] = Field(default_factory=list)
    force_refresh: bool = False


class SectionFeedback(BaseModel):
    section: str
    feedback: str


class ResumeAnalysis(BaseModel):
    score: int = Field(ge=0, le=100)
    resume_summary: str
    extracted_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    ats_readiness: str
    section_feedback: List[SectionFeedback] = Field(default_factory=list)


class AnalyzeResumeResponse(BaseModel):
    analysis_id: str
    resume_id: str
    user_id: str
    cached: bool = False
    analysis: ResumeAnalysis
    created_at: datetime


class ImproveResumeRequest(BaseModel):
    resume_id: str
    user_id: str = "demo-user"
    target_job_title: Optional[str] = None
    focus_areas: List[str] = Field(default_factory=list)
    force_refresh: bool = False


class ResumeImprovement(BaseModel):
    headline: str
    professional_summary: str
    improved_experience_bullets: List[str] = Field(default_factory=list)
    improved_project_bullets: List[str] = Field(default_factory=list)
    skills_to_emphasize: List[str] = Field(default_factory=list)
    ats_keywords: List[str] = Field(default_factory=list)
    final_tips: List[str] = Field(default_factory=list)


class ImproveResumeResponse(BaseModel):
    improvement_id: str
    resume_id: str
    user_id: str
    cached: bool = False
    improvement: ResumeImprovement
    created_at: datetime

