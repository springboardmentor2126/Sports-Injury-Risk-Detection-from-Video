from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
 
from database.database import get_db
from database import crud, models
from services import analysis_service, report_service
from services.auth_service import get_current_user
 
router = APIRouter(tags=["Analysis"])
 
 
@router.get("/analysis/{analysis_id}")
def get_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Same endpoint path and response shape as before. Now scoped to the
    logged-in user: only returns this analysis if it belongs to one of
    their athletes.
    """
    try:
        analysis_pk = int(analysis_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Analysis not found")
 
    analysis = crud.get_analysis_viewable(db, analysis_pk, current_user.id)
    if analysis:
        return analysis_service.build_analysis_response(analysis, db=db)
 
    if crud.analysis_exists(db, analysis_pk):
        raise HTTPException(status_code=403, detail="This analysis does not belong to you")
    raise HTTPException(status_code=404, detail="Analysis not found")
 
 
# ---------------------------------------------------------
# Analysis CRUD (Read + Delete) - scoped to the logged-in user
# ---------------------------------------------------------
@router.get("/analyses")
def list_analyses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    analyses = crud.get_all_analysis_for_user(db, current_user.id)
    return {
        "count": len(analyses),
        "analyses": [analysis_service.build_analysis_response(a) for a in analyses],
    }
 
 
@router.delete("/analysis/{analysis_id}")
def delete_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Deletes an analysis result's DB row (cascading to its reports) and
    the physical PDF report file - only if it belongs to the current user."""
    try:
        analysis_pk = int(analysis_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Analysis not found")
 
    analysis = crud.get_analysis_for_user(db, analysis_pk, current_user.id)
    if not analysis:
        if crud.analysis_exists(db, analysis_pk):
            raise HTTPException(status_code=403, detail="This analysis does not belong to you")
        raise HTTPException(status_code=404, detail="Analysis not found")
 
    for report in analysis.reports:
        report_service.delete_report_files(report)
 
    crud.delete_analysis(db, analysis_pk)
 
    return {"message": f"Analysis {analysis_id} and its report were deleted successfully"}
 