from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VideoOut(BaseModel):
    id: int
    original_filename: str
    activity_type: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BiomechanicsReportOut(BaseModel):
    id: int
    video_id: int
    frames_analyzed: int
    frames_with_person_detected: int
    detection_rate: float
    avg_left_knee_angle: Optional[float] = None
    avg_right_knee_angle: Optional[float] = None
    knee_angle_asymmetry: Optional[float] = None
    avg_trunk_lean_angle: Optional[float] = None
    avg_left_hip_angle: Optional[float] = None
    avg_right_hip_angle: Optional[float] = None
    movement_quality_score: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
