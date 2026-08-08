from pydantic import BaseModel, field_validator
 
# Roles a user can self-register as. "Administrator" is deliberately
# excluded - there is exactly ONE admin account, created only via the
# seed script (see seed_admin.py), never through public registration.
SELF_REGISTERABLE_ROLES = {"Athlete", "Coach", "Physiotherapist", "Sports Scientist"}
 
# All valid roles in the system, including Administrator - used wherever
# a role needs validating but self-registration isn't the context (e.g.
# an admin manually adjusting a user's role later).
ALL_ROLES = SELF_REGISTERABLE_ROLES | {"Administrator"}
 
 
# ---------------------------------------------------------
# User
# ---------------------------------------------------------
class UserCreate(BaseModel):
    name: str | None = None
    email: str
    password: str
    role: str = "Athlete"
 
    @field_validator("role")
    @classmethod
    def role_must_be_self_registerable(cls, v):
        if v not in SELF_REGISTERABLE_ROLES:
            raise ValueError(
                f"Role must be one of: {', '.join(sorted(SELF_REGISTERABLE_ROLES))}. "
                f"Administrator accounts cannot be created through registration."
            )
        return v
 
 
class UserLogin(BaseModel):
    email: str
    password: str
 
 
class UserResponse(BaseModel):
    email: str
    name: str | None = None
    role: str
 
    class Config:
        from_attributes = True
 
 
class Token(BaseModel):
    """
    NEW. Returned by POST /login. The frontend must store access_token and
    send it as `Authorization: Bearer <access_token>` on every subsequent
    request that needs to know who the logged-in user is.
    """
    access_token: str
    token_type: str = "bearer"
 
 
# ---------------------------------------------------------
# Athlete
# ---------------------------------------------------------
class AthleteBase(BaseModel):
    # NOTE: deliberately no user_id field here. Ownership is never accepted
    # from the client - it's always taken from the authenticated user's
    # token server-side (see routers/athlete.py). This is what prevents a
    # malicious or buggy frontend from creating/claiming athletes on behalf
    # of another user_id.
    athlete_id: str
    sport_type: str
    position: str = ""
    age: str = ""
    height: str = ""
    weight: str = ""
    injury_history: str = ""
    training_load: str = ""
 
 
class AthleteCreate(AthleteBase):
    pass
 
 
class AthleteUpdate(AthleteBase):
    pass
 
 
class AthleteResponse(AthleteBase):
    id: int
    user_id: int
 
    class Config:
        from_attributes = True
 
 
# ---------------------------------------------------------
# Video
# ---------------------------------------------------------
class VideoResponse(BaseModel):
    id: int
    athlete_pk_id: int
    original_filename: str
    stored_filename: str
    processed_filename: str
 
    class Config:
        from_attributes = True
 
 
# ---------------------------------------------------------
# Analysis Result
# ---------------------------------------------------------
class AnalysisResultResponse(BaseModel):
    id: int
    athlete_pk_id: int
    video_id: int
    overall_risk_score: str
    movement_quality: str
    injury_risks: str
    recommendations: str
 
    class Config:
        from_attributes = True
 
 
# ---------------------------------------------------------
# Report
# ---------------------------------------------------------
class ReportResponse(BaseModel):
    id: int
    analysis_id: int
    report_name: str
    report_path: str
    report_url: str
    processed_video: str
    processed_video_url: str
 
    class Config:
        from_attributes = True
 