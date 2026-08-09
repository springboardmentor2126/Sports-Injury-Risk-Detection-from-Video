from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AnalysisHistoryCreate(BaseModel):
    user_id: int
    video_id: str | None = None
    video_name: str | None = None
    risk_score: float | None = None
    risk_level: str | None = None
    balance_score: float | None = None
    stability_score: float | None = None
    pose_quality_score: float | None = None
    total_issues: int | None = None
    total_issues_detected: int | None = None
    detected_issues: list[str] | None = None
    recommendations: list[Any] | None = None
    frames_processed: int | None = None
    duration: float | None = None
    processing_status: str | None = None
    analysis_time: datetime | None = None


class AnalysisHistoryResponse(BaseModel):
    history_id: int
    user_id: int
    video_id: str | None = None
    video_name: str | None = None
    risk_score: float | None = None
    risk_level: str | None = None
    balance_score: float | None = None
    stability_score: float | None = None
    pose_quality_score: float | None = None
    total_issues: int | None = None
    total_issues_detected: int | None = None
    detected_issues: list[str] | None = None
    recommendations: list[Any] | None = None
    frames_processed: int | None = None
    duration: float | None = None
    processing_status: str | None = None
    analysis_time: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True
