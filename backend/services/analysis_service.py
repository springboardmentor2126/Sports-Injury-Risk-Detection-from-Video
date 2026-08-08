import json
import logging
import re
import shutil
import uuid
from pathlib import Path
from urllib.parse import quote
 
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
 
from database import crud, models
from database.database import SessionLocal
 
from utils.skeleton_tracking import process_video_with_skeleton
from utils.biomechanics import analyze_sequence_biomechanics
from utils.movement_quality import generate_quality_report
from utils.report_generator import generate_biomechanics_report
from utils.injury_risk_engine import (
    predict_injury_risks,
    calculate_weighted_risk_score,
    generate_corrective_recommendations,
)
from services.anomaly_detection_service import detect_movement_anomalies
 
logger = logging.getLogger("uvicorn.error")
 
# -----------------------------
# Directories
# -----------------------------
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
 
PROCESSED_DIR = Path(__file__).parent.parent / "processed_videos"
PROCESSED_DIR.mkdir(exist_ok=True)
 
REPORTS_DIR = Path(__file__).parent.parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)
 
BASE_URL = "http://127.0.0.1:8000"
 
 
# -----------------------------
# Helper Function
# -----------------------------
def sanitize_stem(name: str) -> str:
    """
    Strip a filename down to a safe stem: letters, digits, underscore, hyphen
    only. Prevents spaces/parentheses/unicode in the ORIGINAL upload name
    from ever mismatching between disk, DB, and what the frontend requests.
    """
    stem = Path(name).stem
    stem = re.sub(r"[^A-Za-z0-9_-]+", "_", stem).strip("_")
    return stem[:50] or "video"
 
 
def _safe_json_load(raw, fallback):
    """
    Some analyses created before the overall_risk_score str()->json.dumps()
    fix have corrupted (non-JSON) data in these columns. Rather than let one
    bad legacy row crash things for every other analysis, fall back to an
    empty value for just that field.
    """
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return fallback
 
 
def _get_athlete_history_biomechanics(db: Session, athlete_pk_id: int, exclude_analysis_id: int = None):
    """
    Fetches this athlete's past sessions and parses their stored
    biomechanics JSON, skipping any that are missing/corrupted/still
    processing. Used to build the baseline for anomaly detection - computed
    fresh every time, never persisted.
    """
    past_analyses = crud.get_recent_analyses_for_athlete(
        db, athlete_pk_id, exclude_analysis_id=exclude_analysis_id
    )
    history = []
    for past in past_analyses:
        parsed = _safe_json_load(past.biomechanics, None)
        if parsed:
            history.append(parsed)
    return history
 
 
# ---------------------------------------------------------
# FAST PATH - runs inside the request, must return quickly.
# Only does the cheap part: save the file to disk, create placeholder DB
# rows. The actual AI pipeline is NOT run here.
# ---------------------------------------------------------
def create_pending_upload(video: UploadFile, athlete: models.Athlete, db: Session):
    """
    Saves the uploaded file and creates placeholder Video + AnalysisResult
    rows with status="processing". Returns immediately - the heavy work
    (pose tracking, biomechanics, PDF generation) happens afterward in
    process_video_analysis_background(), scheduled as a FastAPI
    BackgroundTask by the router.
 
    This MUST happen synchronously, in-request: video.file (the upload's
    underlying temp file) is only guaranteed valid for the duration of the
    request - by the time a background task runs, Starlette may have already
    cleaned it up. Saving it to a real path on disk first means the
    background task can safely reopen it by path later.
    """
    original_ext = Path(video.filename).suffix.lower() or ".mp4"
    unique_id = uuid.uuid4().hex[:10]
    safe_stem = sanitize_stem(video.filename)
    stored_filename = f"{unique_id}_{safe_stem}{original_ext}"
 
    file_path = UPLOAD_DIR / stored_filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
 
    video_record = crud.create_video(
        db,
        athlete_pk_id=athlete.id,
        original_filename=video.filename,
        stored_filename=stored_filename,
        processed_filename=None,  # not known yet - the background task fills this in
    )
 
    analysis_record = crud.create_pending_analysis(
        db, athlete_pk_id=athlete.id, video_id=video_record.id
    )
 
    return video_record, analysis_record, file_path
 
 
# ---------------------------------------------------------
# SLOW PATH - runs in FastAPI's background task threadpool, AFTER the
# upload response has already been sent to the client. Completely
# decoupled from the original HTTP request: if the user navigates to
# another page, closes the Results tab, whatever - this keeps running on
# the server regardless, because it's not tied to that request/response
# cycle anymore.
# ---------------------------------------------------------
def process_video_analysis_background(
    analysis_id: int,
    video_id: int,
    file_path: str,
    original_filename: str,
    athlete_name: str,
    athlete_pk_id: int,
):
    """
    Runs the actual pose tracking / biomechanics / injury risk / PDF
    pipeline, then updates the AnalysisResult row created earlier.
 
    IMPORTANT: uses its OWN database session (SessionLocal()), never the
    request-scoped one - that session is closed by the time this function
    runs (it's cleaned up right after the response is sent), so reusing it
    here would be unsafe / could raise "session is closed" errors.
    """
    db = SessionLocal()
    try:
        athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_pk_id).first()
        athlete_profile = {
            "athlete_id": athlete.athlete_id,
            "sport_type": athlete.sport_type,
            "position": athlete.position,
            "age": athlete.age,
            "height": athlete.height,
            "weight": athlete.weight,
            "injury_history": athlete.injury_history,
            "training_load": athlete.training_load,
        } if athlete else {}
 
        tracking_result = process_video_with_skeleton(
            file_path,
            output_folder=str(PROCESSED_DIR),
        )
 
        biomechanics = analyze_sequence_biomechanics(tracking_result["all_joints"])
        quality = generate_quality_report(biomechanics)
 
        injury_risks = predict_injury_risks(biomechanics, athlete_profile)
        risk_score_summary = calculate_weighted_risk_score(biomechanics, athlete_profile)
        recommendations = generate_corrective_recommendations(injury_risks)
 
        report_path = generate_biomechanics_report(
            athlete_name=athlete_name,
            filename=original_filename,
            total_frames=tracking_result["total_frames"],
            detected_frames=tracking_result["detected_frames"],
            metrics=biomechanics["range_of_motion"],
            movement_quality=quality,
            output_folder=str(REPORTS_DIR),
            athlete_profile=athlete_profile,
            injury_risks=injury_risks,
            risk_score_summary=risk_score_summary,
        )
 
        processed_video_name = Path(tracking_result["processed_video"]).name
        report_name = Path(report_path).name
 
        if not (PROCESSED_DIR / processed_video_name).exists():
            raise Exception(f"Processed video was not saved correctly: {processed_video_name}")
        if not (REPORTS_DIR / report_name).exists():
            raise Exception(f"Report was not saved correctly: {report_name}")
 
        processed_video_url = f"{BASE_URL}/processed-videos/{quote(processed_video_name, safe='')}"
        report_url = f"{BASE_URL}/reports/{quote(report_name, safe='')}"
 
        crud.update_video_processed_filename(db, video_id, processed_video_name)
 
        crud.finalize_analysis_result(
            db,
            analysis_id=analysis_id,
            overall_risk_score=risk_score_summary,
            movement_quality=quality,
            injury_risks=injury_risks,
            recommendations=recommendations,
            biomechanics=biomechanics,
        )
 
        crud.create_report(
            db=db,
            analysis_id=analysis_id,
            report_name=report_name,
            report_path=str(REPORTS_DIR / report_name),
            report_url=report_url,
            processed_video=processed_video_name,
            processed_video_url=processed_video_url,
        )
 
    except Exception as e:
        logger.exception(f"Background video processing failed for analysis {analysis_id}")
        crud.mark_analysis_failed(db, analysis_id, f"{type(e).__name__}: {e}")
 
    finally:
        db.close()
 
 
# -----------------------------
# Reconstruct the JSON shape for GET /analysis/{id}
# -----------------------------
def build_analysis_response(analysis, db: Session = None) -> dict:
    video = analysis.video
    report = analysis.reports[0] if analysis.reports else None
    athlete = analysis.athlete
 
    response = {
        "analysis_id": str(analysis.id),
        "video_id": video.id if video else None,
        "status": analysis.status or "completed",
        "error_message": analysis.error_message,
        "filename": video.original_filename if video else None,
        "athlete_id": athlete.athlete_id if athlete else None,
        "athlete_name": athlete.athlete_id if athlete else None,
        "biomechanics": _safe_json_load(analysis.biomechanics, {}),
        "movement_quality": _safe_json_load(analysis.movement_quality, {}),
        "injury_risks": _safe_json_load(analysis.injury_risks, {}),
        "risk_score_summary": _safe_json_load(analysis.overall_risk_score, {}),
        "recommendations": _safe_json_load(analysis.recommendations, []),
        "report_download": report.report_url if report else None,
        "processed_video_download": report.processed_video_url if report else None,
    }
 
    # Only compute anomaly detection when a db session is supplied (single
    # analysis view), and only once the analysis has actually completed -
    # skipped for bulk list endpoints (N+1 queries) and for
    # still-processing/failed rows (nothing meaningful to compare yet).
    if db is not None and response["status"] == "completed":
        history = _get_athlete_history_biomechanics(
            db, analysis.athlete_pk_id, exclude_analysis_id=analysis.id
        )
        response["movement_anomalies"] = detect_movement_anomalies(response["biomechanics"], history)
 
    return response
 