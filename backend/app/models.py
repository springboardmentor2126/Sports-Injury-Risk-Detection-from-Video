import uuid

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Text,
    JSON,
    TIMESTAMP,
    ForeignKey,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    """
    Core account table. Every person who logs in has exactly one row
    here. Single-athlete scope: every account IS an athlete now -- the
    `role` column is legacy from an earlier multi-role (coach/
    physiotherapist/sports_scientist/admin) design and is always
    "athlete" going forward; kept on the table (rather than dropped) so
    no migration is needed for it to just sit there unused.
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="athlete")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    athlete_profile = relationship(
        "AthleteProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class AthleteProfile(Base):
    """
    Athlete-specific data. One-to-one with User -- created unconditionally
    for every new account now (single-athlete scope; used to be
    conditional on role == 'athlete' back when other roles existed).
    """
    __tablename__ = "athlete_profiles"

    athlete_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)

    age = Column(Integer)
    gender = Column(String)
    sport = Column(String)
    position = Column(String)
    height = Column(Float)
    weight = Column(Float)
    injury_history = Column(Text)
    training_load = Column(String)

    user = relationship("User", back_populates="athlete_profile")
    videos = relationship("UploadedVideo", back_populates="athlete", cascade="all, delete-orphan")
    predictions = relationship("InjuryPrediction", back_populates="athlete", cascade="all, delete-orphan")


class UploadedVideo(Base):
    __tablename__ = "uploaded_videos"

    video_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    athlete_id = Column(UUID(as_uuid=True), ForeignKey("athlete_profiles.athlete_id"), nullable=False)
    file_name = Column(String)
    upload_date = Column(TIMESTAMP(timezone=True), server_default=func.now())
    video_path = Column(Text)

    # Added in Milestone 2: lets the API report processing progress/failure
    # instead of the frontend having to guess from missing pose data.
    status = Column(String, nullable=False, default="uploaded")  # uploaded | processing | completed | failed
    error_message = Column(Text, nullable=True)

    # Added for the annotated-video feature: skeleton-overlay video built
    # from the same sampled frames pose estimation already analyzed.
    annotated_video_path = Column(Text, nullable=True)

    athlete = relationship("AthleteProfile", back_populates="videos")
    pose_frames = relationship("PoseData", back_populates="video", cascade="all, delete-orphan")
    # Added in Milestone 3: lets an injury prediction be traced back to the
    # specific clip it was computed from (see InjuryPrediction.video_id).
    injury_predictions = relationship(
        "InjuryPrediction", back_populates="video", cascade="all, delete-orphan"
    )


class PoseData(Base):
    __tablename__ = "pose_data"

    pose_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id = Column(UUID(as_uuid=True), ForeignKey("uploaded_videos.video_id"), nullable=False)
    frame_number = Column(Integer)
    joint_coordinates = Column(JSON)
    joint_angles = Column(JSON)

    video = relationship("UploadedVideo", back_populates="pose_frames")


class InjuryPrediction(Base):
    __tablename__ = "injury_predictions"

    prediction_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    athlete_id = Column(UUID(as_uuid=True), ForeignKey("athlete_profiles.athlete_id"), nullable=False)
    # Added in Milestone 3: the original schema only linked a prediction to
    # an athlete, with no way to trace it back to the specific clip it came
    # from -- despite Database_Schema.md's own relationship diagram showing
    # Uploaded_Videos -> Pose_Data -> Injury_Predictions as a chain, and the
    # UI wireframes wanting a per-analysis "Injury Risk Report" (Screen 7).
    # Nullable so a future non-video-triggered assessment (e.g. a manual
    # profile-level review) would still be a valid row.
    video_id = Column(UUID(as_uuid=True), ForeignKey("uploaded_videos.video_id"), nullable=True)
    injury_type = Column(String)
    risk_score = Column(Float)
    risk_level = Column(String)
    prediction_date = Column(TIMESTAMP(timezone=True), server_default=func.now())
    # Added in Milestone 3: preserves *why* the score/level came out the way
    # it did (injury_risk.RiskFactor.key/label/points/detail, one dict per
    # factor) -- UI_Wireframes.md's Injury Risk Report screen wants "Detected
    # Issues", not just a number, and this is where that detail survives a
    # reload instead of only existing in the moment it was computed.
    contributing_factors = Column(JSON, nullable=True)
    # Added for the AI report-writer layer: an optional, best-effort
    # natural-language paragraph (Grok primary, Gemini fallback -- see
    # services/report_writer.py) phrasing the ABOVE fields for a human
    # reader. Nullable because generating it can fail/be skipped for any
    # reason (no API key, network down, provider outage) without that
    # affecting anything else on this row -- the deterministic score/
    # level/factors/recommendation are computed and stored regardless.
    ai_narrative = Column(Text, nullable=True)

    athlete = relationship("AthleteProfile", back_populates="predictions")
    video = relationship("UploadedVideo", back_populates="injury_predictions")
    recommendations = relationship("Recommendation", back_populates="prediction", cascade="all, delete-orphan")


class Recommendation(Base):
    __tablename__ = "recommendations"

    recommendation_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prediction_id = Column(UUID(as_uuid=True), ForeignKey("injury_predictions.prediction_id"), nullable=False)
    posture_correction = Column(Text)
    exercise_plan = Column(Text)
    recovery_plan = Column(Text)

    prediction = relationship("InjuryPrediction", back_populates="recommendations")


class Report(Base):
    __tablename__ = "reports"

    report_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    athlete_id = Column(UUID(as_uuid=True), ForeignKey("athlete_profiles.athlete_id"), nullable=False)
    prediction_id = Column(UUID(as_uuid=True), ForeignKey("injury_predictions.prediction_id"))
    report_file = Column(Text)
    generated_date = Column(TIMESTAMP(timezone=True), server_default=func.now())

