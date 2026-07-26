"""
VideoAnalysis — Database model for storing pose estimation and biomechanics results.

Every time a user uploads a video and runs an analysis, the results are saved here.
This links to the user account so the dashboard can show analysis history.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean,
    ForeignKey, DateTime, Text, types
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class UUID(types.TypeDecorator):
    """Cross-database compatible UUID type (SQLite + PostgreSQL)."""
    impl = types.String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return str(value) if value is not None else None

    def process_result_value(self, value, dialect):
        return uuid.UUID(value) if value is not None else None


class VideoAnalysis(Base):
    """
    Stores the complete result of one video analysis session per user.
    All biomechanical metrics and risk flags are stored as flat columns
    so they can be queried, filtered, and fed into XGBoost in Milestone 3.
    """
    __tablename__ = "video_analyses"

    id         = Column(UUID(), primary_key=True, default=uuid.uuid4, index=True)
    user_id    = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(String(36), unique=True, nullable=False, index=True)

    # ── Video Metadata ────────────────────────────────────────────────
    original_filename     = Column(String(255), nullable=True)
    duration_seconds      = Column(Float, nullable=True)
    total_frames          = Column(Integer, nullable=True)
    frames_analyzed       = Column(Integer, nullable=True)
    frames_with_pose      = Column(Integer, nullable=True)
    pose_detection_rate   = Column(Float, nullable=True)
    annotated_frame_urls  = Column(Text, nullable=True)   # JSON list of image URLs

    # ── Aggregated Biomechanics ───────────────────────────────────────
    avg_left_knee_angle   = Column(Float, nullable=True)
    avg_right_knee_angle  = Column(Float, nullable=True)
    min_left_knee_angle   = Column(Float, nullable=True)
    min_right_knee_angle  = Column(Float, nullable=True)
    avg_left_hip_angle    = Column(Float, nullable=True)
    avg_right_hip_angle   = Column(Float, nullable=True)
    avg_left_elbow_angle  = Column(Float, nullable=True)
    avg_right_elbow_angle = Column(Float, nullable=True)
    avg_trunk_lean        = Column(Float, nullable=True)
    avg_knee_symmetry     = Column(Float, nullable=True)
    avg_hip_symmetry      = Column(Float, nullable=True)
    avg_overall_symmetry  = Column(Float, nullable=True)

    # ── Risk Flag Counts (how many frames triggered each flag) ────────
    frames_knee_hyperextension  = Column(Integer, default=0)
    frames_knee_acute_flexion   = Column(Integer, default=0)
    frames_excessive_trunk_lean = Column(Integer, default=0)
    frames_low_symmetry         = Column(Integer, default=0)
    frames_elbow_hyperextension = Column(Integer, default=0)
    frames_knee_valgus          = Column(Integer, default=0)
    frames_balance_unstable     = Column(Integer, default=0)

    # ── Overall Risk Assessment ───────────────────────────────────────
    # Derived risk level: "low" | "moderate" | "high" | "critical"
    risk_level = Column(String(20), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────
    user = relationship("User", back_populates="video_analyses")
