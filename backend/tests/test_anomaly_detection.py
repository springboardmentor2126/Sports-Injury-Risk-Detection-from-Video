import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.anomaly_detection import detect_anomalies


def test_detects_multiple_rule_based_anomalies():
    analysis = {
        'average_torso_lean': 40,
        'average_balance_score': 45,
        'average_shoulder_alignment_delta': 0.08,
        'knee_asymmetry': 15,
        'hip_asymmetry': 14,
        'posture_stability': 40,
    }

    result = detect_anomalies(analysis)

    assert result['anomaly_count'] >= 3
    assert result['movement_status'] in {'Needs Attention', 'High Risk'}
    assert any(item['name'] == 'Excessive Torso Lean' for item in result['anomalies'])
    assert any(item['name'] == 'Knee Valgus' for item in result['anomalies'])
    assert any(item['name'] == 'Poor Balance' for item in result['anomalies'])


def test_returns_normal_status_for_stable_metrics():
    analysis = {
        'average_torso_lean': 8,
        'average_balance_score': 78,
        'average_shoulder_alignment_delta': 0.01,
        'knee_asymmetry': 4,
        'hip_asymmetry': 3,
        'posture_stability': 80,
    }

    result = detect_anomalies(analysis)

    assert result['anomalies'] == []
    assert result['anomaly_count'] == 0
    assert result['movement_status'] == 'Normal'
