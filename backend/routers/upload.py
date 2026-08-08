import logging
 
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
 
from database.database import get_db
from database import crud, schemas, models
from services import analysis_service, video_service, report_service
from services.auth_service import get_current_user
 
logger = logging.getLogger("uvicorn.error")
 
router = APIRouter(tags=["Upload"])
 
 
@router.post("/upload-video")
async def upload_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    athlete_name: str = Form("Athlete"),
    athlete_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Upload a sports video and START (but do not wait for) the injury-risk
    analysis pipeline.
 
    CHANGED (async processing): this endpoint now only does the FAST part
    synchronously - saving the file and creating placeholder DB rows - then
    schedules the actual pose tracking / biomechanics / PDF pipeline as a
    background task and returns immediately with status="processing".
 
    Why: the full pipeline can take well over a minute for longer videos.
    Previously the client had to stay on this request the entire time; if
    the user navigated away, the in-flight request (and its eventual
    navigate() to the results page) was tied to a component that may no
    longer be mounted. Now the response comes back in a second or two, the
    frontend can navigate to /results (which polls for status) or anywhere
    else immediately, and the actual processing keeps running on the server
    regardless of what the user's browser does next.
 
    athlete_id is REQUIRED - every video must belong to an athlete so
    ownership can be determined, and it's resolved against the CURRENT
    LOGGED-IN USER's athletes only - if it doesn't belong to this user, we
    return 403/404 before doing any work at all.
    """
    athlete = crud.get_athlete_for_user(db, athlete_id, current_user.id)
    if not athlete:
        if crud.athlete_id_exists_for_any_user(db, athlete_id):
            raise HTTPException(status_code=403, detail="This athlete profile does not belong to you")
        raise HTTPException(status_code=404, detail="Athlete profile not found")
 
    try:
        video_record, analysis_record, file_path = analysis_service.create_pending_upload(
            video=video,
            athlete=athlete,
            db=db,
        )
    except Exception as e:
        logger.exception("upload-video: failed to save file / create pending rows")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")
 
    background_tasks.add_task(
        analysis_service.process_video_analysis_background,
        analysis_id=analysis_record.id,
        video_id=video_record.id,
        file_path=str(file_path),
        original_filename=video.filename,
        athlete_name=athlete_name,
        athlete_pk_id=athlete.id,
    )
 
    return {
        "analysis_id": str(analysis_record.id),
        "status": "processing",
        "message": (
            f"Video {video.filename} uploaded successfully. Analysis is running "
            f"in the background - you can navigate away and check back later."
        ),
    }
 
 
# ---------------------------------------------------------
# Video CRUD (Read + Delete) - scoped to the logged-in user's athletes
# ---------------------------------------------------------
@router.get("/videos")
def list_videos(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    videos = crud.get_all_videos_for_user(db, current_user.id)
    return {"count": len(videos), "videos": videos}
 
 
@router.get("/videos/{video_id}", response_model=schemas.VideoResponse)
def get_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    video = crud.get_video_viewable(db, video_id, current_user.id)
    if video:
        return video
 
    if crud.video_exists(db, video_id):
        raise HTTPException(status_code=403, detail="This video does not belong to you")
    raise HTTPException(status_code=404, detail="Video not found")
 
 
@router.delete("/videos/{video_id}")
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Deletes a video's DB rows (cascading to its analysis results and
    reports) and its physical files - only if it belongs to the current user."""
    video = crud.get_video_for_user(db, video_id, current_user.id)
    if not video:
        if crud.video_exists(db, video_id):
            raise HTTPException(status_code=403, detail="This video does not belong to you")
        raise HTTPException(status_code=404, detail="Video not found")
 
    for analysis in video.analysis_results:
        for report in analysis.reports:
            report_service.delete_report_files(report)
 
    video_service.delete_video_files(video)
    crud.delete_video(db, video_id)
 
    return {"message": f"Video {video_id} and its associated data were deleted successfully"}
 