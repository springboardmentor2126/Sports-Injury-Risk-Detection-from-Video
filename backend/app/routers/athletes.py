from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user, require_roles

router = APIRouter(prefix="/athletes", tags=["Athlete Profile Management"])

# Roles allowed to create/edit/delete athlete records
MANAGE_ROLES = ["coach", "physiotherapist", "sports_scientist", "admin"]


@router.post("/", response_model=schemas.AthleteOut, status_code=status.HTTP_201_CREATED)
def create_athlete(
    athlete_in: schemas.AthleteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(MANAGE_ROLES)),
):
    existing = db.query(models.Athlete).filter(
        models.Athlete.athlete_code == athlete_in.athlete_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Athlete code already exists")

    athlete = models.Athlete(**athlete_in.model_dump())
    db.add(athlete)
    db.commit()
    db.refresh(athlete)
    return athlete


@router.get("/", response_model=List[schemas.AthleteOut])
def list_athletes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Athletes only see their own profile; staff roles see everyone.
    if current_user.role.value == "athlete":
        return db.query(models.Athlete).filter(
            models.Athlete.user_id == current_user.id
        ).all()
    return db.query(models.Athlete).all()


@router.get("/{athlete_id}", response_model=schemas.AthleteOut)
def get_athlete(
    athlete_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    if current_user.role.value == "athlete" and athlete.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this profile")

    return athlete


@router.put("/{athlete_id}", response_model=schemas.AthleteOut)
def update_athlete(
    athlete_id: int,
    athlete_in: schemas.AthleteUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(MANAGE_ROLES)),
):
    athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    for field, value in athlete_in.model_dump(exclude_unset=True).items():
        setattr(athlete, field, value)

    db.commit()
    db.refresh(athlete)
    return athlete


@router.delete("/{athlete_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_athlete(
    athlete_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles(["admin"])),
):
    athlete = db.query(models.Athlete).filter(models.Athlete.id == athlete_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")

    db.delete(athlete)
    db.commit()
    return None
