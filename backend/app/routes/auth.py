import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud.athlete import get_athlete_profile_by_user_id
from app.crud.user import authenticate_user, create_user, get_user_by_email
from app.database.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse, SignupRequest, SignupResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/login', response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = authenticate_user(db, payload.email, payload.password)

    if not user:
        logger.warning('Failed login attempt for email=%s', payload.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid email or password.',
        )

    profile_exists = get_athlete_profile_by_user_id(db, user.user_id) is not None
    logger.info('User logged in successfully user_id=%s role=%s', user.user_id, user.role)
    return LoginResponse(
        success=True,
        message='Login successful.',
        user_id=user.user_id,
        role=user.role,
        full_name=user.full_name,
        profile_exists=profile_exists,
    )


@router.post('/signup', response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> SignupResponse:
    if get_user_by_email(db, payload.email):
        logger.warning('Duplicate signup attempt for email=%s', payload.email)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='An account with this email already exists.')

    user = create_user(db, payload)
    logger.info('User account created user_id=%s role=%s', user.user_id, user.role)
    return SignupResponse(
        success=True,
        message='Account created successfully.',
        user_id=user.user_id,
        role=user.role,
        full_name=user.full_name,
        profile_exists=False,
    )
