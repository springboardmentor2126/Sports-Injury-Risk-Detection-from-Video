import os
 
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
 
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv not installed - DATABASE_URL must be set some other way
    # (real environment variable, or the fallback below is used).
    pass
 
# PostgreSQL Database URL.
# IMPORTANT: prefer setting DATABASE_URL in a .env file (see .env.example) so
# credentials never end up committed to git. The hardcoded fallback below
# matches what was already in use - move off it when convenient, and rotate
# that password since it has been pasted into chat/uploaded in plaintext.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:Gvnd%402006@localhost:5432/sports_injury_db",
)
 
# Create database engine
engine = create_engine(DATABASE_URL)
 
# Create session
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
 
# Base class for models
Base = declarative_base()
 
 
# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
 