from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from enum import Enum

# ─── Enums ────────────────────────────────────────────────────────

class GenderEnum(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"

class DominantLimbEnum(str, Enum):
    RIGHT = "RIGHT"
    LEFT = "LEFT"
    AMBIDEXTROUS = "AMBIDEXTROUS"

class SportTypeEnum(str, Enum):
    SOCCER = "SOCCER"
    BASKETBALL = "BASKETBALL"
    TENNIS = "TENNIS"
    BASEBALL = "BASEBALL"
    AMERICAN_FOOTBALL = "AMERICAN_FOOTBALL"
    VOLLEYBALL = "VOLLEYBALL"
    TRACK = "TRACK"
    SWIMMING = "SWIMMING"
    BOXING = "BOXING"
    WRESTLING = "WRESTLING"
    RUGBY = "RUGBY"
    HOCKEY = "HOCKEY"
    BADMINTON = "BADMINTON"
    GYMNASTICS = "GYMNASTICS"
    CYCLING = "CYCLING"
    CRICKET = "CRICKET"
    OTHER = "OTHER"

class InjuryNameEnum(str, Enum):
    ACL_TEAR = "ACL_TEAR"
    MCL_TEAR = "MCL_TEAR"
    MENISCUS_TEAR = "MENISCUS_TEAR"
    ANKLE_SPRAIN = "ANKLE_SPRAIN"
    HAMSTRING_STRAIN = "HAMSTRING_STRAIN"
    GROIN_PULL = "GROIN_PULL"
    SHIN_SPLINTS = "SHIN_SPLINTS"
    TENNIS_ELBOW = "TENNIS_ELBOW"
    CONCUSSION = "CONCUSSION"
    SHOULDER_DISLOCATION = "SHOULDER_DISLOCATION"
    ROTATOR_CUFF_TEAR = "ROTATOR_CUFF_TEAR"
    FRACTURE = "FRACTURE"
    TENDINITIS = "TENDINITIS"
    OTHER = "OTHER"

class BodyPartEnum(str, Enum):
    LEFT_KNEE = "LEFT_KNEE"
    RIGHT_KNEE = "RIGHT_KNEE"
    LEFT_ANKLE = "LEFT_ANKLE"
    RIGHT_ANKLE = "RIGHT_ANKLE"
    LEFT_SHOULDER = "LEFT_SHOULDER"
    RIGHT_SHOULDER = "RIGHT_SHOULDER"
    LEFT_HIP = "LEFT_HIP"
    RIGHT_HIP = "RIGHT_HIP"
    LOWER_BACK = "LOWER_BACK"
    UPPER_BACK = "UPPER_BACK"
    NECK = "NECK"
    LEFT_ELBOW = "LEFT_ELBOW"
    RIGHT_ELBOW = "RIGHT_ELBOW"
    LEFT_WRIST = "LEFT_WRIST"
    RIGHT_WRIST = "RIGHT_WRIST"
    OTHER = "OTHER"

# ─── Athlete Profile Schemas ──────────────────────────────────────

class AthleteProfileCreate(BaseModel):
    """Schema for creating or updating an athlete profile."""
    sport_type: SportTypeEnum = Field(..., example="BASKETBALL", description="Sport the athlete plays")
    position: Optional[str] = Field(None, example="Point Guard", description="Playing position")
    age: int = Field(..., ge=10, le=100, example=22)
    height_cm: Decimal = Field(..., ge=100, le=250, example=185.5)
    weight_kg: Decimal = Field(..., ge=30, le=200, example=78.0)
    weekly_training_hours: int = Field(0, ge=0, le=168, example=15)
    gender: Optional[GenderEnum] = Field(None, example="MALE")
    dominant_limb: Optional[DominantLimbEnum] = Field(None, example="RIGHT")


class AthleteProfileResponse(BaseModel):
    """Schema for returning an athlete profile."""
    id: UUID
    user_id: UUID
    sport_type: str
    position: Optional[str] = None
    age: int
    height_cm: Decimal
    weight_kg: Decimal
    weekly_training_hours: int
    gender: Optional[str] = None
    dominant_limb: Optional[str] = None
    linked_coach_id: Optional[UUID] = None
    linked_physio_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AthleteLinkRequest(BaseModel):
    """Schema for linking to a professional using an invite code."""
    invite_code: str


# ─── Injury History Schemas ───────────────────────────────────────

class InjuryHistoryCreate(BaseModel):
    """Schema for logging a past injury."""
    injury_name: InjuryNameEnum = Field(..., example="ACL_TEAR")
    affected_body_part: BodyPartEnum = Field(..., example="LEFT_KNEE")
    injury_date: date = Field(..., example="2023-05-14")
    recovery_duration_weeks: Optional[int] = Field(None, example=12)
    notes: Optional[str] = Field(None, example="Underwent surgery, physiotherapy ongoing")


class InjuryHistoryResponse(BaseModel):
    """Schema for returning an injury history record."""
    id: UUID
    injury_name: str
    affected_body_part: str
    injury_date: date             # datetime.date object from DB — NOT a plain str
    recovery_duration_weeks: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
