from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    role: str = "Athlete"

    age: int | None = None
    gender: str | None = None
    height: float | None = None
    weight: float | None = None
    sport: str | None = None
    experience: int | None = None


class UserResponse(BaseModel):

    id: int
    username: str
    email: EmailStr

    role: str

    age: int | None = None
    gender: str | None = None
    height: float | None = None
    weight: float | None = None
    sport: str | None = None
    experience: int | None = None

    class Config:
        from_attributes = True


class UserLogin(BaseModel):

    email: EmailStr
    password: str


class Token(BaseModel):

    access_token: str
    token_type: str


class ProfileUpdate(BaseModel):

    age: int | None = None
    gender: str | None = None
    height: float | None = None
    weight: float | None = None
    sport: str | None = None
    experience: int |None = None