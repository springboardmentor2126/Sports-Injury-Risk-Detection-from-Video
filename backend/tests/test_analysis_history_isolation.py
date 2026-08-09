from fastapi.testclient import TestClient

from app.crud.user import create_user
from app.database.database import SessionLocal
from app.main import app
from app.models.user import User
from app.schemas.auth import SignupRequest

client = TestClient(app)


def test_analysis_history_isolation_by_user_id():
    with SessionLocal() as db:
        # Clean up duplicate test users
        db.query(User).filter(User.email == 'isolation_a@example.com').delete()
        db.query(User).filter(User.email == 'isolation_b@example.com').delete()
        db.commit()

        user_a = create_user(db, SignupRequest(fullName='User A', email='isolation_a@example.com', password='Password1', role='athlete'))
        user_b = create_user(db, SignupRequest(fullName='User B', email='isolation_b@example.com', password='Password2', role='athlete'))

        # Save one history record for user B through the API using X-Current-User-Id header
        response = client.post(
            '/api/v1/analysis-history',
            json={
                'user_id': user_b.user_id,
                'video_id': 'video-b-123',
                'risk_score': 42.0,
                'risk_level': 'medium',
                'balance_score': 65.0,
                'stability_score': 70.0,
                'pose_quality_score': 75.0,
                'total_issues': 1,
                'total_issues_detected': 1,
                'detected_issues': ['posture_instability'],
                'recommendations': [{'title': 'Improve core strength', 'description': 'Work on balance drills.', 'priority': 'High'}],
                'frames_processed': 10,
                'duration': 5.0,
                'processing_status': 'Completed',
                'analysis_time': '2026-08-05T00:00:00Z',
            },
            headers={'X-Current-User-Id': str(user_b.user_id)},
        )
        assert response.status_code == 201

        # Attempt to retrieve B's history as user A
        response = client.get(
            f'/api/v1/analysis-history/{user_b.user_id}',
            headers={'X-Current-User-Id': str(user_a.user_id)},
        )

    assert response.status_code == 403
    assert response.json()['detail'] == 'Forbidden.'
