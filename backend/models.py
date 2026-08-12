from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    profile_completed = Column(Boolean, default=False, nullable=False)

    athlete_profile = relationship(
        "Athlete", back_populates="user",
        uselist=False, cascade="all, delete-orphan"
    )
    reports = relationship(
        "Report", back_populates="user",
        cascade="all, delete-orphan"
    )


class Athlete(Base):
    __tablename__ = "athletes"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    sport_type = Column(String)
    position = Column(String)
    age = Column(Integer)
    height = Column(Float)
    weight = Column(Float)
    injury_history = Column(Text)
    training_load = Column(String)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    user = relationship("User", back_populates="athlete_profile")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    athlete_id = Column(String, nullable=True)
    athlete_name = Column(String, nullable=True)
    video_filename = Column(String, nullable=False)
    frames_analyzed = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Movement Quality
    movement_quality_score = Column(Float, nullable=True)
    quality_label = Column(String, nullable=True)

    # Injury Risk
    injury_risk_score = Column(Float, nullable=True)
    risk_category = Column(String, nullable=True)

    # Full report stored as JSON text
    report_json = Column(Text, nullable=True)

    user = relationship("User", back_populates="reports")