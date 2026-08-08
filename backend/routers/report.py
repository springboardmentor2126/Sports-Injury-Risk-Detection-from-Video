import os
from pathlib import Path
from urllib.parse import unquote
 
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
 
from database.database import get_db
from database import crud, schemas, models
from services import report_service
from services.auth_service import get_current_user
 
router = APIRouter(tags=["Reports"])
 
PROCESSED_DIR = Path(__file__).parent.parent / "processed_videos"
REPORTS_DIR = Path(__file__).parent.parent / "reports"
 
 
@router.get("/reports/{filename}")
async def download_report(filename: str):
    """
    Download a generated PDF biomechanics report. Path unchanged, and
    DELIBERATELY left unauthenticated: this is what the React <a> download
    link hits directly, and plain <a>/<video src> requests from the browser
    don't send an Authorization header. Protected only by the fact that
    filenames are unguessable (uuid-based) - not full per-user authorization.
    If you need real access control here later, switch the frontend to
    fetch() with the Authorization header and stream the blob instead of
    using a bare URL.
    """
    decoded_filename = unquote(filename)
    file_path = REPORTS_DIR / decoded_filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(file_path, media_type="application/pdf", filename=decoded_filename)
 
 
@router.get("/processed-videos/{filename}")
async def download_processed_video(filename: str):
    """Download / stream the processed video with skeleton overlay. Path
    unchanged. Same unauthenticated-by-necessity note as download_report above."""
    decoded_filename = unquote(filename)
    file_path = PROCESSED_DIR / decoded_filename
 
    if not file_path.exists():
        available = os.listdir(PROCESSED_DIR)
        raise HTTPException(
            status_code=404,
            detail=(
                f"Processed video not found: '{decoded_filename}'. "
                f"Files currently in processed_videos: {available}"
            ),
        )
 
    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=decoded_filename,
    )
 
 
@router.get("/health")
async def health_check():
    return {"status": "healthy"}
 
 
# ---------------------------------------------------------
# Report CRUD (Read + Delete) - scoped to the logged-in user
# ---------------------------------------------------------
@router.get("/report-records")
def list_reports(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    reports = crud.get_all_reports_for_user(db, current_user.id)
    return {"count": len(reports), "reports": reports}
 
 
@router.get("/report-records/{report_id}", response_model=schemas.ReportResponse)
def get_report_record(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    report = crud.get_report_viewable(db, report_id, current_user.id)
    if report:
        return report
 
    if crud.report_exists(db, report_id):
        raise HTTPException(status_code=403, detail="This report does not belong to you")
    raise HTTPException(status_code=404, detail="Report not found")
 
 
@router.delete("/report-records/{report_id}")
def delete_report_record(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    report = crud.get_report_for_user(db, report_id, current_user.id)
    if not report:
        if crud.report_exists(db, report_id):
            raise HTTPException(status_code=403, detail="This report does not belong to you")
        raise HTTPException(status_code=404, detail="Report not found")
 
    report_service.delete_report_files(report)
    crud.delete_report(db, report_id)
 
    return {"message": f"Report {report_id} was deleted successfully"}
 