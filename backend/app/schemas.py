from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


# ---------------------------------------------------------------------------
# Auth / User
# ---------------------------------------------------------------------------
# Single-athlete scope: this app no longer supports coach/physiotherapist/
# sports_scientist/admin accounts or the staff-viewing endpoints that went
# with them. Every registered user IS an athlete -- crud.create_user()
# hardcodes role="athlete" regardless of what's posted here. The `role`
# column stays on models.User (harmless, no migration needed) purely so
# existing rows/tooling that reference it don't break.

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Athlete Profile
# ---------------------------------------------------------------------------

class AthleteBase(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    sport: Optional[str] = None
    position: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    injury_history: Optional[str] = None
    training_load: Optional[str] = None


class AthleteCreate(AthleteBase):
    pass


class AthleteUpdate(AthleteBase):
    """All fields optional on purpose -- this is what makes PUT/PATCH a
    real partial update instead of forcing every field to be resent."""
    pass


class AthleteResponse(AthleteBase):
    athlete_id: UUID
    user_id: UUID

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Video / Pose / Biomechanics (Milestone 2)
# ---------------------------------------------------------------------------

class VideoResponse(BaseModel):
    video_id: UUID
    athlete_id: UUID
    file_name: str
    upload_date: datetime
    status: str
    error_message: Optional[str] = None
    has_annotated_video: bool = False

    class Config:
        from_attributes = True


class FrameMetricsResponse(BaseModel):
    frame_number: int
    left_knee_angle: Optional[float] = None
    right_knee_angle: Optional[float] = None
    left_elbow_angle: Optional[float] = None
    right_elbow_angle: Optional[float] = None
    left_hip_angle: Optional[float] = None
    right_hip_angle: Optional[float] = None
    trunk_lean_deg: Optional[float] = None
    knee_valgus_proxy: Optional[float] = None
    knee_symmetry_diff: Optional[float] = None


class BiomechanicsSummaryResponse(BaseModel):
    frames_analyzed: int
    frames_with_detection: int
    avg_left_knee_angle: Optional[float] = None
    avg_right_knee_angle: Optional[float] = None
    avg_trunk_lean_deg: Optional[float] = None
    left_knee_rom: Optional[float] = None
    right_knee_rom: Optional[float] = None
    knee_rom_asymmetry: Optional[float] = None
    peak_knee_valgus_proxy: Optional[float] = None


class VideoDetailResponse(VideoResponse):
    biomechanics_summary: Optional[BiomechanicsSummaryResponse] = None
    risk_assessment: Optional["RiskAssessmentResponse"] = None


# ---------------------------------------------------------------------------
# Injury Risk Prediction & Recommendations (Milestone 3)
# ---------------------------------------------------------------------------
# Shaped to match models.InjuryPrediction / models.Recommendation field-for-
# field (see models.py) -- this is what a persisted row looks like once
# services/injury_risk.py's RiskAssessment has been written to the DB by
# routers/video.py.

class RiskFactorResponse(BaseModel):
    key: str
    label: str
    points: float
    detail: str


class RecommendationResponse(BaseModel):
    posture_correction: Optional[str] = None
    exercise_plan: Optional[str] = None
    recovery_plan: Optional[str] = None

    class Config:
        from_attributes = True


class RiskAssessmentResponse(BaseModel):
    prediction_id: UUID
    injury_type: str
    risk_score: float
    risk_level: str  # "Low" | "Moderate" | "High" | "Critical"
    factors: list[RiskFactorResponse] = []
    recommendation: Optional[RecommendationResponse] = None
    # Best-effort AI-written narrative paragraph (Grok primary, Gemini
    # fallback -- see services/report_writer.py). None if it couldn't be
    # generated (no API key configured, network/provider issue, etc.) --
    # the deterministic fields above are always populated regardless.
    ai_narrative: Optional[str] = None
    anomalous_frames: list[int] = []  # not persisted -- recomputed on read
    disclaimer: str
    prediction_date: datetime


VideoDetailResponse.model_rebuild()


class RiskHistoryEntryResponse(BaseModel):
    """
    One row of an athlete's risk-assessment history (across ALL their
    videos, most-recent-first). Deliberately lighter than
    RiskAssessmentResponse -- no factors/recommendation breakdown -- since
    a history/trend list is meant to be scanned or charted quickly;
    video_id is included so the frontend can link out to
    GET /videos/{video_id} for the full breakdown of any specific entry.
    """
    prediction_id: UUID
    video_id: Optional[UUID] = None
    injury_type: str
    risk_score: float
    risk_level: str
    prediction_date: datetime

    class Config:
        from_attributes = True


