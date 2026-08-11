from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, nullable=False)

    email = Column(String, unique=True, nullable=False, index=True)

    hashed_password = Column(String, nullable=False)

    role = Column(String, nullable=False, default="Athlete")

    age = Column(Integer, nullable=True)

    gender = Column(String, nullable=True)

    height = Column(Float, nullable=True)

    weight = Column(Float, nullable=True)

    sport = Column(String, nullable=True)

    experience = Column(Integer, nullable=True)

    videos = relationship("Video", back_populates="owner")


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String, nullable=False)

    filepath = Column(String, nullable=False)

    owner_id = Column(Integer, ForeignKey("users.id"))

    frames_processed = Column(Integer, default=0)

    pose_detected_frames = Column(Integer, default=0)

    # Knee
    left_knee_angle = Column(Float, default=0)
    right_knee_angle = Column(Float, default=0)

    # Hip
    left_hip_angle = Column(Float, default=0)
    right_hip_angle = Column(Float, default=0)

    # Shoulder
    left_shoulder_angle = Column(Float, default=0)
    right_shoulder_angle = Column(Float, default=0)

    # Elbow
    left_elbow_angle = Column(Float, default=0)
    right_elbow_angle = Column(Float, default=0)

    posture_symmetry = Column(Float, default=0)

    movement_quality = Column(String, default="Unknown")

    injury_risk = Column(String, default="Unknown")

    recommendation = Column(String, default="")

    owner = relationship("User", back_populates="videos")