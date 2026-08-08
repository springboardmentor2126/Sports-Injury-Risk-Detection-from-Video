from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
 
from database.database import get_db
from database import crud, schemas, models
from services import video_service, report_service, dashboard_service
from services.auth_service import get_current_user
 
router = APIRouter(tags=["Athlete"])
 
 
@router.post("/athlete-profile")
def save_athlete_profile(
    profile: schemas.AthleteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Creates or updates an athlete profile OWNED BY THE LOGGED-IN USER.
    user_id is never read from the request body - it always comes from the
    authenticated token.
 
    Upsert behavior is preserved from before (resubmitting the same
    athlete_id updates it), but scoped to THIS user: if athlete_id "ATH001"
    already exists for a different user, that's a completely separate row -
    this creates a new one for the current user rather than colliding
    (requirement #8).
    """
    existing = crud.get_athlete_for_user(db, profile.athlete_id, current_user.id)
    if existing:
        athlete = crud.update_athlete(db, existing.id, profile)
        return {
            "message": f"Athlete profile for {athlete.athlete_id} updated successfully",
            "profile": athlete,
        }
 
    # NEW: role-based restriction. A user with role "Athlete" represents
    # themselves - they should only ever manage ONE athlete profile (their
    # own). Coaches/Physiotherapists/Sports Scientists/Administrators
    # legitimately manage a roster of multiple athletes, so no limit
    # applies to those roles.
    if current_user.role == "Athlete":
        owned = crud.get_all_athletes_for_user(db, current_user.id)
        if len(owned) >= 1:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Athlete accounts can only manage a single athlete profile "
                    "(their own). To grant a coach, physiotherapist, or other "
                    "staff member access to your data, use the invite link "
                    "feature instead of creating additional profiles."
                ),
            )
 
    try:
        athlete = crud.create_athlete(db, profile, user_id=current_user.id)
    except IntegrityError:
        # Race condition: a duplicate (user_id, athlete_id) got inserted in
        # the gap between our check above and our insert.
        db.rollback()
        raise HTTPException(status_code=400, detail="Athlete ID already exists for this user")
 
    return {
        "message": f"Athlete profile for {athlete.athlete_id} saved successfully",
        "profile": athlete,
    }
 
 
@router.get("/athlete-profile/{athlete_id}")
def get_athlete_profile(
    athlete_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Viewable = owned OR shared-with-me via an accepted invite - this is
    what lets an invited coach/physio see the athlete's profile info."""
    athlete = crud.get_athlete_viewable(db, athlete_id, current_user.id)
    if athlete:
        return {"profile": athlete}
 
    if crud.athlete_id_exists_for_any_user(db, athlete_id):
        raise HTTPException(status_code=403, detail="This athlete profile does not belong to you")
 
    raise HTTPException(status_code=404, detail="Athlete profile not found")
 
 
@router.get("/athlete-profiles")
def get_all_athlete_profiles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns athletes the logged-in user OWNS, plus athletes SHARED with
    them via an accepted invite (e.g. a coach viewing athletes who invited
    them). Each profile includes is_owner so the frontend can hide
    edit/delete actions for shared (non-owned) athletes.
    """
    athletes = crud.get_all_athletes_visible_to_user(db, current_user.id)
 
    profiles = []
    for a in athletes:
        profiles.append({
            "id": a.id,
            "athlete_id": a.athlete_id,
            "sport_type": a.sport_type,
            "position": a.position,
            "age": a.age,
            "height": a.height,
            "weight": a.weight,
            "injury_history": a.injury_history,
            "training_load": a.training_load,
            "is_owner": a.user_id == current_user.id,
        })
 
    return {
        "count": len(profiles),
        "profiles": profiles,
    }
 
 
@router.get("/athlete-profile/{athlete_id}/trends")
def get_athlete_trends(
    athlete_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Athlete Intelligence Dashboard data: risk score and movement quality
    across every completed session for this athlete, oldest to newest, plus
    an overall improving/declining/stable direction.
    """
    athlete = crud.get_athlete_viewable(db, athlete_id, current_user.id)
    if not athlete:
        if crud.athlete_id_exists_for_any_user(db, athlete_id):
            raise HTTPException(status_code=403, detail="This athlete profile does not belong to you")
        raise HTTPException(status_code=404, detail="Athlete profile not found")
 
    analyses = crud.get_all_completed_analyses_for_athlete(db, athlete.id)
    trend_data = dashboard_service.build_athlete_trend(analyses)
    trend_data["athlete_id"] = athlete.athlete_id
 
    return trend_data
 
 
@router.put("/athlete-profile/{athlete_id}")
def update_athlete_profile(
    athlete_id: str,
    profile: schemas.AthleteUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = crud.get_athlete_for_user(db, athlete_id, current_user.id)
    if not existing:
        if crud.athlete_id_exists_for_any_user(db, athlete_id):
            raise HTTPException(status_code=403, detail="This athlete profile does not belong to you")
        raise HTTPException(status_code=404, detail="Athlete profile not found")
 
    updated = crud.update_athlete(db, existing.id, profile)
 
    return {
        "message": f"Athlete profile for {athlete_id} updated successfully",
        "profile": updated,
    }
 
 
@router.delete("/athlete-profile/{athlete_id}")
def delete_athlete_profile(
    athlete_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Cascade deletes: Athlete -> Videos -> AnalysisResults -> Reports (DB
    rows, via cascade="all, delete-orphan" in models.py) AND the physical
    files on disk. Only works if this athlete belongs to the current user.
    """
    athlete = crud.get_athlete_for_user(db, athlete_id, current_user.id)
    if not athlete:
        if crud.athlete_id_exists_for_any_user(db, athlete_id):
            raise HTTPException(status_code=403, detail="This athlete profile does not belong to you")
        raise HTTPException(status_code=404, detail="Athlete profile not found")
 
    # Collect + remove physical files BEFORE the DB cascade delete runs.
    for video in athlete.videos:
        for analysis in video.analysis_results:
            for report in analysis.reports:
                report_service.delete_report_files(report)
        video_service.delete_video_files(video)
 
    crud.delete_athlete(db, athlete.id)
 
    return {
        "message": (
            f"Athlete profile {athlete_id} and all associated videos, "
            f"analysis results, and reports were deleted successfully"
        )
    }
 