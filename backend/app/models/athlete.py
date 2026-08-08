import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Date, Text, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import UUID  # Shared cross-database UUID type


class AthleteProfile(Base):
    """Physical and sports-specific details for athletes."""
    __tablename__ = "athlete_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)

    # Professional links
    linked_coach_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    linked_physio_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Sports info
    sport_type = Column(String(100), nullable=False)   # e.g., Basketball, Soccer
    position = Column(String(100), nullable=True)       # e.g., Striker, Point Guard

    # Physical stats
    age = Column(Integer, nullable=False)
    height_cm = Column(Numeric(5, 2), nullable=False)
    weight_kg = Column(Numeric(5, 2), nullable=False)
    weekly_training_hours = Column(Integer, default=0, nullable=False)

    # Optional fields (dataset-dependent)
    gender = Column(String(20), nullable=True)          # e.g., Male, Female, Other
    dominant_limb = Column(String(10), nullable=True)   # e.g., Right, Left

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="athlete_profile", foreign_keys=[user_id])
    injury_histories = relationship("InjuryHistory", back_populates="athlete_profile", cascade="all, delete-orphan")


class InjuryHistory(Base):
    """Historical injury records for an athlete (one-to-many with AthleteProfile)."""
    __tablename__ = "injury_histories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    athlete_profile_id = Column(UUID(as_uuid=True), ForeignKey("athlete_profiles.id"), nullable=False)

    injury_name = Column(String(255), nullable=False)        # e.g., ACL Tear
    affected_body_part = Column(String(100), nullable=False) # e.g., Left Knee
    injury_date = Column(Date, nullable=False)
    recovery_duration_weeks = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    athlete_profile = relationship("AthleteProfile", back_populates="injury_histories")
