from datetime import datetime
 
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    Float,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
 
from database.database import Base
 
 
class User(Base):
    """
    Passwords are hashed with passlib/bcrypt in routers/auth.py - never store
    plaintext passwords.
    """
    __tablename__ = "users"
 
    id = Column(Integer, primary_key=True, index=True)
 
    name = Column(String)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Athlete")
 
    created_at = Column(DateTime, default=datetime.utcnow)
 
    # NEW. One user -> many athlete profiles. Deleting a user takes their
    # athletes (and everything under them) with it, same cascade pattern
    # used everywhere else in this schema.
    athletes = relationship(
        "Athlete",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
 
 
class Athlete(Base):
    __tablename__ = "athletes"
 
    # CHANGED: athlete_id is no longer globally unique. It's only unique
    # PER USER, via the composite constraint below - this is what lets
    # two different users each create an athlete with id "ATH001" without
    # colliding, while still preventing one user from creating "ATH001"
    # twice (requirement #8).
    __table_args__ = (
        UniqueConstraint("user_id", "athlete_id", name="uq_athlete_user_athlete_id"),
    )
 
    id = Column(Integer, primary_key=True, index=True)
 
    # NEW COLUMN. This is the actual fix for the reported bug: every athlete
    # now belongs to exactly one user.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
 
    athlete_id = Column(String, nullable=False, index=True)
    sport_type = Column(String)
    position = Column(String)
 
    age = Column(String)
    height = Column(String)
    weight = Column(String)
 
    injury_history = Column(String)
    training_load = Column(String)
 
    created_at = Column(DateTime, default=datetime.utcnow)
 
    owner = relationship("User", back_populates="athletes")
 
    # NEW. Access requests from coaches/physios/etc wanting to view this
    # athlete's data - the athlete (owner) approves/denies/revokes them.
    access_requests = relationship(
        "AthleteAccessRequest",
        back_populates="athlete",
        cascade="all, delete-orphan",
    )
 
    # Cascade: deleting an Athlete deletes all of its Videos (and, via the
    # Video relationship below, their AnalysisResults and Reports).
    videos = relationship(
        "Video",
        back_populates="athlete",
        cascade="all, delete-orphan",
    )
 
 
class Video(Base):
    __tablename__ = "videos"
 
    id = Column(Integer, primary_key=True, index=True)
 
    # CHANGED: was a String FK to athletes.athlete_id (a natural key that is
    # no longer unique on its own). Now points at the Athlete's real integer
    # primary key, which is what actually determines ownership. This is what
    # makes "videos belong to an athlete, which belongs to a user" hold up
    # at the database level, not just in application code.
    athlete_pk_id = Column(Integer, ForeignKey("athletes.id"), nullable=False, index=True)
 
    original_filename = Column(String)
    stored_filename = Column(String)
    processed_filename = Column(String)
 
    created_at = Column(DateTime, default=datetime.utcnow)
 
    athlete = relationship("Athlete", back_populates="videos")
 
    analysis_results = relationship(
        "AnalysisResult",
        back_populates="video",
        cascade="all, delete-orphan",
    )
 
 
class AnalysisResult(Base):
    __tablename__ = "analysis_results"
 
    id = Column(Integer, primary_key=True, index=True)
 
    # CHANGED: same reasoning as Video.athlete_pk_id above. Kept as a direct
    # FK (in addition to going through video.athlete) so ownership checks in
    # routers/analysis.py can be a single join instead of two hops.
    athlete_pk_id = Column(Integer, ForeignKey("athletes.id"), nullable=False, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"))
 
    overall_risk_score = Column(String)
    movement_quality = Column(String)
 
    injury_risks = Column(Text)
    recommendations = Column(Text)
 
    # NEW COLUMNS - denormalized copies of data already inside the JSON
    # blobs above, purely so the Admin Analytics Dashboard can run real SQL
    # AVG()/GROUP BY()/COUNT() queries (e.g. "average risk score by sport",
    # "risk level distribution") instead of either parsing JSON per-row in
    # Postgres or pulling every row into Python (which would violate the
    # "avoid N+1, use SQL aggregation" requirement). The JSON above remains
    # the source of truth for anything detailed (Results page, PDF report);
    # these two are write-once-at-finalize denormalizations of it.
    overall_risk_score_numeric = Column(Float, nullable=True, index=True)
    risk_level = Column(String, nullable=True, index=True)
 
    # Needed so the full biomechanics breakdown (joint angles, range of
    # motion, symmetry, valgus details, peak metrics) survives a server
    # restart - GET /analysis/{id} is served purely from Postgres.
    biomechanics = Column(Text)
 
    # NEW COLUMNS - support background video processing. The row is created
    # immediately (status="processing", all analysis fields still null) so
    # the upload request can return right away; a background task fills in
    # the fields above and flips this to "completed" (or "failed" +
    # error_message) once the actual pose/biomechanics/PDF pipeline finishes.
    # server_default handles existing rows from before this column existed -
    # they were all created via the old fully-synchronous pipeline, so they
    # really are "completed", not "processing".
    status = Column(String, default="processing", server_default="completed")
    error_message = Column(Text, nullable=True)
 
    created_at = Column(DateTime, default=datetime.utcnow)
 
    video = relationship("Video", back_populates="analysis_results")
 
    # Convenience relationship purely for ownership checks / queries -
    # cascade delete for AnalysisResult is already handled by Video's
    # cascade above, so this one doesn't need its own cascade.
    athlete = relationship("Athlete")
 
    reports = relationship(
        "Report",
        back_populates="analysis",
        cascade="all, delete-orphan",
    )
 
 
class Report(Base):
    __tablename__ = "reports"
 
    id = Column(Integer, primary_key=True, index=True)
 
    analysis_id = Column(Integer, ForeignKey("analysis_results.id"))
 
    report_name = Column(String)
    report_path = Column(String)
    report_url = Column(String)
 
    processed_video = Column(String)
    processed_video_url = Column(String)
 
    created_at = Column(DateTime, default=datetime.utcnow)
 
    analysis = relationship("AnalysisResult", back_populates="reports")
 
 
class AthleteAccessRequest(Base):
    """
    Supports the request/approve sharing flow: a coach/physio/sports
    scientist/administrator enters a specific athlete_id and REQUESTS
    access. The athlete (the owner of that profile) sees the pending
    request and can approve, deny, or - later - revoke it.
 
    An "approved" row IS the access grant - there's no separate access
    table. Access = "does a row exist for this athlete, with
    status='approved', where requested_by_user_id == me?"
    """
    __tablename__ = "athlete_access_requests"
 
    id = Column(Integer, primary_key=True, index=True)
 
    athlete_pk_id = Column(Integer, ForeignKey("athletes.id"), nullable=False, index=True)
 
    # Who is asking for access (the coach/physio/etc).
    requested_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
 
    # "pending" -> "approved" | "denied" ; "approved" -> "revoked" (by the athlete, later)
    status = Column(String, default="pending", nullable=False)
 
    # View access is granted by "approved" alone. Upload access is a
    # SEPARATE, stricter permission the athlete can additionally grant -
    # defaults to False, matching the principle that view and edit/upload
    # access should never be bundled together by default.
    can_upload = Column(Boolean, default=False, nullable=False)
 
    created_at = Column(DateTime, default=datetime.utcnow)
 
    # Separate timestamps (not one overwritten "decided_at") so the audit
    # trail survives a later revoke - you can always answer "when was this
    # approved" even after it's since been revoked.
    approved_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
 
    athlete = relationship("Athlete", back_populates="access_requests")
 
 
class PasswordResetToken(Base):
    """
    Single-use, expiring tokens for the Forgot Password flow. DB-backed
    (rather than a stateless JWT) so a token can be explicitly marked used -
    prevents replaying the same reset link twice, even within its validity
    window.
    """
    __tablename__ = "password_reset_tokens"
 
    id = Column(Integer, primary_key=True, index=True)
 
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
 
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
 
    created_at = Column(DateTime, default=datetime.utcnow)
 