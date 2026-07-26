from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime


# ─── Role Schemas ─────────────────────────────────────────────

class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


# ─── User Schemas ──────────────────────────────────────────────

class UserCreate(BaseModel):
    """Schema for user registration request."""
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role_id: int  # 1=athlete, 2=coach, 3=physiotherapist, 4=scientist, 5=admin


class UserLogin(BaseModel):
    """Schema for user login request."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user data returned in responses."""
    id: UUID
    email: str
    first_name: str
    last_name: str
    is_active: bool
    role: RoleResponse
    invite_code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Token Schemas ─────────────────────────────────────────────

class Token(BaseModel):
    """JWT token response schema."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Decoded token payload."""
    user_id: Optional[str] = None
