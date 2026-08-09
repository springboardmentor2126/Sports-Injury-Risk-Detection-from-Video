import logging
import os
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.database.config import get_database_url

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Shared SQLAlchemy base for all ORM models."""


engine = create_engine(get_database_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Provide a database session per FastAPI request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_legacy_sqlite_columns(engine_instance) -> None:
    """Add missing analysis-history columns for older SQLite databases."""
    if engine_instance.dialect.name != 'sqlite':
        return

    inspector = inspect(engine_instance)
    if 'analysis_history' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('analysis_history')}
    required_columns = {
        'balance_score': 'REAL',
        'stability_score': 'REAL',
        'pose_quality_score': 'REAL',
        'total_issues': 'INTEGER',
        'total_issues_detected': 'INTEGER',
        'detected_issues': 'JSON',
        'recommendations': 'JSON',
        'frames_processed': 'INTEGER',
        'duration': 'REAL',
        'processing_status': 'TEXT',
        'analysis_time': 'DATETIME',
    }

    with engine_instance.begin() as connection:
        for column_name, column_type in required_columns.items():
            if column_name not in columns:
                connection.execute(text(f'ALTER TABLE analysis_history ADD COLUMN {column_name} {column_type}'))


def create_tables() -> None:
    """Create tables during local development when migrations have not been run."""
    if os.getenv('AUTO_CREATE_TABLES', 'true').lower() != 'true':
        return

    try:
        # Import models here so SQLAlchemy registers their metadata before creation.
        from app.models import analysis_history, athlete, user, video  # noqa: F401

        Base.metadata.create_all(bind=engine)
        ensure_legacy_sqlite_columns(engine)

        from app.crud.user import seed_default_demo_user

        with SessionLocal() as db:
            seed_default_demo_user(db)

        logger.info('Database tables are ready.')
    except Exception:
        logger.exception('Unable to create database tables. Check DATABASE_URL and PostgreSQL status.')
        raise
