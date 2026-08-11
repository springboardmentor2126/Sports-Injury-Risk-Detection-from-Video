from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .. import models, schemas
from ..dependencies import get_db
from ..auth import hash_password, verify_password
from ..jwt_handler import create_access_token, verify_token

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

security = HTTPBearer()


# ----------------------------------------------------
# Register User
# ----------------------------------------------------
@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):

    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_pwd = hash_password(user.password)

    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_pwd,

        role=user.role,

        age=user.age,
        gender=user.gender,
        height=user.height,
        weight=user.weight,
        sport=user.sport,
        experience=user.experience
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# ----------------------------------------------------
# Login
# ----------------------------------------------------
@router.post("/login")
def login(
    user: schemas.UserLogin,
    db: Session = Depends(get_db)
):

    db_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if db_user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        user.password,
        db_user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(
        data={
            "sub": db_user.email
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": db_user.role,
        "username": db_user.username
    }


# ----------------------------------------------------
# Current Logged-in User
# ----------------------------------------------------
@router.get("/me")
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):

    payload = verify_token(credentials.credentials)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid Token"
        )

    user = db.query(models.User).filter(
        models.User.email == payload["sub"]
    ).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,

        "age": user.age,
        "gender": user.gender,
        "height": user.height,
        "weight": user.weight,
        "sport": user.sport,
        "experience": user.experience
    }


# ----------------------------------------------------
# Update Athlete Profile
# ----------------------------------------------------
@router.put("/profile")
def update_profile(
    profile: schemas.ProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):

    payload = verify_token(credentials.credentials)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid Token"
        )

    user = db.query(models.User).filter(
        models.User.email == payload["sub"]
    ).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.age = profile.age
    user.gender = profile.gender
    user.height = profile.height
    user.weight = profile.weight
    user.sport = profile.sport
    user.experience = profile.experience

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile updated successfully",
        "profile": {
            "username": user.username,
            "email": user.email,
            "role": user.role,

            "age": user.age,
            "gender": user.gender,
            "height": user.height,
            "weight": user.weight,
            "sport": user.sport,
            "experience": user.experience
        }
    }