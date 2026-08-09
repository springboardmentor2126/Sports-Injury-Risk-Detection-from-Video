import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database.config import get_database_url


def test_get_database_url_defaults_to_sqlite_for_local_dev(monkeypatch):
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.setenv('USE_SQLITE', 'true')

    url = get_database_url()

    assert url.startswith('sqlite:///')
