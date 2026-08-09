from pydantic import BaseModel
from typing import Optional


class AthleteProfileCreate(BaseModel):
    sport_type: Optional[str] = None
    position: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    injury_history: Optional[str] = None
    training_load: Optional[str] = None


class AthleteProfileOut(AthleteProfileCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True
