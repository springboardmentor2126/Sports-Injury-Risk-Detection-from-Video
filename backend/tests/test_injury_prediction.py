import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app
from app.services.injury_prediction import predict_injury
from app.services.recommendations import build_recommendations


client = TestClient(app)


def test_build_recommendations_returns_personalized_issue_based_items():
    recommendations = build_recommendations({}, ['excessive_torso_lean', 'knee_valgus', 'knee_valgus'])

    assert recommendations[0]['title'] == 'Improve Upright Posture'
    assert recommendations[0]['priority'] == 'High'
    assert any(item['title'] == 'Improve Knee Alignment' for item in recommendations)
    assert len({item['title'] for item in recommendations}) == len(recommendations)


def test_build_recommendations_returns_default_when_no_issues_are_detected():
    recommendations = build_recommendations({}, [])

    assert recommendations == [{
        'title': 'Maintain Current Form',
        'description': 'No significant movement issues detected. Continue training with proper technique.',
        'priority': 'Low',
    }]


def test_predict_injury_builds_rule_based_prediction_from_analysis():
    analysis = {
        'average_torso_lean': 38,
        'average_balance_score': 48,
        'average_shoulder_alignment_delta': 0.08,
        'knee_asymmetry': 12,
        'hip_asymmetry': 15,
        'posture_stability': 45,
    }

    result = predict_injury(analysis=analysis)

    assert result['risk_score'] >= 35
    assert result['risk_level'] in {'Medium', 'High'}
    assert result['detected_issues']
    assert result['recommendations']
    assert result['biomechanical_analysis']['average_torso_lean'] == 38


def test_predict_injury_endpoint_returns_prediction_payload():
    payload = {
        'analysis': {
            'average_torso_lean': 35,
            'average_balance_score': 55,
            'knee_asymmetry': 12,
            'hip_asymmetry': 11,
            'posture_stability': 45,
        }
    }

    response = client.post('/predict-injury', json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data['risk_level'] in {'Medium', 'High'}
    assert data['risk_score'] >= 0
    assert 'detected_issues' in data
    assert 'recommendations' in data
