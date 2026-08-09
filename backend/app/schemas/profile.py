from datetime import datetime

from pydantic import BaseModel, Field


class AthleteProfileBase(BaseModel):
    user_id: int
    full_name: str
    age: int = Field(ge=1, le=120)
    gender: str
    height: str
    weight: str
    sport: str
    playing_position: str
    dominant_side: str
    experience_years: int = Field(ge=0, le=80)
    previous_injuries: str


class AthleteProfileCreate(AthleteProfileBase):
    pass


class AthleteProfileUpdate(BaseModel):
    full_name: str | None = None
    age: int | None = Field(default=None, ge=1, le=120)
    gender: str | None = None
    height: str | None = None
    weight: str | None = None
    sport: str | None = None
    playing_position: str | None = None
    dominant_side: str | None = None
    experience_years: int | None = Field(default=None, ge=0, le=80)
    previous_injuries: str | None = None


class AthleteProfileRead(AthleteProfileBase):
    athlete_id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
