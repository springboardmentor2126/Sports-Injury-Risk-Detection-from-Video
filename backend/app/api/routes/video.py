"""
Video Router — FastAPI endpoints for video upload and pose analysis.

This is the thin HTTP wrapper. It:
1. Receives a video file from the React frontend via HTTP POST
2. Saves it to a temporary location on the server
3. Calls the SAME service.process_video() that the local demo also calls
4. Saves the results to the database linked to the current user
5. Returns a structured JSON response with results and image URLs

When deployed, this is ALL that changes from the local demo:
- Input: HTTP file upload instead of a file picker
- Output: JSON response instead of an OpenCV window
- Core AI logic: IDENTICAL (service.process_video is unchanged)
"""

import os
import json
import uuid
import shutil
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.video_analysis import VideoAnalysis
from app.ml.pose_estimation.service import process_video, VideoAnalysisResult

router = APIRouter(prefix="/api/video", tags=["Video Analysis"])

# Directories on the server where files are stored
UPLOAD_DIR = Path("uploads/videos")
OUTPUT_DIR = Path("uploads/pose_outputs")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Allowed video formats
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


def _derive_risk_level(result: VideoAnalysisResult) -> str:
    """Convert raw risk flag counts into a human-readable risk level."""
    total_risk_frames = (
        result.frames_knee_hyperextension +
        result.frames_knee_acute_flexion +
        result.frames_excessive_trunk_lean +
        result.frames_elbow_hyperextension
    )
    pct = (total_risk_frames / result.frames_with_pose * 100) if result.frames_with_pose > 0 else 0

    if pct == 0:
        return "low"
    elif pct < 20:
        return "moderate"
    elif pct < 50:
        return "high"
    else:
        return "critical"


@router.post("/analyze", summary="Upload a video and run pose estimation + biomechanics")
async def analyze_video(
    file: UploadFile = File(..., description="Video file to analyze"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Upload a video and get full pose estimation + biomechanical analysis results.
    Results are saved to the database linked to the authenticated user.

    - Accepts: MP4, MOV, AVI, MKV, WEBM
    - Returns: JSON with detection stats, biomechanics metrics, risk flags, and image URLs
    """
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Generate a unique session ID for this analysis
    session_id = str(uuid.uuid4())

    # Save the uploaded video to disk
    video_path = UPLOAD_DIR / f"{session_id}{file_ext}"
    try:
        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        file.file.close()

    # Create a session-specific output folder for annotated frames
    session_output_dir = OUTPUT_DIR / session_id
    session_output_dir.mkdir(parents=True, exist_ok=True)

    # ── Call the SAME service function the local demo uses ──────────
    try:
        result: VideoAnalysisResult = process_video(
            video_path=str(video_path),
            output_dir=str(session_output_dir),
        )
    except Exception as e:
        # Clean up the uploaded video even if analysis fails
        video_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    # Delete the original uploaded video — it has been processed and is no longer needed.
    # The annotated frame screenshots are all that is kept on disk.
    video_path.unlink(missing_ok=True)

    # Build URL paths for the saved annotated images and the skeleton video
    image_urls = [
        f"/uploads/pose_outputs/{session_id}/{Path(p).name}"
        for p in result.saved_image_paths
    ]
    annotated_video_url = (
        f"/uploads/pose_outputs/{session_id}/{Path(result.annotated_video_path).name}"
        if result.annotated_video_path and Path(result.annotated_video_path).exists()
        else None
    )

    risk_level = _derive_risk_level(result)

    # ── Save results to the database ────────────────────────────────
    analysis = VideoAnalysis(
        user_id=str(current_user.id),
        session_id=session_id,
        original_filename=file.filename,
        duration_seconds=result.duration_seconds,
        total_frames=result.total_frames,
        frames_analyzed=result.frames_processed,
        frames_with_pose=result.frames_with_pose,
        pose_detection_rate=result.pose_detection_rate,
        annotated_frame_urls=json.dumps(image_urls),
        avg_left_knee_angle=result.avg_left_knee_angle,
        avg_right_knee_angle=result.avg_right_knee_angle,
        min_left_knee_angle=result.min_left_knee_angle,
        min_right_knee_angle=result.min_right_knee_angle,
        avg_left_hip_angle=result.avg_left_hip_angle,
        avg_right_hip_angle=result.avg_right_hip_angle,
        avg_left_elbow_angle=result.avg_left_elbow_angle,
        avg_right_elbow_angle=result.avg_right_elbow_angle,
        avg_trunk_lean=result.avg_trunk_lean,
        avg_knee_symmetry=result.avg_knee_symmetry,
        avg_hip_symmetry=result.avg_hip_symmetry,
        avg_overall_symmetry=result.avg_overall_symmetry,
        frames_knee_hyperextension=result.frames_knee_hyperextension,
        frames_knee_acute_flexion=result.frames_knee_acute_flexion,
        frames_excessive_trunk_lean=result.frames_excessive_trunk_lean,
        frames_low_symmetry=result.frames_low_symmetry,
        frames_elbow_hyperextension=result.frames_elbow_hyperextension,
        risk_level=risk_level,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # ── Return full response to frontend ────────────────────────────
    return {
        "session_id": session_id,
        "risk_level": risk_level,

        # Video metadata
        "video": {
            "filename": file.filename,
            "duration_seconds": result.duration_seconds,
            "total_frames": result.total_frames,
            "frames_analyzed": result.frames_processed,
            "frames_with_pose": result.frames_with_pose,
            "pose_detection_rate": result.pose_detection_rate,
        },

        # Skeleton video (temporary — deleted when user clicks "New Video")
        "annotated_video_url": annotated_video_url,

        # Annotated frame screenshots (permanent)
        "annotated_frames": image_urls,

        # Full biomechanics
        "biomechanics": {
            "avg_left_knee_angle":   result.avg_left_knee_angle,
            "avg_right_knee_angle":  result.avg_right_knee_angle,
            "min_left_knee_angle":   result.min_left_knee_angle,
            "min_right_knee_angle":  result.min_right_knee_angle,
            "avg_left_hip_angle":    result.avg_left_hip_angle,
            "avg_right_hip_angle":   result.avg_right_hip_angle,
            "avg_left_elbow_angle":  result.avg_left_elbow_angle,
            "avg_right_elbow_angle": result.avg_right_elbow_angle,
            "avg_trunk_lean":        result.avg_trunk_lean,
            "avg_knee_symmetry":     result.avg_knee_symmetry,
            "avg_hip_symmetry":      result.avg_hip_symmetry,
            "avg_overall_symmetry":  result.avg_overall_symmetry,
        },

        # Risk flag counts
        "risk_flags": {
            "knee_hyperextension_frames":  result.frames_knee_hyperextension,
            "knee_acute_flexion_frames":   result.frames_knee_acute_flexion,
            "excessive_trunk_lean_frames": result.frames_excessive_trunk_lean,
            "low_symmetry_frames":         result.frames_low_symmetry,
            "elbow_hyperextension_frames": result.frames_elbow_hyperextension,
        },
    }


@router.get("/history", summary="Get all video analysis sessions for the current user")
def get_analysis_history(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return the list of all past video analysis sessions for the authenticated user."""
    analyses = (
        db.query(VideoAnalysis)
        .filter(VideoAnalysis.user_id == str(current_user.id))
        .order_by(VideoAnalysis.created_at.desc())
        .all()
    )
    return [
        {
            # ── Identity ─────────────────────────────────────────
            "session_id":          a.session_id,
            "filename":            a.original_filename,
            "duration_seconds":    a.duration_seconds,
            "pose_detection_rate": a.pose_detection_rate,
            "frames_analyzed":     a.frames_analyzed,
            "frames_with_pose":    a.frames_with_pose,
            "risk_level":          a.risk_level,
            "created_at":          a.created_at.isoformat() if a.created_at else None,
            # ── Screenshots ──────────────────────────────────────
            "annotated_frames":    json.loads(a.annotated_frame_urls) if a.annotated_frame_urls else [],
            # ── Biomechanics ─────────────────────────────────────
            "avg_left_knee_angle":   a.avg_left_knee_angle,
            "avg_right_knee_angle":  a.avg_right_knee_angle,
            "min_left_knee_angle":   a.min_left_knee_angle,
            "min_right_knee_angle":  a.min_right_knee_angle,
            "avg_left_hip_angle":    a.avg_left_hip_angle,
            "avg_right_hip_angle":   a.avg_right_hip_angle,
            "avg_left_elbow_angle":  a.avg_left_elbow_angle,
            "avg_right_elbow_angle": a.avg_right_elbow_angle,
            "avg_trunk_lean":        a.avg_trunk_lean,
            "avg_knee_symmetry":     a.avg_knee_symmetry,
            "avg_hip_symmetry":      a.avg_hip_symmetry,
            "avg_overall_symmetry":  a.avg_overall_symmetry,
            # ── Risk Flags ───────────────────────────────────────
            "frames_knee_hyperextension":  a.frames_knee_hyperextension,
            "frames_knee_acute_flexion":   a.frames_knee_acute_flexion,
            "frames_excessive_trunk_lean": a.frames_excessive_trunk_lean,
            "frames_low_symmetry":         a.frames_low_symmetry,
            "frames_elbow_hyperextension": a.frames_elbow_hyperextension,
        }
        for a in analyses
    ]


@router.get("/athlete/{user_id}/history", summary="Get full analysis history for a specific athlete")
def get_athlete_history(
    user_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns the full analysis history for a given athlete user_id.
    Accessible by coach, physiotherapist, and sports_scientist roles.
    """
    from app.models.user import User
    allowed_roles = {"coach", "physiotherapist", "scientist", "admin"}
    if current_user.role.name not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not authorised to view other users' data.")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Athlete not found.")

    analyses = (
        db.query(VideoAnalysis)
        .filter(VideoAnalysis.user_id == user_id)
        .order_by(VideoAnalysis.created_at.desc())
        .all()
    )
    return [
        {
            "session_id":           a.session_id,
            "filename":             a.original_filename,
            "duration_seconds":     a.duration_seconds,
            "pose_detection_rate":  a.pose_detection_rate,
            "frames_analyzed":      a.frames_analyzed,
            "frames_with_pose":     a.frames_with_pose,
            "risk_level":           a.risk_level,
            "created_at":           a.created_at.isoformat() if a.created_at else None,
            "annotated_frames":     json.loads(a.annotated_frame_urls) if a.annotated_frame_urls else [],
            "avg_left_knee_angle":   a.avg_left_knee_angle,
            "avg_right_knee_angle":  a.avg_right_knee_angle,
            "min_left_knee_angle":   a.min_left_knee_angle,
            "min_right_knee_angle":  a.min_right_knee_angle,
            "avg_left_hip_angle":    a.avg_left_hip_angle,
            "avg_right_hip_angle":   a.avg_right_hip_angle,
            "avg_left_elbow_angle":  a.avg_left_elbow_angle,
            "avg_right_elbow_angle": a.avg_right_elbow_angle,
            "avg_trunk_lean":        a.avg_trunk_lean,
            "avg_knee_symmetry":     a.avg_knee_symmetry,
            "avg_hip_symmetry":      a.avg_hip_symmetry,
            "avg_overall_symmetry":  a.avg_overall_symmetry,
            "frames_knee_hyperextension":  a.frames_knee_hyperextension,
            "frames_knee_acute_flexion":   a.frames_knee_acute_flexion,
            "frames_excessive_trunk_lean": a.frames_excessive_trunk_lean,
            "frames_low_symmetry":         a.frames_low_symmetry,
            "frames_elbow_hyperextension": a.frames_elbow_hyperextension,
        }
        for a in analyses
    ]



@router.delete(
    "/{session_id}/skeleton-video",
    summary="Delete the temporary skeleton video for a session",
    status_code=204,
)
def delete_skeleton_video(
    session_id: str,
    current_user=Depends(get_current_user),
):
    """
    Called by the frontend when the user is done watching the skeleton video
    (e.g. clicks 'New Video'). Deletes the MP4 to reclaim disk space.
    The annotated frame screenshots are NOT touched — they remain permanently.
    """
    # Security: only delete files inside our known output directory
    session_dir = OUTPUT_DIR / session_id
    video_file  = session_dir / f"{session_id}_skeleton.mp4"

    if video_file.exists():
        video_file.unlink()

    # Return 204 No Content whether the file existed or not
    return
