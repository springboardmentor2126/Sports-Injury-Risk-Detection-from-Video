from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# SQLite needs check_same_thread=False; PostgreSQL does not need it
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

# Create the SQLAlchemy engine (synchronous)
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

# Create a configured SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models
Base = declarative_base()


def get_db():
    """Dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
