from pydantic import BaseModel, EmailStr
from typing import Optional


class AthleteBase(BaseModel):
    athlete_id: str
    name: str
    sport_type: Optional[str] = None
    position: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    injury_history: Optional[str] = None
    training_load: Optional[str] = None


class AthleteCreate(AthleteBase):
    pass


class AthleteResponse(AthleteBase):
    id: int
    user_id: Optional[int] = None

    class Config:
        from_attributes = True


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str
    role: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class CompleteProfileRequest(BaseModel):
    athlete_id: str
    sport_type: Optional[str] = None
    position: Optional[str] = None
    age: Optional[int] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    injury_history: Optional[str] = None
    training_load: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    full_name: Optional[str]
    email: EmailStr
    role: str
    profile_completed: bool

    class Config:
        from_attributes = True