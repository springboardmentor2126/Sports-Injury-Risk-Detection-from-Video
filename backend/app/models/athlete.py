from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class Athlete(Base):
    """Permanent athlete profile details linked one-to-one with a user account."""

    __tablename__ = 'athletes'

    athlete_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.user_id', ondelete='CASCADE'), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(50), nullable=False)
    height: Mapped[str] = mapped_column(String(50), nullable=False)
    weight: Mapped[str] = mapped_column(String(50), nullable=False)
    sport: Mapped[str] = mapped_column(String(100), nullable=False)
    playing_position: Mapped[str] = mapped_column(String(100), nullable=False)
    dominant_side: Mapped[str] = mapped_column(String(50), nullable=False)
    experience_years: Mapped[int] = mapped_column(Integer, nullable=False)
    previous_injuries: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship('User', back_populates='athlete_profile')
