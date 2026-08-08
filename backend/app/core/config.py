from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT
    JWT_SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # App
    APP_ENV: str = "development"

    # Gemini AI
    GEMINI_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"   # silently ignore any unknown keys in .env


settings = Settings()
