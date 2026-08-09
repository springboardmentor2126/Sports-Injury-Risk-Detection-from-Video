from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class AnalysisHistory(Base):
    """Persisted analysis history for each athlete."""

    __tablename__ = 'analysis_history'

    history_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    video_id: Mapped[str | None] = mapped_column(String(120), ForeignKey('videos.video_id', ondelete='SET NULL'), nullable=True, index=True)
    video_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    balance_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    stability_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    pose_quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_issues: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_issues_detected: Mapped[int | None] = mapped_column(Integer, nullable=True)
    detected_issues: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    recommendations: Mapped[list[dict[str, Any]] | list[str] | None] = mapped_column(JSON, nullable=True)
    frames_processed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    processing_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    analysis_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship('User', back_populates='analysis_history')
    video = relationship('Video', back_populates='analysis_history')
