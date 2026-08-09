import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud.athlete import create_athlete_profile, get_athlete_profile_by_user_id, update_athlete_profile
from app.crud.user import get_user_by_id
from app.database.database import get_db
from app.schemas.profile import AthleteProfileCreate, AthleteProfileRead, AthleteProfileUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/athlete/profile', tags=['athlete-profile'])


@router.post('', response_model=AthleteProfileRead, status_code=status.HTTP_201_CREATED)
def save_athlete_profile(payload: AthleteProfileCreate, db: Session = Depends(get_db)) -> AthleteProfileRead:
    user = get_user_by_id(db, payload.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found.')

    if user.role != 'athlete':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only athletes can create athlete profiles.')

    if get_athlete_profile_by_user_id(db, payload.user_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Athlete profile already exists.')

    profile = create_athlete_profile(db, payload)
    logger.info('Athlete profile created athlete_id=%s user_id=%s', profile.athlete_id, profile.user_id)
    return profile


@router.get('/{user_id}', response_model=AthleteProfileRead)
def fetch_athlete_profile(user_id: int, db: Session = Depends(get_db)) -> AthleteProfileRead:
    profile = get_athlete_profile_by_user_id(db, user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Athlete profile not found.')

    return profile


@router.put('/{user_id}', response_model=AthleteProfileRead)
def update_profile(user_id: int, payload: AthleteProfileUpdate, db: Session = Depends(get_db)) -> AthleteProfileRead:
    profile = get_athlete_profile_by_user_id(db, user_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Athlete profile not found.')

    updated_profile = update_athlete_profile(db, profile, payload)
    logger.info('Athlete profile updated athlete_id=%s user_id=%s', updated_profile.athlete_id, updated_profile.user_id)
    return updated_profile
