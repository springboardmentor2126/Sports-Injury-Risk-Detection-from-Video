import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Enum, ForeignKey
)
from sqlalchemy.orm import relationship

from .database import Base


class RoleEnum(str, enum.Enum):
    athlete = "athlete"
    coach = "coach"
    physiotherapist = "physiotherapist"
    sports_scientist = "sports_scientist"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.athlete)
    created_at = Column(DateTime, default=datetime.utcnow)

    athlete_profile = relationship(
        "Athlete", back_populates="user", uselist=False,
        cascade="all, delete-orphan"
    )


class Athlete(Base):
      
    __tablename__ = "athletes"

    id = Column(Integer, primary_key=True, index=True)
    athlete_code = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    sport_type = Column(String(80), nullable=False)
    position = Column(String(80), nullable=True)
    age = Column(Integer, nullable=False)
    height_cm = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    injury_history = Column(Text, nullable=True)
    training_load = Column(String(120), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="athlete_profile")
    videos = relationship("Video", back_populates="athlete", cascade="all, delete-orphan")


class VideoStatusEnum(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ActivityTypeEnum(str, enum.Enum):
    running = "running"
    jumping = "jumping"
    landing = "landing"
    throwing = "throwing"
    cutting = "cutting"
    cricket = "cricket"
    sport_specific = "sport_specific"


class Video(Base):
    
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athletes.id"), nullable=False)
    activity_type = Column(Enum(ActivityTypeEnum), nullable=False, default=ActivityTypeEnum.running)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    status = Column(Enum(VideoStatusEnum), nullable=False, default=VideoStatusEnum.uploaded)
    duration_seconds = Column(Float, nullable=True)
    frames_processed = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    athlete = relationship("Athlete", back_populates="videos")
    report = relationship(
        "BiomechanicsReport", back_populates="video", uselist=False,
        cascade="all, delete-orphan"
    )


class BiomechanicsReport(Base):
    
    __tablename__ = "biomechanics_reports"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), unique=True, nullable=False)

    # Biomechanical Metrics (section 5)
    avg_left_knee_angle = Column(Float, nullable=True)
    avg_right_knee_angle = Column(Float, nullable=True)
    knee_valgus_score = Column(Float, nullable=True)      # 0-100, higher = more inward knee collapse
    hip_stability_score = Column(Float, nullable=True)    # 0-100, higher = more stable
    trunk_lean_degrees = Column(Float, nullable=True)
    landing_mechanics_score = Column(Float, nullable=True)  # 0-100, higher = safer landing
    stride_length_ratio = Column(Float, nullable=True)      # normalized to body height in frame
    joint_alignment_score = Column(Float, nullable=True)    # 0-100
    balance_score = Column(Float, nullable=True)            # 0-100
    movement_symmetry_score = Column(Float, nullable=True)  # 0-100, 100 = perfectly symmetric

    # Roll-up scores (section 8 Risk Scoring Engine — simplified for Milestone 2)
    movement_quality_score = Column(Float, nullable=True)   # 0-100 overall
    risk_category = Column(String(20), nullable=True)       # Low / Moderate / High / Critical

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video", back_populates="report")
