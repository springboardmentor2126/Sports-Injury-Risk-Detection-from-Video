from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas, models
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(prefix="/athletes", tags=["Athletes"])


# ---------------------------------------------------------------------------
# Self-service only -- single-athlete scope. This app no longer has
# coach/physiotherapist/sports_scientist/admin roles or the staff-viewing
# endpoints (GET /, GET /{athlete_id}, GET /{athlete_id}/risk-history,
# DELETE /{athlete_id}) that used to exist for them. Every logged-in user
# manages exactly their own profile and nothing else.
# ---------------------------------------------------------------------------

@router.get("/me", response_model=schemas.AthleteResponse)
def get_my_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = crud.get_athlete_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Athlete profile not found")
    return profile


@router.put("/me", response_model=schemas.AthleteResponse)
def update_my_profile(
    athlete: schemas.AthleteUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = crud.get_athlete_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Athlete profile not found")
    return crud.update_athlete(db, profile.athlete_id, athlete)


@router.get("/me/risk-history", response_model=list[schemas.RiskHistoryEntryResponse])
def get_my_risk_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    An athlete's own risk-assessment history across every video they've
    uploaded, most-recent-first -- what the Dashboard's "Injury risk
    score" widget/trend chart pulls from.
    """
    profile = crud.get_athlete_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Athlete profile not found")
    return crud.get_predictions_for_athlete(db, profile.athlete_id)

