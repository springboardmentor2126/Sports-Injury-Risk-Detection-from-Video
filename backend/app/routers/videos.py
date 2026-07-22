import os
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user, require_roles
from ..pose_analysis import process_video

router = APIRouter(prefix="/videos", tags=["Video Upload, Pose Estimation & Biomechanical Analysis"])

MANAGE_ROLES = ["coach", "physiotherapist", "sports_scientist", "admin"]
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
UPLOAD_DIR = os.path.abspath(UPLOAD_DIR)
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
MAX_FILE_SIZE_MB = 200


def _check_access(athlete: models.Athlete, current_user: models.User):
    if current_user.role.value == "athlete" and athlete.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this athlete's videos")


@router.post("/upload", response_model=schemas.VideoOut, status_code=status.HTTP_201_CREATED)
async def upload_video(
    athlete_id: int = Form(...),
    activity_type: str = Form("running"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    _check_access(athlete, current_user)

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, unique_name)

    size = 0
    with open(dest_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_FILE_SIZE_MB * 1024 * 1024:
                out.close()
                os.remove(dest_path)
                raise HTTPException(status_code=400, detail=f"File exceeds {MAX_FILE_SIZE_MB}MB limit")
            out.write(chunk)

    try:
        activity_enum = models.ActivityTypeEnum(activity_type)
    except ValueError:
        activity_enum = models.ActivityTypeEnum.running

    video = models.Video(
        athlete_id=athlete_id,
        activity_type=activity_enum,
        filename=file.filename,
        filepath=dest_path,
        status=models.VideoStatusEnum.uploaded,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


def _run_processing(video_id: int):
    """Runs in a background task: process the video and persist results."""
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        video = db.query(models.Video).filter(models.Video.id == video_id).first()
        if not video:
            return
        video.status = models.VideoStatusEnum.processing
        db.commit()

        try:
            metrics = process_video(video.filepath)

            video.duration_seconds = metrics.pop("duration_seconds", None)
            video.frames_processed = metrics.pop("frames_processed", None)
            video.status = models.VideoStatusEnum.completed
            video.processed_at = datetime.utcnow()

            existing = db.query(models.BiomechanicsReport).filter(
                models.BiomechanicsReport.video_id == video.id
            ).first()
            if existing:
                db.delete(existing)
                db.commit()

            report = models.BiomechanicsReport(video_id=video.id, **metrics)
            db.add(report)
            db.commit()
        except Exception as e:
            video.status = models.VideoStatusEnum.failed
            video.error_message = str(e)
            db.commit()
    finally:
        db.close()


@router.post("/{video_id}/process", status_code=status.HTTP_202_ACCEPTED)
def trigger_processing(
    video_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    athlete = db.query(models.Athlete).filter(models.Athlete.id == video.athlete_id).first()
    _check_access(athlete, current_user)

    if video.status == models.VideoStatusEnum.processing:
        raise HTTPException(status_code=400, detail="Video is already being processed")

    background_tasks.add_task(_run_processing, video_id)
    video.status = models.VideoStatusEnum.processing
    db.commit()
    return {"message": "Processing started", "video_id": video_id}


@router.get("/", response_model=List[schemas.VideoOut])
def list_videos(
    athlete_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Video)
    if current_user.role.value == "athlete":
        own_athlete = db.query(models.Athlete).filter(
            models.Athlete.user_id == current_user.id
        ).first()
        if not own_athlete:
            return []
        query = query.filter(models.Video.athlete_id == own_athlete.id)
    elif athlete_id:
        query = query.filter(models.Video.athlete_id == athlete_id)

    return query.order_by(models.Video.uploaded_at.desc()).all()


@router.get("/{video_id}", response_model=schemas.VideoWithReportOut)
def get_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    athlete = db.query(models.Athlete).filter(models.Athlete.id == video.athlete_id).first()
    _check_access(athlete, current_user)
    return video


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(MANAGE_ROLES)),
):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if os.path.exists(video.filepath):
        try:
            os.remove(video.filepath)
        except OSError:
            pass
    db.delete(video)
    db.commit()
    return None
