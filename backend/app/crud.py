from sqlalchemy.orm import Session

from . import models, schemas
from .auth import hash_password


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    # Single-athlete scope: every account IS an athlete -- no role field
    # comes in from schemas.UserCreate anymore, so this is hardcoded
    # rather than trusting client input the way a multi-role system would.
    db_user = models.User(
        full_name=user.full_name,
        email=user.email,
        password_hash=hash_password(user.password),
        role="athlete",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Every account gets an empty profile row automatically so /athletes/me
    # always has something to fetch/update -- unconditional now that
    # "athlete" is the only role that exists.
    db.add(models.AthleteProfile(user_id=db_user.id))
    db.commit()

    return db_user


# ---------------------------------------------------------------------------
# Athlete Profile
# ---------------------------------------------------------------------------

def get_athlete_by_user_id(db: Session, user_id):
    return db.query(models.AthleteProfile).filter(
        models.AthleteProfile.user_id == user_id
    ).first()


def get_athlete(db: Session, athlete_id):
    return db.query(models.AthleteProfile).filter(
        models.AthleteProfile.athlete_id == athlete_id
    ).first()


def update_athlete(db: Session, athlete_id, athlete: schemas.AthleteUpdate):
    db_athlete = get_athlete(db, athlete_id)
    if not db_athlete:
        return None

    for key, value in athlete.model_dump(exclude_unset=True).items():
        setattr(db_athlete, key, value)

    db.commit()
    db.refresh(db_athlete)
    return db_athlete


# ---------------------------------------------------------------------------
# Video / Pose Data (Milestone 2)
# ---------------------------------------------------------------------------

def create_video(db: Session, video_id, athlete_id, file_name: str, video_path: str) -> models.UploadedVideo:
    video = models.UploadedVideo(
        video_id=video_id,
        athlete_id=athlete_id,
        file_name=file_name,
        video_path=video_path,
        status="uploaded",
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


def update_video_status(db: Session, video_id, status: str, error_message: str | None = None):
    video = get_video(db, video_id)
    if not video:
        return None
    video.status = status
    video.error_message = error_message
    db.commit()
    db.refresh(video)
    return video


def get_video(db: Session, video_id):
    return db.query(models.UploadedVideo).filter(
        models.UploadedVideo.video_id == video_id
    ).first()


def get_videos_for_athlete(db: Session, athlete_id):
    return (
        db.query(models.UploadedVideo)
        .filter(models.UploadedVideo.athlete_id == athlete_id)
        .order_by(models.UploadedVideo.upload_date.desc())
        .all()
    )


def add_pose_data(db: Session, video_id, frame_number: int, joint_coordinates: dict, joint_angles: dict):
    pose = models.PoseData(
        video_id=video_id,
        frame_number=frame_number,
        joint_coordinates=joint_coordinates,
        joint_angles=joint_angles,
    )
    db.add(pose)
    db.commit()
    return pose


def get_pose_data_for_video(db: Session, video_id):
    return (
        db.query(models.PoseData)
        .filter(models.PoseData.video_id == video_id)
        .order_by(models.PoseData.frame_number)
        .all()
    )


def delete_video(db: Session, video_id):
    video = get_video(db, video_id)
    if not video:
        return None
    db.delete(video)  # cascades to pose_data rows via the model relationship
    db.commit()
    return video


# ---------------------------------------------------------------------------
# Injury Risk Prediction & Recommendations (Milestone 3)
# ---------------------------------------------------------------------------
# Deliberately thin, same as the rest of this file: these just do the DB
# write/read. The scoring/recommendation logic itself lives in
# services/injury_risk.py (pure, DB-free, unit-tested on its own) --
# routers/video.py is what bridges the two, same pattern already used for
# biomechanics (biomechanics.analyze_frame() -> crud.add_pose_data()).

def create_injury_prediction(
    db: Session,
    athlete_id,
    video_id,
    injury_type: str,
    risk_score: float,
    risk_level: str,
    contributing_factors: list[dict],
) -> models.InjuryPrediction:
    prediction = models.InjuryPrediction(
        athlete_id=athlete_id,
        video_id=video_id,
        injury_type=injury_type,
        risk_score=risk_score,
        risk_level=risk_level,
        contributing_factors=contributing_factors,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


def create_recommendation(
    db: Session,
    prediction_id,
    posture_correction: str,
    exercise_plan: str,
    recovery_plan: str,
) -> models.Recommendation:
    recommendation = models.Recommendation(
        prediction_id=prediction_id,
        posture_correction=posture_correction,
        exercise_plan=exercise_plan,
        recovery_plan=recovery_plan,
    )
    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)
    return recommendation


def get_latest_prediction_for_video(db: Session, video_id):
    """
    Most recent prediction row for a given video. A video can accumulate
    more than one over time (initial upload + any manual refresh calls) --
    this is intentionally "latest wins" for what GET /videos/{id} shows,
    while older rows stick around as history rather than being overwritten.
    """
    return (
        db.query(models.InjuryPrediction)
        .filter(models.InjuryPrediction.video_id == video_id)
        .order_by(models.InjuryPrediction.prediction_date.desc())
        .first()
    )


def get_recommendation_for_prediction(db: Session, prediction_id):
    return (
        db.query(models.Recommendation)
        .filter(models.Recommendation.prediction_id == prediction_id)
        .first()
    )


def update_prediction_narrative(db: Session, prediction_id, narrative: str):
    """
    Sets the best-effort AI-written narrative on an already-created
    prediction row (see services/report_writer.py). Separate from
    create_injury_prediction() rather than a parameter on it, since
    narrative generation is optional/best-effort and happens right
    after the row already exists -- this mirrors update_video_status()
    updating a row created moments earlier by create_video().
    """
    prediction = (
        db.query(models.InjuryPrediction)
        .filter(models.InjuryPrediction.prediction_id == prediction_id)
        .first()
    )
    if not prediction:
        return None
    prediction.ai_narrative = narrative
    db.commit()
    db.refresh(prediction)
    return prediction


def get_predictions_for_athlete(db: Session, athlete_id):
    """
    Full risk-assessment history for an athlete, across every video --
    this is athlete_id-scoped (not video_id-scoped) on purpose: an
    athlete's risk trend over time, across sessions/clips, is what an
    "Athlete intelligence dashboard" (per README's Milestone 3 scope)
    actually wants to chart, not just one video's assessments.
    Most-recent-first, same ordering convention as get_videos_for_athlete.
    """
    return (
        db.query(models.InjuryPrediction)
        .filter(models.InjuryPrediction.athlete_id == athlete_id)
        .order_by(models.InjuryPrediction.prediction_date.desc())
        .all()
    )


