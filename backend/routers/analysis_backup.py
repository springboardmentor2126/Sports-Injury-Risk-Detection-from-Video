from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
import shutil
import os
import glob

from database import get_db
import models

from vision.video_processor import extract_frames
from vision.pose_estimator import detect_pose_for_frames
from vision.biomechanics import calculate_frame_metrics, aggregate_metrics, calculate_movement_quality_score
from vision.risk_scoring import calculate_injury_risk
from vision.report_generator import generate_biomechanics_report

router = APIRouter()

VIDEO_DIR = "uploads/videos"
FRAME_DIR = "uploads/frames"

@router.post("/upload-video/")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".mp4", ".mov", ".avi")):
        raise HTTPException(status_code=400, detail="Only .mp4, .mov, or .avi files are supported")

    video_path = os.path.join(VIDEO_DIR, file.filename)
    os.makedirs(VIDEO_DIR, exist_ok=True)

    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    video_name = os.path.splitext(file.filename)[0]
    output_dir = os.path.join(FRAME_DIR, video_name)

    try:
        frames = extract_frames(video_path, output_dir)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Video uploaded and frames extracted successfully",
        "video_filename": file.filename,
        "frames_extracted": len(frames),
        "frame_folder": output_dir
    }

@router.post("/detect-pose/")
async def detect_pose(video_filename: str):
    """
    Runs pose detection on all frames already extracted for a given video.
    video_filename should be the original uploaded filename, e.g. "test.mp4".
    """
    video_name = os.path.splitext(video_filename)[0]
    frame_dir = os.path.join(FRAME_DIR, video_name)

    if not os.path.isdir(frame_dir):
        raise HTTPException(
            status_code=404,
            detail=f"No extracted frames found for '{video_filename}'. Upload the video first."
        )

    frame_paths = sorted(glob.glob(os.path.join(frame_dir, "*.jpg")))

    if not frame_paths:
        raise HTTPException(status_code=404, detail="Frame folder exists but contains no images")

    pose_results = detect_pose_for_frames(frame_paths)

    return {
        "video_filename": video_filename,
        "total_frames": len(frame_paths),
        "frames_with_pose_detected": len(pose_results),
        "results": pose_results
    }

def _get_pose_results_for_video(video_filename: str):
    """Shared helper: locates frames and runs pose detection for a video."""
    video_name = os.path.splitext(video_filename)[0]
    frame_dir = os.path.join(FRAME_DIR, video_name)

    if not os.path.isdir(frame_dir):
        raise HTTPException(
            status_code=404,
            detail=f"No extracted frames found for '{video_filename}'. Upload the video first."
        )

    frame_paths = sorted(glob.glob(os.path.join(frame_dir, "*.jpg")))
    if not frame_paths:
        raise HTTPException(status_code=404, detail="Frame folder exists but contains no images")

    return detect_pose_for_frames(frame_paths)


@router.post("/extract-features/")
async def extract_features(video_filename: str):
    """
    Runs pose detection + biomechanical analysis across all frames of a video.
    Returns per-frame metrics and an aggregated movement quality summary.
    """
    pose_results = _get_pose_results_for_video(video_filename)

    if not pose_results:
        raise HTTPException(status_code=422, detail="No pose detected in any frame of this video")

    per_frame_metrics = []
    for entry in pose_results:
        metrics = calculate_frame_metrics(entry["landmarks"])
        per_frame_metrics.append(metrics)

    summary = aggregate_metrics(per_frame_metrics)

    return {
        "video_filename": video_filename,
        "frames_analyzed": len(per_frame_metrics),
        "per_frame_metrics": per_frame_metrics,
        "summary": summary
    }

@router.post("/injury-risk/")
async def injury_risk(
    video_filename: str,
    athlete_id: str = None,
    db: Session = Depends(get_db)
):
    """
    Runs the full pipeline:
    Pose Detection → Biomechanics → Injury Risk Scoring.
    If athlete_id is provided, injury history and training load
    are automatically fetched from the Athlete database.
    """

    pose_results = _get_pose_results_for_video(video_filename)

    if not pose_results:
        raise HTTPException(
            status_code=422,
            detail="No pose detected in any frame of this video"
        )

    per_frame_metrics = []

    for entry in pose_results:
        metrics = calculate_frame_metrics(entry["landmarks"])
        per_frame_metrics.append(metrics)

    summary = aggregate_metrics(per_frame_metrics)

    injury_history = ""
    training_load = ""
    athlete_info = None

    if athlete_id:
        athlete = (
            db.query(models.Athlete)
            .filter(models.Athlete.athlete_id == athlete_id)
            .first()
        )

        if not athlete:
            raise HTTPException(
                status_code=404,
                detail=f"Athlete '{athlete_id}' not found"
            )

        injury_history = athlete.injury_history or ""
        training_load = athlete.training_load or ""

        athlete_info = {
            "athlete_id": athlete.athlete_id,
            "name": athlete.name
        }

    risk_result = calculate_injury_risk(
        summary,
        injury_history,
        training_load
    )

    return {
        "video_filename": video_filename,
        "athlete": athlete_info,
        "frames_analyzed": len(per_frame_metrics),
        "biomechanics_summary": summary,
        **risk_result
    }


@router.post("/movement-quality/")
async def movement_quality(video_filename: str):
    """
    Returns the Movement Quality Score (Module 8) for a video —
    a technique-efficiency score, separate from injury risk.
    """
    pose_results = _get_pose_results_for_video(video_filename)
    if not pose_results:
        raise HTTPException(status_code=422, detail="No pose detected in any frame of this video")

    per_frame_metrics = [calculate_frame_metrics(entry["landmarks"]) for entry in pose_results]
    summary = aggregate_metrics(per_frame_metrics)
    quality_result = calculate_movement_quality_score(summary)

    return {
        "video_filename": video_filename,
        "frames_analyzed": len(per_frame_metrics),
        "biomechanics_summary": summary,
        **quality_result
    }

@router.post("/biomechanics-report/")
async def biomechanics_report(
    video_filename: str,
    athlete_id: str = None,
    db: Session = Depends(get_db)
):
    """
    Generates the full biomechanics report for a video:
    pose detection + biomechanical metrics +
    movement quality + injury risk (if athlete linked).
    """
    pose_results = _get_pose_results_for_video(video_filename)

    if not pose_results:
        raise HTTPException(
            status_code=422,
            detail="No pose detected in any frame of this video"
        )

    per_frame_metrics = [
        calculate_frame_metrics(entry["landmarks"])
        for entry in pose_results
    ]

    summary = aggregate_metrics(per_frame_metrics)
    quality_result = calculate_movement_quality_score(summary)

    risk_result = None
    athlete_info = None
    injury_history = ""
    training_load = ""

    if athlete_id:
        athlete = (
            db.query(models.Athlete)
            .filter(models.Athlete.athlete_id == athlete_id)
            .first()
        )

        if not athlete:
            raise HTTPException(
                status_code=404,
                detail=f"Athlete '{athlete_id}' not found"
            )

        athlete_info = {
            "athlete_id": athlete.athlete_id,
            "name": athlete.name
        }

        injury_history = athlete.injury_history or ""
        training_load = athlete.training_load or ""

        risk_result = calculate_injury_risk(
            summary,
            injury_history,
            training_load
        )

    report = generate_biomechanics_report(
        video_filename=video_filename,
        frames_analyzed=len(per_frame_metrics),
        summary=summary,
        quality_result=quality_result,
        risk_result=risk_result,
        athlete_info=athlete_info,
    )

    return report