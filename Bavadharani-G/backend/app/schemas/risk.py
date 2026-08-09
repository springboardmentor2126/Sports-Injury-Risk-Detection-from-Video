from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InjuryRiskAssessmentOut(BaseModel):
    id: int
    video_id: int
    acl_risk: float
    hamstring_risk: float
    ankle_sprain_risk: float
    lower_back_risk: float
    overuse_risk: float
    overall_risk_score: float
    risk_category: str
    top_risk_factors: Optional[str] = None
    recommendations: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AthleteDashboardOut(BaseModel):
    total_videos: int
    videos_analyzed: int
    avg_movement_quality_score: Optional[float] = None
    avg_overall_risk_score: Optional[float] = None
    latest_risk_category: Optional[str] = None
    risk_trend: list[float] = []  # overall_risk_score per video, oldest -> newest
