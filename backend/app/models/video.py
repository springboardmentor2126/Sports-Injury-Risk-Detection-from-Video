from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class Video(Base):
    """Minimal persisted record for uploaded videos used by analysis history."""

    __tablename__ = 'videos'

    video_id: Mapped[str] = mapped_column(String(120), primary_key=True, index=True)
    filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    analysis_history = relationship('AnalysisHistory', back_populates='video', cascade='all, delete-orphan')
