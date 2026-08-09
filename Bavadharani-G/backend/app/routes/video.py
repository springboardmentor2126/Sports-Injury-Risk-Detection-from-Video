"""
Video upload + processing endpoints.

Flow:
  1. POST /videos/upload        -> save the mp4, create a Video row (status=uploaded)
  2. POST /videos/{id}/process  -> run pose estimation + biomechanics, save report
  3. GET  /videos                -> list my videos
  4. GET  /videos/{id}/report    -> get the biomechanics report for one video
  5. GET  /videos/{id}/overlay   -> download/stream the skeleton-overlay video
"""

import os
import shutil
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.video import Video
from app.models.report import BiomechanicsReport
from app.schemas.video import VideoOut, BiomechanicsReportOut
from app.utils.dependencies import get_current_user
from app.services.pose_engine import process_video, VideoFeasibilityError

router = APIRouter(prefix="/videos", tags=["Video & Pose Analysis"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4"}
MAX_FILE_SIZE_MB = 100


@router.post("/upload", response_model=VideoOut)
async def upload_video(
    file: UploadFile = File(...),
    activity_type: str = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only .mp4 files are supported.")

    stored_filename = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(UPLOAD_DIR, stored_filename)

    with open(stored_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    size_mb = os.path.getsize(stored_path) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        os.remove(stored_path)
        raise HTTPException(status_code=400, detail=f"File too large ({size_mb:.1f}MB). Max is {MAX_FILE_SIZE_MB}MB.")

    video = Video(
        athlete_user_id=current_user.id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        activity_type=activity_type,
        status="uploaded",
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


@router.post("/{video_id}/process", response_model=BiomechanicsReportOut)
def process_uploaded_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.athlete_user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    if video.status == "completed":
        existing_report = db.query(BiomechanicsReport).filter(BiomechanicsReport.video_id == video.id).first()
        if existing_report:
            return existing_report

    input_path = os.path.join(UPLOAD_DIR, video.stored_filename)
    overlay_filename = f"overlay_{video.stored_filename}"
    output_path = os.path.join(UPLOAD_DIR, overlay_filename)

    video.status = "processing"
    db.commit()

    try:
        result = process_video(input_path, output_path)
    except VideoFeasibilityError as e:
        video.status = "failed"
        video.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        video.status = "failed"
        video.error_message = f"Unexpected processing error: {e}"
        db.commit()
        raise HTTPException(status_code=500, detail="Video processing failed unexpectedly.")

    video.status = "completed"
    video.processed_at = datetime.now(timezone.utc)
    db.commit()

    report = BiomechanicsReport(
        video_id=video.id,
        overlay_video_filename=overlay_filename,
        **result,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=list[VideoOut])
def list_my_videos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Video)
        .filter(Video.athlete_user_id == current_user.id)
        .order_by(Video.uploaded_at.desc())
        .all()
    )


@router.get("/{video_id}/report", response_model=BiomechanicsReportOut)
def get_video_report(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.athlete_user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    report = db.query(BiomechanicsReport).filter(BiomechanicsReport.video_id == video_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="No report yet — process the video first with POST /videos/{id}/process")
    return report


@router.get("/{video_id}/overlay")
def download_overlay_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.athlete_user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    report = db.query(BiomechanicsReport).filter(BiomechanicsReport.video_id == video_id).first()
    if not report or not report.overlay_video_filename:
        raise HTTPException(status_code=404, detail="Overlay video not available yet.")

    file_path = os.path.join(UPLOAD_DIR, report.overlay_video_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Overlay video file missing on server.")

    return FileResponse(file_path, media_type="video/mp4", filename=f"skeleton_{video.original_filename}")
