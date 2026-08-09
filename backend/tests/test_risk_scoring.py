import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.risk_scoring import score_risk


def test_score_risk_returns_weighted_components_and_explanation():
    analysis = {
        'average_torso_lean': 35,
        'average_balance_score': 52,
        'average_shoulder_alignment_delta': 0.08,
        'knee_asymmetry': 12,
        'hip_asymmetry': 11,
        'posture_stability': 43,
    }

    result = score_risk(analysis)

    assert result['risk_score'] >= 0
    assert result['risk_score'] <= 100
    assert result['injury_risk'] in {'low', 'medium', 'high'}
    assert 'metric_contributions' in result
    assert 'explanation' in result
    assert result['metric_contributions']['torso_lean']['contribution'] >= 0


def test_score_risk_returns_low_risk_for_stable_metrics():
    analysis = {
        'average_torso_lean': 8,
        'average_balance_score': 78,
        'average_shoulder_alignment_delta': 0.01,
        'knee_asymmetry': 4,
        'hip_asymmetry': 3,
        'posture_stability': 80,
    }

    result = score_risk(analysis)

    assert result['risk_score'] < 40
    assert result['injury_risk'] == 'low'
