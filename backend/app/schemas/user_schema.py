from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str

    age: int
    height: float
    weight: float
    sport: str
    experience: int