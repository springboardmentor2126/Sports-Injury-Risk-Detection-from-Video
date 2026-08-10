import shutil
import uuid
from dataclasses import asdict
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .. import crud, schemas, models
from ..database import get_db, SessionLocal
from ..auth import get_current_user
from ..services import video_processing, pose_estimation, biomechanics, annotation, injury_risk, report_writer

router = APIRouter(prefix="/videos", tags=["Videos"])

# backend/app/routers/video.py -> parents[2] = backend/ -> backend/uploads
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"


def _require_athlete_profile(current_user: models.User, db: Session) -> models.AthleteProfile:
    profile = crud.get_athlete_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="No athlete profile for this account -- only athletes upload videos.",
        )
    return profile


def _check_can_view(video: models.UploadedVideo, current_user: models.User, db: Session):
    """Single-athlete scope: ownership only, no staff-role bypass anymore."""
    profile = crud.get_athlete_by_user_id(db, current_user.id)
    if not profile or profile.athlete_id != video.athlete_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this video")


def _pose_rows_to_frame_metrics(pose_rows: list[models.PoseData]) -> list[biomechanics.FrameMetrics]:
    """Reconstructs FrameMetrics from what's already stored in the DB,
    so summaries can be recomputed on GET without re-running pose
    estimation on the video every time."""
    result = []
    for row in pose_rows:
        ja = row.joint_angles or {}
        result.append(
            biomechanics.FrameMetrics(
                frame_number=row.frame_number,
                left_knee_angle=ja.get("left_knee"),
                right_knee_angle=ja.get("right_knee"),
                left_elbow_angle=ja.get("left_elbow"),
                right_elbow_angle=ja.get("right_elbow"),
                left_hip_angle=ja.get("left_hip"),
                right_hip_angle=ja.get("right_hip"),
                trunk_lean_deg=ja.get("trunk_lean_deg"),
                knee_valgus_proxy=ja.get("knee_valgus_proxy"),
                knee_symmetry_diff=ja.get("knee_symmetry_diff"),
            )
        )
    return result


def _to_video_response(video: models.UploadedVideo) -> schemas.VideoResponse:
    return schemas.VideoResponse(
        video_id=video.video_id,
        athlete_id=video.athlete_id,
        file_name=video.file_name,
        upload_date=video.upload_date,
        status=video.status,
        error_message=video.error_message,
        has_annotated_video=bool(video.annotated_video_path),
    )


def _recommendation_to_schema(recommendation: Optional[models.Recommendation]) -> Optional[schemas.RecommendationResponse]:
    if recommendation is None:
        return None
    return schemas.RecommendationResponse(
        posture_correction=recommendation.posture_correction,
        exercise_plan=recommendation.exercise_plan,
        recovery_plan=recommendation.recovery_plan,
    )


def _persist_risk_assessment(
    db: Session,
    athlete_id,
    video_id,
    assessment: injury_risk.RiskAssessment,
) -> schemas.RiskAssessmentResponse:
    """
    Writes a freshly-computed RiskAssessment to injury_predictions +
    recommendations (crud.py's job -- this function is the bridge, same
    role as the inline crud.add_pose_data() calls already in
    upload_video() for biomechanics), then builds the API response from
    the just-persisted rows so the response always reflects what's
    actually in the DB, not just what's in memory.
    """
    prediction = crud.create_injury_prediction(
        db,
        athlete_id=athlete_id,
        video_id=video_id,
        injury_type=assessment.injury_type,
        risk_score=assessment.score,
        risk_level=assessment.level,
        contributing_factors=[asdict(f) for f in assessment.factors],
    )
    recommendation = crud.create_recommendation(
        db,
        prediction_id=prediction.prediction_id,
        posture_correction=assessment.recommendation.posture_correction,
        exercise_plan=assessment.recommendation.exercise_plan,
        recovery_plan=assessment.recommendation.recovery_plan,
    )

    # Best-effort AI narrative (Grok primary, Gemini fallback -- see
    # report_writer.py's docstring). Can never raise; None just means no
    # narrative this time, every field above is already fully persisted
    # regardless of whether this succeeds.
    narrative = report_writer.generate_narrative(assessment)
    if narrative:
        crud.update_prediction_narrative(db, prediction.prediction_id, narrative)

    return schemas.RiskAssessmentResponse(
        prediction_id=prediction.prediction_id,
        injury_type=prediction.injury_type,
        risk_score=prediction.risk_score,
        risk_level=prediction.risk_level,
        factors=prediction.contributing_factors or [],
        recommendation=_recommendation_to_schema(recommendation),
        ai_narrative=narrative,
        anomalous_frames=assessment.anomalous_frames,
        disclaimer=assessment.disclaimer,
        prediction_date=prediction.prediction_date,
    )


def _load_latest_risk_response(
    db: Session,
    video_id,
    anomalous_frames: list[int],
) -> Optional[schemas.RiskAssessmentResponse]:
    """
    For GET endpoints: loads the most recently persisted assessment for
    this video rather than recomputing one (recomputing would silently
    drift from whatever's actually stored, and would need the athlete's
    CURRENT injury_history/training_load -- which the refresh endpoint is
    for). anomalous_frames is the one part that's cheap to recompute live
    from already-fetched pose data and isn't persisted at all (see
    injury_risk.py's module docstring), so it's passed in fresh.
    """
    prediction = crud.get_latest_prediction_for_video(db, video_id)
    if prediction is None:
        return None
    recommendation = crud.get_recommendation_for_prediction(db, prediction.prediction_id)
    return schemas.RiskAssessmentResponse(
        prediction_id=prediction.prediction_id,
        injury_type=prediction.injury_type,
        risk_score=prediction.risk_score,
        risk_level=prediction.risk_level,
        factors=prediction.contributing_factors or [],
        recommendation=_recommendation_to_schema(recommendation),
        ai_narrative=prediction.ai_narrative,
        anomalous_frames=anomalous_frames,
        disclaimer=injury_risk.DEFAULT_DISCLAIMER,
        prediction_date=prediction.prediction_date,
    )


@router.post("/upload", response_model=schemas.VideoResponse, status_code=202)
def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    ASYNC upload: only the FAST checks run synchronously here --
    filename extension, and video resolution/frame-count validation
    (just reading metadata, not running pose estimation) -- so a bad
    upload still gets rejected immediately with a proper 400 instead of
    silently "succeeding" and failing moments later in the background.

    Everything slow (frame-by-frame pose estimation, annotated-video
    encoding, biomechanics, risk scoring) is handed off to
    _process_video_task() as a FastAPI BackgroundTask and this request
    returns immediately -- 202 Accepted, not 200/201, since the video
    record now exists but processing hasn't happened yet. The frontend
    polls GET /{video_id} until status flips to "completed"/"failed";
    the rest of the app (and this request itself) is never blocked
    waiting for a video's worth of pose inference to finish.
    """
    profile = _require_athlete_profile(current_user, db)

    try:
        video_processing.validate_upload_filename(file.filename)
    except video_processing.InvalidVideoError as e:
        raise HTTPException(status_code=400, detail=str(e))

    athlete_dir = UPLOAD_DIR / str(profile.athlete_id)
    athlete_dir.mkdir(parents=True, exist_ok=True)

    video_id = uuid.uuid4()
    dest_path = athlete_dir / f"{video_id}{Path(file.filename).suffix.lower()}"

    with dest_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        video_processing.get_video_info(str(dest_path))
    except video_processing.InvalidVideoError as e:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(e))

    video = crud.create_video(db, video_id, profile.athlete_id, file.filename, str(dest_path))

    background_tasks.add_task(
        _process_video_task,
        video_id=video.video_id,
        athlete_id=profile.athlete_id,
        dest_path=str(dest_path),
        athlete_dir=str(athlete_dir),
    )

    return _to_video_response(video)


def _process_video_task(video_id, athlete_id, dest_path: str, athlete_dir: str) -> None:
    """
    Runs OUTSIDE the request/response cycle (invoked by FastAPI's
    BackgroundTasks, in a threadpool). Critically, it opens its OWN DB
    session rather than reusing the request's -- the request-scoped
    session from Depends(get_db) is already closed by the time a
    background task runs (see database.get_db's try/finally), so
    reusing it would either error or silently use a dead connection.

    Every exit path updates the video's status. Nothing here can raise
    back into the request -- there's no request left to raise into --
    so every failure mode is caught and turned into status="failed"
    with an error_message, the same terminal-state contract the old
    synchronous version had.
    """
    db = SessionLocal()
    try:
        crud.update_video_status(db, video_id, "processing")
        video = crud.get_video(db, video_id)

        try:
            info = video_processing.get_video_info(dest_path)
        except video_processing.InvalidVideoError as e:
            crud.update_video_status(db, video_id, "failed", error_message=str(e))
            return

        raw_annotated_path = Path(athlete_dir) / f"{video_id}_annotated_raw.mp4"
        annotated_path = Path(athlete_dir) / f"{video_id}_annotated.mp4"

        frame_metrics: list[biomechanics.FrameMetrics] = []
        try:
            with pose_estimation.PoseEstimator() as estimator, \
                 annotation.AnnotatedVideoWriter(str(raw_annotated_path), info.width, info.height) as ann_writer:

                for frame_number, frame_rgb in video_processing.extract_frames(dest_path):
                    keypoints = estimator.estimate(frame_rgb)

                    metrics = None
                    if keypoints is not None:
                        metrics = biomechanics.analyze_frame(frame_number, keypoints)
                        frame_metrics.append(metrics)

                        crud.add_pose_data(
                            db,
                            video_id=video_id,
                            frame_number=frame_number,
                            joint_coordinates={
                                name: {"x": p.x, "y": p.y, "visibility": p.visibility}
                                for name, p in keypoints.items()
                            },
                            joint_angles={
                                "left_knee": metrics.left_knee_angle,
                                "right_knee": metrics.right_knee_angle,
                                "left_elbow": metrics.left_elbow_angle,
                                "right_elbow": metrics.right_elbow_angle,
                                "left_hip": metrics.left_hip_angle,
                                "right_hip": metrics.right_hip_angle,
                                "trunk_lean_deg": metrics.trunk_lean_deg,
                                "knee_valgus_proxy": metrics.knee_valgus_proxy,
                                "knee_symmetry_diff": metrics.knee_symmetry_diff,
                            },
                        )

                    # Written for every sampled frame regardless of detection,
                    # so the annotated video's motion still flows -- frames
                    # with no detection just get a "no person detected" tag
                    # instead of being silently dropped.
                    ann_writer.write(frame_rgb, keypoints, metrics)

        except FileNotFoundError as e:
            # pose model .task file hasn't been downloaded yet
            crud.update_video_status(db, video_id, "failed", error_message=str(e))
            return
        except video_processing.InvalidVideoError as e:
            crud.update_video_status(db, video_id, "failed", error_message=str(e))
            return

        if not frame_metrics:
            raw_annotated_path.unlink(missing_ok=True)
            crud.update_video_status(
                db, video_id, "failed",
                error_message="No person detected in any analyzed frame. Try a clearer, well-lit, single-person clip.",
            )
            return

        # OpenCV's mp4v output isn't reliably browser-playable -- re-encode
        # to real H.264 before exposing it. If that fails (no ffmpeg),
        # fall back to no annotated video rather than serving a broken file.
        if annotation.reencode_for_browser(str(raw_annotated_path), str(annotated_path)):
            video.annotated_video_path = str(annotated_path)
        raw_annotated_path.unlink(missing_ok=True)
        db.commit()

        # Milestone 3, auto-run trigger: a video that got a biomechanics
        # summary also gets a baseline risk assessment right away. Fetches
        # the athlete's CURRENT profile fresh (this is a different DB
        # session than the request that kicked the upload off) -- if
        # injury_history/training_load changed since upload started, this
        # reflects that; the manual refresh endpoint exists for re-running
        # later without re-uploading.
        summary = biomechanics.summarize(frame_metrics)
        athlete = crud.get_athlete(db, athlete_id)
        assessment = injury_risk.assess_risk(
            biomechanics_summary=summary,
            frames=frame_metrics,
            injury_history=athlete.injury_history if athlete else None,
            training_load=athlete.training_load if athlete else None,
        )
        _persist_risk_assessment(db, athlete_id=athlete_id, video_id=video_id, assessment=assessment)

        crud.update_video_status(db, video_id, "completed")

    except Exception as e:  # noqa: BLE001 -- last-resort safety net
        # Anything unexpected here would otherwise vanish silently (no
        # request left to surface it to, no terminal to print a traceback
        # to that anyone's watching) -- always leave the video in a
        # terminal, explainable state instead of stuck on "processing"
        # forever.
        #
        # THE BUG THIS FIXES: if the exception came from a DB statement
        # (e.g. a schema mismatch), Postgres leaves this session's
        # transaction in an "aborted" state -- every statement after that,
        # including the status="failed" write below, gets rejected too
        # ("current transaction is aborted") until something rolls back
        # first. Without the rollback() here, that second failure was
        # being silently swallowed by the bare except right below it,
        # so the video's status update never actually happened -- it
        # just sat on "processing" forever with no visible error. This
        # is exactly what a missing DB migration (a column that exists
        # in models.py but not yet in the real table) looks like from
        # the outside: uploads that never finish, no error shown anywhere.
        try:
            db.rollback()
            crud.update_video_status(
                db, video_id, "failed", error_message=f"Unexpected processing error: {e}",
            )
        except Exception:
            pass
    finally:
        db.close()


@router.get("/", response_model=list[schemas.VideoResponse])
def list_my_videos(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _require_athlete_profile(current_user, db)
    videos = crud.get_videos_for_athlete(db, profile.athlete_id)
    return [_to_video_response(v) for v in videos]


@router.get("/{video_id}", response_model=schemas.VideoDetailResponse)
def get_video_detail(
    video_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    video = crud.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    _check_can_view(video, current_user, db)

    pose_rows = crud.get_pose_data_for_video(db, video_id)
    frame_metrics = _pose_rows_to_frame_metrics(pose_rows)
    summary = biomechanics.summarize(frame_metrics) if frame_metrics else None

    # anomalous_frames isn't persisted (see injury_risk.py's docstring) --
    # cheap to recompute here since frame_metrics is already in hand from
    # the biomechanics summary above.
    anomalous_frames = injury_risk.detect_anomalous_frames(frame_metrics) if frame_metrics else []
    risk_assessment_response = _load_latest_risk_response(db, video_id, anomalous_frames)

    return schemas.VideoDetailResponse(
        video_id=video.video_id,
        athlete_id=video.athlete_id,
        file_name=video.file_name,
        upload_date=video.upload_date,
        status=video.status,
        error_message=video.error_message,
        has_annotated_video=bool(video.annotated_video_path),
        biomechanics_summary=summary,
        risk_assessment=risk_assessment_response,
    )


@router.post("/{video_id}/risk-assessment/refresh", response_model=schemas.RiskAssessmentResponse)
def refresh_risk_assessment(
    video_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recomputes and persists a new risk assessment for this video using
    the athlete's CURRENT profile fields (injury_history/training_load
    may have changed since upload, or the engine's thresholds may have
    been retuned) -- without needing to re-upload/re-process the video
    itself, since pose_data for it is already stored.

    Same view-RBAC as GET /videos/{id} (ownership check) -- single-athlete
    scope now, so this is really just "must be your own video," same as
    everywhere else in this router.

    Each call adds a NEW injury_predictions row rather than overwriting
    the old one, so a history of past assessments accumulates naturally
    (get_video_detail always shows the latest one).
    """
    video = crud.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    _check_can_view(video, current_user, db)

    pose_rows = crud.get_pose_data_for_video(db, video_id)
    frame_metrics = _pose_rows_to_frame_metrics(pose_rows)
    if not frame_metrics:
        raise HTTPException(
            status_code=400,
            detail="No pose data available for this video yet -- nothing to assess.",
        )
    summary = biomechanics.summarize(frame_metrics)

    athlete = crud.get_athlete(db, video.athlete_id)

    assessment = injury_risk.assess_risk(
        biomechanics_summary=summary,
        frames=frame_metrics,
        injury_history=athlete.injury_history if athlete else None,
        training_load=athlete.training_load if athlete else None,
    )
    return _persist_risk_assessment(
        db, athlete_id=video.athlete_id, video_id=video.video_id, assessment=assessment,
    )


@router.get("/{video_id}/frames", response_model=list[schemas.FrameMetricsResponse])
def get_video_frames(
    video_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    video = crud.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    _check_can_view(video, current_user, db)

    pose_rows = crud.get_pose_data_for_video(db, video_id)
    return _pose_rows_to_frame_metrics(pose_rows)


@router.get("/{video_id}/annotated")
def get_annotated_video(
    video_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    video = crud.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    _check_can_view(video, current_user, db)

    if not video.annotated_video_path or not Path(video.annotated_video_path).exists():
        raise HTTPException(status_code=404, detail="No annotated video available for this upload")

    return FileResponse(video.annotated_video_path, media_type="video/mp4")


@router.delete("/{video_id}")
def delete_video(
    video_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Single-athlete scope: only the athlete who owns the video can delete it."""
    video = crud.get_video(db, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    profile = crud.get_athlete_by_user_id(db, current_user.id)
    is_owner = profile is not None and profile.athlete_id == video.athlete_id
    if not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to delete this video")

    for path_str in (video.video_path, video.annotated_video_path):
        if path_str:
            Path(path_str).unlink(missing_ok=True)

    crud.delete_video(db, video_id)
    return {"message": "Video deleted successfully"}

