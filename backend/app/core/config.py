from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT
    JWT_SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # App
    APP_ENV: str = "development"

    # Gemini AI
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
