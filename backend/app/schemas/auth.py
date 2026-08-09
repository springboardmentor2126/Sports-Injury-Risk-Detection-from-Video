from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class LoginResponse(BaseModel):
    success: bool
    message: str
    user_id: int | None = None
    role: str | None = None
    full_name: str | None = None
    profile_exists: bool = False


class SignupRequest(BaseModel):
    fullName: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = Field(min_length=1)


class SignupResponse(BaseModel):
    success: bool
    message: str
    user_id: int | None = None
    role: str | None = None
    full_name: str | None = None
    profile_exists: bool = False
