from datetime import datetime

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.crud.analysis_history import get_analysis_history_by_user, save_analysis_history
from app.database.database import Base, ensure_legacy_sqlite_columns
from app.models.user import User
from app.schemas.analysis_history import AnalysisHistoryCreate


def test_save_analysis_history_persists_for_user_without_duplicates():
    engine = create_engine('sqlite:///:memory:')
    TestingSessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    ensure_legacy_sqlite_columns(engine)

    with TestingSessionLocal() as db:
        user = User(
            full_name='Test Athlete',
            email='history@example.com',
            password_hash='hash',
            role='athlete',
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        payload = AnalysisHistoryCreate(
            user_id=user.user_id,
            video_id='video-123',
            video_name='demo.mp4',
            risk_score=0.84,
            risk_level='High',
            balance_score=78.5,
            stability_score=66.3,
            pose_quality_score=72.75,
            total_issues=2,
            total_issues_detected=2,
            detected_issues=['Knee Valgus', 'Shoulder Imbalance'],
            recommendations=[
                {'title': 'Improve Upright Posture', 'description': 'Work on reducing torso lean.', 'priority': 'High'},
            ],
            frames_processed=120,
            duration=18.5,
            processing_status='Completed',
            analysis_time=datetime(2026, 7, 30, 12, 0, 0),
        )

        first_save = save_analysis_history(db, payload)
        second_save = save_analysis_history(db, payload)
        history = get_analysis_history_by_user(db, user.user_id)

        assert first_save.history_id is not None
        assert second_save.history_id == first_save.history_id
        assert first_save.user_id == user.user_id
        assert first_save.video_id == 'video-123'
        assert len(history) == 1
        assert history[0].risk_level == 'High'
        assert history[0].balance_score == 78.5
        assert history[0].stability_score == 66.3
        assert history[0].pose_quality_score == 72.75
        assert history[0].total_issues == 2
        assert history[0].total_issues_detected == 2
        assert history[0].detected_issues == ['Knee Valgus', 'Shoulder Imbalance']
        assert history[0].recommendations == [{'title': 'Improve Upright Posture', 'description': 'Work on reducing torso lean.', 'priority': 'High'}]
        assert history[0].processing_status == 'Completed'


def test_ensure_legacy_sqlite_columns_adds_missing_columns():
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        conn.execute(text('DROP TABLE IF EXISTS analysis_history'))
        conn.execute(text('CREATE TABLE analysis_history (history_id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, video_id TEXT, created_at DATETIME)'))

    ensure_legacy_sqlite_columns(engine)

    inspector = inspect(engine)
    columns = {column['name'] for column in inspector.get_columns('analysis_history')}

    assert 'balance_score' in columns
    assert 'stability_score' in columns
    assert 'pose_quality_score' in columns
    assert 'processing_status' in columns
