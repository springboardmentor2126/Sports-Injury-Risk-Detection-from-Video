from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.athlete import AthleteProfile
from app.schemas.athlete import AthleteProfileCreate, AthleteProfileOut
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/athletes", tags=["Athlete Profile"])


@router.post("/me", response_model=AthleteProfileOut)
def create_or_update_my_profile(
    profile_in: AthleteProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == current_user.id).first()

    if profile:
        for field, value in profile_in.dict(exclude_unset=True).items():
            setattr(profile, field, value)
    else:
        profile = AthleteProfile(user_id=current_user.id, **profile_in.dict())
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/me", response_model=AthleteProfileOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Create one first with POST /athletes/me")
    return profile


@router.get("/{user_id}", response_model=AthleteProfileOut)
def get_athlete_profile_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "coach" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this profile")

    profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
