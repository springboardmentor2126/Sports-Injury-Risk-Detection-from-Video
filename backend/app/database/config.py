import os
from pathlib import Path


def get_database_url() -> str:
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        return database_url

    use_sqlite = os.getenv('USE_SQLITE', 'true').lower() == 'true'
    if use_sqlite:
        db_dir = Path(__file__).resolve().parents[2]
        db_path = db_dir / 'sports_injury_detection.db'
        return f'sqlite:///{db_path}'

    return 'postgresql+psycopg://postgres:postgres@localhost:5432/sports_injury_detection'
