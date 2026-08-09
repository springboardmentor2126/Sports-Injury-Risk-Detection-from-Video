from sqlalchemy.orm import Session

from app.models.athlete import Athlete
from app.schemas.profile import AthleteProfileCreate, AthleteProfileUpdate


def _to_dict(payload, **kwargs) -> dict:
    if hasattr(payload, 'model_dump'):
        return payload.model_dump(**kwargs)

    return payload.dict(**kwargs)


def get_athlete_profile_by_user_id(db: Session, user_id: int) -> Athlete | None:
    return db.query(Athlete).filter(Athlete.user_id == user_id).first()


def create_athlete_profile(db: Session, payload: AthleteProfileCreate) -> Athlete:
    profile = Athlete(**_to_dict(payload))
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_athlete_profile(db: Session, profile: Athlete, payload: AthleteProfileUpdate) -> Athlete:
    for field, value in _to_dict(payload, exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile
