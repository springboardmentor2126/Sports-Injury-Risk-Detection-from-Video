# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from jose import JWTError, jwt
import os

import models, schemas
from routers import analysis
from database import engine, get_db
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM,
)

models.Base.metadata.create_all(bind=engine)  # creates the table automatically

app = FastAPI(title="Sports Injury Risk Detection Platform")

app.include_router(
    analysis.router,
    prefix="/api",
    tags=["Video Analysis"]
)

# Allows your React frontend (different port) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user(authorization: str, db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@app.get("/")
def home():
    return {"message": "Backend is running"}

# ── GET own athlete profile (Athlete only) ──────────────────────────────────
@app.get("/athletes/me")
def get_my_athlete_profile(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    user = get_current_user(authorization, db)
    if user.role != "Athlete":
        raise HTTPException(status_code=403, detail="Only athletes have an athlete profile")
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == user.id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete profile not found")
    return athlete


# ── UPDATE own athlete profile (Athlete only) ────────────────────────────────
@app.put("/athletes/me")
def update_my_athlete_profile(
    data: schemas.AthleteCreate,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    user = get_current_user(authorization, db)
    if user.role != "Athlete":
        raise HTTPException(status_code=403, detail="Only athletes can update their own profile")
    athlete = db.query(models.Athlete).filter(models.Athlete.user_id == user.id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete profile not found")
    for key, value in data.dict().items():
        setattr(athlete, key, value)
    db.commit()
    db.refresh(athlete)
    return athlete


@app.post("/athletes/", response_model=schemas.AthleteResponse)
def create_athlete(athlete: schemas.AthleteCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete.athlete_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Athlete ID already exists")
    new_athlete = models.Athlete(**athlete.model_dump())
    db.add(new_athlete)
    db.commit()
    db.refresh(new_athlete)
    return new_athlete

@app.get("/athletes/", response_model=List[schemas.AthleteResponse])
def get_athletes(db: Session = Depends(get_db)):
    return db.query(models.Athlete).all()

@app.get("/athletes/{athlete_id}", response_model=schemas.AthleteResponse)
def get_athlete(athlete_id: str, db: Session = Depends(get_db)):
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return athlete

@app.put("/athletes/{athlete_id}", response_model=schemas.AthleteResponse)
def update_athlete(athlete_id: str, updated: schemas.AthleteCreate, db: Session = Depends(get_db)):
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    for key, value in updated.model_dump().items():
        setattr(athlete, key, value)
    db.commit()
    db.refresh(athlete)
    return athlete

@app.delete("/athletes/{athlete_id}")
def delete_athlete(athlete_id: str, db: Session = Depends(get_db)):
    athlete = db.query(models.Athlete).filter(models.Athlete.athlete_id == athlete_id).first()
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    db.delete(athlete)
    db.commit()
    return {"message": "Athlete deleted successfully"}

@app.post("/register")
def register(data: schemas.UserRegister, db: Session = Depends(get_db)):
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    existing = db.query(models.User).filter(models.User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.role not in [
        "Athlete",
        "Coach",
        "Physiotherapist",
        "Sports Scientist",
        "Administrator"
    ]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = models.User(
        full_name=data.full_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        profile_completed=False
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "User registered",
        "role": user.role,
        "full_name": user.full_name,
        "profile_completed": user.profile_completed
    }

@app.post("/login")
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "profile_completed": user.profile_completed
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "email": user.email,
        "profile_completed": user.profile_completed
    }

@app.get("/me")
def get_me(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    user = get_current_user(authorization, db)
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "profile_completed": user.profile_completed
    }


@app.post("/complete-profile")
def complete_profile(
    data: schemas.CompleteProfileRequest,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    user = get_current_user(authorization, db)

    if user.role != "Athlete":
        raise HTTPException(status_code=403, detail="Only athletes complete this profile")

    existing_athlete = db.query(models.Athlete).filter(
        models.Athlete.user_id == user.id
    ).first()

    if existing_athlete:
        for key, value in data.dict().items():
            setattr(existing_athlete, key, value)
        db.commit()
        db.refresh(existing_athlete)
        athlete = existing_athlete
    else:
        athlete = models.Athlete(
            athlete_id=data.athlete_id,
            name=user.full_name,
            sport_type=data.sport_type,
            position=data.position,
            age=data.age,
            height=data.height,
            weight=data.weight,
            injury_history=data.injury_history,
            training_load=data.training_load,
            user_id=user.id
        )
        db.add(athlete)
        db.commit()
        db.refresh(athlete)

    user.profile_completed = True
    db.commit()

    new_token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "profile_completed": True
    })
    return {
        "message": "Profile completed",
        "access_token": new_token,
        "athlete_id": athlete.athlete_id
    }



# ── DELETE own account ───────────────────────────────────────────────────────
@app.delete("/users/me")
def delete_my_account(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    user = get_current_user(authorization, db)

    db.delete(user)
    db.commit()

    return {
        "message": "Account and all associated data permanently deleted"
    }