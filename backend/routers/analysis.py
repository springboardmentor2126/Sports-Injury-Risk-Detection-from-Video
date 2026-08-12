from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Depends
from sqlalchemy.orm import Session
import shutil
import os
import glob
import json
from datetime import datetime

from database import get_db
from vision.video_processor import extract_frames
from vision.pose_estimator import detect_pose_for_frames
from vision.biomechanics import (
    calculate_frame_metrics, aggregate_metrics,
    calculate_movement_quality_score, detect_movement_anomalies
)
from vision.risk_scoring import calculate_injury_risk
from vision.recommendation_engine import generate_recommendations
from vision.report_generator import generate_biomechanics_report
import models

router = APIRouter()

VIDEO_DIR = "uploads/videos"
FRAME_DIR = "uploads/frames"


def _resolve_user(authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    from jose import jwt, JWTError
    token = authorization.replace("Bearer ", "")
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-to-something-random")
    ALGORITHM = "HS256"
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        return db.query(models.User).filter(models.User.email == email).first()
    except JWTError:
        return None


def _get_pose_results_for_video(video_filename: str):
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
    return detect_pose_for_frames(frame_paths), len(frame_paths)


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
    pose_results, total_frames = _get_pose_results_for_video(video_filename)
    return {
        "video_filename": video_filename,
        "total_frames": total_frames,
        "frames_with_pose_detected": len(pose_results),
        "results": pose_results
    }


@router.post("/biomechanics-report/")
async def biomechanics_report(
    video_filename: str,
    athlete_id: str = None,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    pose_results, total_frames = _get_pose_results_for_video(video_filename)
    if not pose_results:
        raise HTTPException(
            status_code=422,
            detail="No pose detected in any frame of this video"
        )

    per_frame_metrics = [calculate_frame_metrics(e["landmarks"]) for e in pose_results]
    summary = aggregate_metrics(per_frame_metrics)
    quality_result = calculate_movement_quality_score(summary)
    anomalies = detect_movement_anomalies(summary)

    injury_history = ""
    training_load = ""
    athlete_info = None

    if athlete_id:
        athlete = db.query(models.Athlete).filter(
            models.Athlete.athlete_id == athlete_id
        ).first()
        if athlete:
            injury_history = athlete.injury_history or ""
            training_load = athlete.training_load or ""
            athlete_info = {
                "athlete_id": athlete.athlete_id,
                "name": athlete.name,
                "sport_type": athlete.sport_type or "",
                "age": athlete.age,
            }

    risk_result = calculate_injury_risk(summary, injury_history, training_load)
    recommendations = generate_recommendations(
        summary, anomalies, risk_result, injury_history, training_load
    )

    report = generate_biomechanics_report(
        video_filename=video_filename,
        frames_analyzed=len(per_frame_metrics),
        summary=summary,
        quality_result=quality_result,
        risk_result=risk_result,
        anomalies=anomalies,
        recommendations=recommendations,
        athlete_info=athlete_info
    )

    # Save report to database
    current_user = _resolve_user(authorization, db)
    if current_user:
        db_report = models.Report(
            report_id=report["report_id"],
            user_id=current_user.id,
            athlete_id=athlete_id,
            athlete_name=athlete_info["name"] if athlete_info else None,
            video_filename=video_filename,
            frames_analyzed=len(per_frame_metrics),
            movement_quality_score=quality_result.get("movement_quality_score"),
            quality_label=quality_result.get("quality_label"),
            injury_risk_score=risk_result.get("injury_risk_score"),
            risk_category=risk_result.get("risk_category"),
            report_json=json.dumps(report),
            created_at=datetime.utcnow()
        )
        db.add(db_report)
        db.commit()

    return report


@router.get("/reports/")
async def get_report_history(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    current_user = _resolve_user(authorization, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    reports = (
        db.query(models.Report)
        .filter(models.Report.user_id == current_user.id)
        .order_by(models.Report.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "report_id": r.report_id,
            "video_filename": r.video_filename,
            "athlete_name": r.athlete_name,
            "athlete_id": r.athlete_id,
            "movement_quality_score": r.movement_quality_score,
            "quality_label": r.quality_label,
            "injury_risk_score": r.injury_risk_score,
            "risk_category": r.risk_category,
            "created_at": r.created_at.isoformat(),
            "frames_analyzed": r.frames_analyzed,
        }
        for r in reports
    ]


@router.get("/reports/{report_id}")
async def get_report_by_id(
    report_id: str,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    current_user = _resolve_user(authorization, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    report = db.query(models.Report).filter(
        models.Report.report_id == report_id,
        models.Report.user_id == current_user.id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.report_json:
        return json.loads(report.report_json)

    return {
        "report_id": report.report_id,
        "video_filename": report.video_filename,
        "athlete_name": report.athlete_name,
        "movement_quality": {
            "score": report.movement_quality_score,
            "label": report.quality_label
        },
        "injury_risk": {
            "score": report.injury_risk_score,
            "category": report.risk_category
        },
        "created_at": report.created_at.isoformat()
    }


@router.get("/reports/{report_id}/progress")
async def get_progress_comparison(
    report_id: str,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    current_user = _resolve_user(authorization, db)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    current_report = db.query(models.Report).filter(
        models.Report.report_id == report_id,
        models.Report.user_id == current_user.id
    ).first()
    if not current_report:
        raise HTTPException(status_code=404, detail="Report not found")

    previous_report = (
        db.query(models.Report)
        .filter(
            models.Report.user_id == current_user.id,
            models.Report.created_at < current_report.created_at
        )
        .order_by(models.Report.created_at.desc())
        .first()
    )

    if not previous_report:
        return {"has_previous": False, "current_report_id": report_id}

    q_change = None
    r_change = None
    if current_report.movement_quality_score and previous_report.movement_quality_score:
        q_change = round(
            current_report.movement_quality_score - previous_report.movement_quality_score, 2
        )
    if current_report.injury_risk_score and previous_report.injury_risk_score:
        r_change = round(
            current_report.injury_risk_score - previous_report.injury_risk_score, 2
        )

    return {
        "has_previous": True,
        "current": {
            "report_id": current_report.report_id,
            "date": current_report.created_at.isoformat(),
            "movement_quality_score": current_report.movement_quality_score,
            "quality_label": current_report.quality_label,
            "injury_risk_score": current_report.injury_risk_score,
            "risk_category": current_report.risk_category,
        },
        "previous": {
            "report_id": previous_report.report_id,
            "date": previous_report.created_at.isoformat(),
            "movement_quality_score": previous_report.movement_quality_score,
            "quality_label": previous_report.quality_label,
            "injury_risk_score": previous_report.injury_risk_score,
            "risk_category": previous_report.risk_category,
        },
        "progress": {
            "movement_quality_change": q_change,
            "injury_risk_change": r_change,
            "movement_quality_trend": (
                "improved" if q_change and q_change > 0 else
                "declined" if q_change and q_change < 0 else "unchanged"
            ),
            "injury_risk_trend": (
                "improved" if r_change and r_change < 0 else
                "worsened" if r_change and r_change > 0 else "unchanged"
            ),
        }
    }