"""
Database configuration.
Uses SQLite for easy local setup (no external DB server needed for Milestone 1).
Swap SQLALCHEMY_DATABASE_URL for a Postgres URL later, e.g.:
    postgresql://user:password@localhost:5432/injury_risk_db
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./injury_risk.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
