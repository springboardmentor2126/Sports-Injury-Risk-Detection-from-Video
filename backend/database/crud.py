import json
 
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
 
from . import models, schemas
 
 
# ---------------------------------------------------------
# Users
# ---------------------------------------------------------
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()
 
 
def create_user(db: Session, name, email: str, hashed_password: str, role: str):
    user = models.User(
        name=name,
        email=email,
        hashed_password=hashed_password,
        role=role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(user)
    return user
 
 
# ---------------------------------------------------------
# Athletes
# All of these are scoped to a user_id - there is deliberately no
# "get any athlete by pk" function that skips the ownership filter, so it's
# impossible for a router to accidentally leak another user's athlete by
# forgetting a check.
# ---------------------------------------------------------
def create_athlete(db: Session, athlete: schemas.AthleteCreate, user_id: int):
    db_athlete = models.Athlete(**athlete.model_dump(), user_id=user_id)
    db.add(db_athlete)
    db.commit()
    db.refresh(db_athlete)
    return db_athlete
 
 
def get_athlete_for_user(db: Session, athlete_id: str, user_id: int):
    """Returns this user's athlete with this business athlete_id, or None."""
    return (
        db.query(models.Athlete)
        .filter(models.Athlete.athlete_id == athlete_id, models.Athlete.user_id == user_id)
        .first()
    )
 
 
def athlete_id_exists_for_any_user(db: Session, athlete_id: str) -> bool:
    """
    Used only to distinguish 404 (truly doesn't exist) from 403 (exists, but
    belongs to someone else) - never used to return the athlete's data.
    """
    return (
        db.query(models.Athlete)
        .filter(models.Athlete.athlete_id == athlete_id)
        .first()
        is not None
    )
 
 
def get_all_athletes_for_user(db: Session, user_id: int):
    """
    STRICT ownership only (athletes this user directly created/owns) - used
    for the Athlete role's one-profile-limit check, and for the "Saved
    Athlete Profiles" management table (edit/delete). Does NOT include
    athletes shared with this user via an accepted invite - see
    get_all_athletes_visible_to_user for that.
    """
    return db.query(models.Athlete).filter(models.Athlete.user_id == user_id).all()
 
 
def _accessible_athlete_pk_subquery(db: Session, user_id: int):
    """
    Athlete primary keys this user can VIEW - either because they own the
    athlete, or because they have an APPROVED access request for it. Used
    everywhere that reads athlete/video/analysis/report data; never used
    for create/update/delete/upload, which stay strictly owner-only.
    """
    owned = db.query(models.Athlete.id).filter(models.Athlete.user_id == user_id)
    shared = (
        db.query(models.AthleteAccessRequest.athlete_pk_id)
        .filter(
            models.AthleteAccessRequest.requested_by_user_id == user_id,
            models.AthleteAccessRequest.status == "approved",
        )
    )
    return owned.union(shared).subquery()
 
 
def get_all_athletes_visible_to_user(db: Session, user_id: int):
    """Owned + shared-with-me athletes, for dashboard display. Each row's
    is_owner status can be determined by comparing athlete.user_id == user_id."""
    subquery = _accessible_athlete_pk_subquery(db, user_id)
    return db.query(models.Athlete).filter(models.Athlete.id.in_(subquery)).all()
 
 
def get_athlete_viewable(db: Session, athlete_id: str, user_id: int):
    """Returns this athlete (by business athlete_id) if the user owns it OR
    has accepted-invite access to it - used for read-only routes."""
    subquery = _accessible_athlete_pk_subquery(db, user_id)
    return (
        db.query(models.Athlete)
        .filter(models.Athlete.athlete_id == athlete_id, models.Athlete.id.in_(subquery))
        .first()
    )
 
 
def update_athlete(db: Session, athlete_pk: int, athlete: schemas.AthleteUpdate):
    """
    Caller (router) is responsible for having already verified this
    athlete_pk belongs to the current user before calling this.
    """
    db_athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_pk).first()
 
    if not db_athlete:
        return None
 
    for key, value in athlete.model_dump().items():
        setattr(db_athlete, key, value)
 
    db.commit()
    db.refresh(db_athlete)
 
    return db_athlete
 
 
def delete_athlete(db: Session, athlete_pk: int):
    """
    Deletes the Athlete row. Cascades through Videos -> AnalysisResults ->
    Reports at the DB level (see models.py). Caller must remove the
    physical files first, and must have already verified ownership.
    """
    db_athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_pk).first()
 
    if not db_athlete:
        return None
 
    db.delete(db_athlete)
    db.commit()
 
    return db_athlete
 
 
# ---------------------------------------------------------
# Videos
# ---------------------------------------------------------
def create_video(
    db: Session,
    athlete_pk_id: int,
    original_filename: str,
    stored_filename: str,
    processed_filename: str = None,
):
    video = models.Video(
        athlete_pk_id=athlete_pk_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        processed_filename=processed_filename,
    )
 
    db.add(video)
    db.commit()
    db.refresh(video)
 
    return video
 
 
def get_video_for_user(db: Session, video_id: int, user_id: int):
    """STRICT ownership - used for DELETE. Do not use for read-only routes."""
    return (
        db.query(models.Video)
        .join(models.Athlete, models.Video.athlete_pk_id == models.Athlete.id)
        .filter(models.Video.id == video_id, models.Athlete.user_id == user_id)
        .first()
    )
 
 
def get_video_viewable(db: Session, video_id: int, user_id: int):
    """Owned OR shared-with-me - used for read-only single-video GET."""
    subquery = _accessible_athlete_pk_subquery(db, user_id)
    return (
        db.query(models.Video)
        .filter(models.Video.id == video_id, models.Video.athlete_pk_id.in_(subquery))
        .first()
    )
 
 
def video_exists(db: Session, video_id: int) -> bool:
    return db.query(models.Video).filter(models.Video.id == video_id).first() is not None
 
 
def get_all_videos_for_user(db: Session, user_id: int):
    """Owned + shared-with-me videos - this is a read-only list endpoint,
    so it uses the broadened accessible set."""
    subquery = _accessible_athlete_pk_subquery(db, user_id)
    return db.query(models.Video).filter(models.Video.athlete_pk_id.in_(subquery)).all()
 
 
def delete_video(db: Session, video_id: int):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
 
    if not video:
        return None
 
    db.delete(video)
    db.commit()
 
    return video
 
 
# ---------------------------------------------------------
# Analysis Results
# ---------------------------------------------------------
def create_pending_analysis(db: Session, athlete_pk_id: int, video_id: int):
    """
    Creates the AnalysisResult row IMMEDIATELY, before any actual processing
    has happened, so the upload request can return right away with an
    analysis_id the frontend can poll. All the real fields start empty and
    get filled in by finalize_analysis_result() once the background task
    finishes.
    """
    analysis = models.AnalysisResult(
        athlete_pk_id=athlete_pk_id,
        video_id=video_id,
        status="processing",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis
 
 
def finalize_analysis_result(
    db: Session,
    analysis_id: int,
    overall_risk_score,
    movement_quality,
    injury_risks,
    recommendations,
    biomechanics,
):
    """Called by the background task once processing succeeds - fills in
    the real results and marks the row completed."""
    analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.id == analysis_id).first()
    if not analysis:
        return None
 
    analysis.overall_risk_score = json.dumps(overall_risk_score)
    analysis.movement_quality = json.dumps(movement_quality)
    analysis.injury_risks = json.dumps(injury_risks)
    analysis.recommendations = json.dumps(recommendations)
    analysis.biomechanics = json.dumps(biomechanics)
 
    # Denormalized for SQL aggregation (see models.py comment) - same data
    # that's already inside overall_risk_score above, also stored flat.
    if isinstance(overall_risk_score, dict):
        analysis.overall_risk_score_numeric = overall_risk_score.get("overall_score")
        analysis.risk_level = overall_risk_score.get("risk_level")
 
    analysis.status = "completed"
 
    db.commit()
    db.refresh(analysis)
    return analysis
 
 
def mark_analysis_failed(db: Session, analysis_id: int, error_message: str):
    """Called by the background task if processing raises an exception -
    lets the frontend show a real error instead of spinning forever."""
    analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.id == analysis_id).first()
    if not analysis:
        return None
 
    analysis.status = "failed"
    analysis.error_message = error_message
 
    db.commit()
    db.refresh(analysis)
    return analysis
 
 
def update_video_processed_filename(db: Session, video_id: int, processed_filename: str):
    """The processed (skeleton-overlay) filename isn't known until the
    background task finishes running the pose-tracking pipeline."""
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        return None
 
    video.processed_filename = processed_filename
    db.commit()
    db.refresh(video)
    return video
 
 
def get_all_completed_analyses_for_athlete(db: Session, athlete_pk_id: int):
    """
    Returns ALL of this athlete's completed sessions, OLDEST FIRST - used to
    build trend data (risk score over time, etc.) for the athlete
    intelligence dashboard. Unlike get_recent_analyses_for_athlete (used for
    anomaly baselines), this isn't limited/reversed - a dashboard chart
    wants the full history in chronological order.
    """
    return (
        db.query(models.AnalysisResult)
        .filter(
            models.AnalysisResult.athlete_pk_id == athlete_pk_id,
            models.AnalysisResult.status == "completed",
        )
        .order_by(models.AnalysisResult.created_at.asc())
        .all()
    )
 
 
def get_recent_analyses_for_athlete(db: Session, athlete_pk_id: int, exclude_analysis_id: int = None, limit: int = 5):
    """
    Returns this athlete's most recent past analyses (newest first), used to
    build a movement baseline for anomaly detection. Excludes the analysis
    currently being viewed/just created, since comparing a session against
    itself is meaningless.
    """
    query = (
        db.query(models.AnalysisResult)
        .filter(models.AnalysisResult.athlete_pk_id == athlete_pk_id)
        .order_by(models.AnalysisResult.created_at.desc())
    )
    if exclude_analysis_id is not None:
        query = query.filter(models.AnalysisResult.id != exclude_analysis_id)
    return query.limit(limit).all()
 
 
def get_analysis_for_user(db: Session, analysis_id: int, user_id: int):
    """STRICT ownership - used for DELETE. Do not use for read-only routes."""
    return (
        db.query(models.AnalysisResult)
        .join(models.Athlete, models.AnalysisResult.athlete_pk_id == models.Athlete.id)
        .options(joinedload(models.AnalysisResult.reports))
        .filter(models.AnalysisResult.id == analysis_id, models.Athlete.user_id == user_id)
        .first()
    )
 
 
def get_analysis_viewable(db: Session, analysis_id: int, user_id: int):
    """Owned OR shared-with-me - used for read-only single-analysis GET
    (this is what powers the 'coach can view the athlete's full analysis'
    feature)."""
    subquery = _accessible_athlete_pk_subquery(db, user_id)
    return (
        db.query(models.AnalysisResult)
        .options(joinedload(models.AnalysisResult.reports))
        .filter(models.AnalysisResult.id == analysis_id, models.AnalysisResult.athlete_pk_id.in_(subquery))
        .first()
    )
 
 
def analysis_exists(db: Session, analysis_id: int) -> bool:
    return (
        db.query(models.AnalysisResult)
        .filter(models.AnalysisResult.id == analysis_id)
        .first()
        is not None
    )
 
 
def get_all_analysis_for_user(db: Session, user_id: int):
    """Owned + shared-with-me analyses - read-only list endpoint."""
    subquery = _accessible_athlete_pk_subquery(db, user_id)
    return db.query(models.AnalysisResult).filter(models.AnalysisResult.athlete_pk_id.in_(subquery)).all()
 
 
def delete_analysis(db: Session, analysis_id: int):
    analysis = db.query(models.AnalysisResult).filter(models.AnalysisResult.id == analysis_id).first()
 
    if not analysis:
        return None
 
    db.delete(analysis)
    db.commit()
 
    return analysis
 
 
# ---------------------------------------------------------
# Reports
# ---------------------------------------------------------
def create_report(
    db: Session,
    analysis_id: int,
    report_name: str,
    report_path: str,
    report_url: str,
    processed_video: str,
    processed_video_url: str,
):
    report = models.Report(
        analysis_id=analysis_id,
        report_name=report_name,
        report_path=report_path,
        report_url=report_url,
        processed_video=processed_video,
        processed_video_url=processed_video_url,
    )
 
    db.add(report)
    db.commit()
    db.refresh(report)
 
    return report
 
 
def get_report_for_user(db: Session, report_id: int, user_id: int):
    """STRICT ownership - used for DELETE. Do not use for read-only routes."""
    return (
        db.query(models.Report)
        .join(models.AnalysisResult, models.Report.analysis_id == models.AnalysisResult.id)
        .join(models.Athlete, models.AnalysisResult.athlete_pk_id == models.Athlete.id)
        .filter(models.Report.id == report_id, models.Athlete.user_id == user_id)
        .first()
    )
 
 
def get_report_viewable(db: Session, report_id: int, user_id: int):
    """Owned OR shared-with-me - used for read-only single-report GET."""
    subquery = _accessible_athlete_pk_subquery(db, user_id)
    return (
        db.query(models.Report)
        .join(models.AnalysisResult, models.Report.analysis_id == models.AnalysisResult.id)
        .filter(models.Report.id == report_id, models.AnalysisResult.athlete_pk_id.in_(subquery))
        .first()
    )
 
 
def report_exists(db: Session, report_id: int) -> bool:
    return db.query(models.Report).filter(models.Report.id == report_id).first() is not None
 
 
def get_all_reports_for_user(db: Session, user_id: int):
    """Owned + shared-with-me reports - read-only list endpoint."""
    subquery = _accessible_athlete_pk_subquery(db, user_id)
    return (
        db.query(models.Report)
        .join(models.AnalysisResult, models.Report.analysis_id == models.AnalysisResult.id)
        .filter(models.AnalysisResult.athlete_pk_id.in_(subquery))
        .all()
    )
 
 
def delete_report(db: Session, report_id: int):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
 
    if not report:
        return None
 
    db.delete(report)
    db.commit()
 
    return report
 
 
# ---------------------------------------------------------
# Athlete Access Requests (request/approve sharing flow)
# ---------------------------------------------------------
def create_access_request(db: Session, athlete_pk_id: int, requested_by_user_id: int):
    request = models.AthleteAccessRequest(
        athlete_pk_id=athlete_pk_id,
        requested_by_user_id=requested_by_user_id,
        status="pending",
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request
 
 
def get_access_request(db: Session, request_id: int):
    return db.query(models.AthleteAccessRequest).filter(models.AthleteAccessRequest.id == request_id).first()
 
 
def get_pending_or_active_request(db: Session, athlete_pk_id: int, requested_by_user_id: int):
    """
    Used to prevent duplicate requests: is there already a pending or
    approved request from this user for this athlete?
    """
    return (
        db.query(models.AthleteAccessRequest)
        .filter(
            models.AthleteAccessRequest.athlete_pk_id == athlete_pk_id,
            models.AthleteAccessRequest.requested_by_user_id == requested_by_user_id,
            models.AthleteAccessRequest.status.in_(["pending", "approved"]),
        )
        .first()
    )
 
 
def get_incoming_requests_for_user(db: Session, owner_user_id: int):
    """
    All access requests targeting ANY athlete this user owns - what the
    athlete sees to approve/deny/revoke. Newest first.
    """
    return (
        db.query(models.AthleteAccessRequest)
        .join(models.Athlete, models.AthleteAccessRequest.athlete_pk_id == models.Athlete.id)
        .filter(models.Athlete.user_id == owner_user_id)
        .order_by(models.AthleteAccessRequest.created_at.desc())
        .all()
    )
 
 
def get_outgoing_requests_for_user(db: Session, requester_user_id: int):
    """All access requests THIS user has sent (as the coach/physio/etc),
    so they can track status. Newest first."""
    return (
        db.query(models.AthleteAccessRequest)
        .filter(models.AthleteAccessRequest.requested_by_user_id == requester_user_id)
        .order_by(models.AthleteAccessRequest.created_at.desc())
        .all()
    )
 
 
def approve_access_request(db: Session, request: models.AthleteAccessRequest, can_upload: bool = False):
    from datetime import datetime as _dt
    request.status = "approved"
    request.can_upload = can_upload
    request.approved_at = _dt.utcnow()
    db.commit()
    db.refresh(request)
    return request
 
 
def deny_access_request(db: Session, request: models.AthleteAccessRequest):
    request.status = "denied"
    db.commit()
    db.refresh(request)
    return request
 
 
def revoke_access_request(db: Session, request: models.AthleteAccessRequest):
    from datetime import datetime as _dt
    request.status = "revoked"
    request.revoked_at = _dt.utcnow()
    db.commit()
    db.refresh(request)
    return request
 
 
 
# ---------------------------------------------------------
# Password Reset Tokens
# ---------------------------------------------------------
def create_password_reset_token(db: Session, user_id: int, expires_minutes: int = 30):
    import secrets
    from datetime import datetime, timedelta
 
    token = secrets.token_urlsafe(32)
    reset_token = models.PasswordResetToken(
        user_id=user_id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(minutes=expires_minutes),
        used=False,
    )
    db.add(reset_token)
    db.commit()
    db.refresh(reset_token)
    return reset_token
 
 
def get_valid_reset_token(db: Session, token: str):
    from datetime import datetime
 
    reset_token = (
        db.query(models.PasswordResetToken)
        .filter(models.PasswordResetToken.token == token)
        .first()
    )
    if not reset_token:
        return None
    if reset_token.used:
        return None
    if reset_token.expires_at < datetime.utcnow():
        return None
    return reset_token
 
 
def mark_reset_token_used(db: Session, reset_token: models.PasswordResetToken):
    reset_token.used = True
    db.commit()
 
 
def update_user_password(db: Session, user: models.User, new_hashed_password: str):
    user.hashed_password = new_hashed_password
    db.commit()
    db.refresh(user)
    return user
 