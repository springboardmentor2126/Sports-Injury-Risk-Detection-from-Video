from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict

from .models import RoleEnum


# ---------- Auth / User ----------

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: RoleEnum = RoleEnum.athlete


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    role: RoleEnum
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: RoleEnum
    full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ---------- Athlete ----------

class AthleteBase(BaseModel):
    athlete_code: str
    sport_type: str
    position: Optional[str] = None
    age: int
    height_cm: float
    weight_kg: float
    injury_history: Optional[str] = None
    training_load: Optional[str] = None


class AthleteCreate(AthleteBase):
    user_id: Optional[int] = None


class AthleteUpdate(BaseModel):
    sport_type: Optional[str] = None
    position: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    injury_history: Optional[str] = None
    training_load: Optional[str] = None


class AthleteOut(AthleteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int]
    created_at: datetime
    updated_at: datetime
