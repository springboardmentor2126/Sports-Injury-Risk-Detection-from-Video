from pydantic import BaseModel, Field


class AthleteProfileCreate(BaseModel):
    age: int = Field(..., ge=1, le=100)
    height: float = Field(..., gt=0, le=300)
    weight: float = Field(..., gt=0, le=500)
    sport: str = Field(..., min_length=2, max_length=100)
    experience: int = Field(..., ge=0, le=100)


class AthleteProfileUpdate(BaseModel):
    age: int = Field(..., ge=1, le=100)
    height: float = Field(..., gt=0, le=300)
    weight: float = Field(..., gt=0, le=500)
    sport: str = Field(..., min_length=2, max_length=100)
    experience: int = Field(..., ge=0, le=100)