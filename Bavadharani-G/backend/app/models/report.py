from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class BiomechanicsReport(Base):
    __tablename__ = "biomechanics_reports"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), unique=True, nullable=False)

    frames_analyzed = Column(Integer, default=0)
    frames_with_person_detected = Column(Integer, default=0)
    detection_rate = Column(Float, default=0.0)

    avg_left_knee_angle = Column(Float, nullable=True)
    avg_right_knee_angle = Column(Float, nullable=True)
    knee_angle_asymmetry = Column(Float, nullable=True)

    avg_trunk_lean_angle = Column(Float, nullable=True)

    avg_left_hip_angle = Column(Float, nullable=True)
    avg_right_hip_angle = Column(Float, nullable=True)

    movement_quality_score = Column(Float, nullable=True)

    notes = Column(Text, nullable=True)

    overlay_video_filename = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
