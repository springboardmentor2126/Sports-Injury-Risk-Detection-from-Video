from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence


def _numeric_metric(analysis: Dict[str, Any], *keys: str) -> float | None:
    for key in keys:
        value = analysis.get(key)
        if isinstance(value, (int, float)):
            return float(value)
    return None


def _severity_for_value(value: float, threshold: float) -> str:
    if value >= threshold * 1.25:
        return 'High'
    if value >= threshold * 1.0:
        return 'Medium'
    return 'Low'


def detect_anomalies(analysis: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(analysis, dict):
        analysis = {}

    anomalies: List[Dict[str, Any]] = []

    torso_lean = _numeric_metric(analysis, 'average_torso_lean', 'torso_lean')
    if torso_lean is not None and torso_lean > 25:
        anomalies.append({
            'name': 'Excessive Torso Lean',
            'severity': _severity_for_value(torso_lean, 25),
            'value': round(torso_lean, 2),
            'threshold': 25,
        })

    balance_score = _numeric_metric(analysis, 'average_balance_score', 'balance_score')
    if balance_score is not None and balance_score < 60:
        anomalies.append({
            'name': 'Poor Balance',
            'severity': _severity_for_value(60 - balance_score, 20),
            'value': round(balance_score, 2),
            'threshold': 60,
        })

    shoulder_delta = _numeric_metric(analysis, 'average_shoulder_alignment_delta', 'shoulder_alignment_delta')
    if shoulder_delta is not None and shoulder_delta > 0.05:
        anomalies.append({
            'name': 'Shoulder Imbalance',
            'severity': _severity_for_value(shoulder_delta, 0.05),
            'value': round(shoulder_delta, 3),
            'threshold': 0.05,
        })

    knee_asymmetry = _numeric_metric(analysis, 'knee_asymmetry')
    if knee_asymmetry is not None and knee_asymmetry > 10:
        anomalies.append({
            'name': 'Knee Valgus',
            'severity': _severity_for_value(knee_asymmetry, 10),
            'value': round(knee_asymmetry, 2),
            'threshold': 10,
        })

    hip_asymmetry = _numeric_metric(analysis, 'hip_asymmetry')
    if hip_asymmetry is not None and hip_asymmetry > 10:
        anomalies.append({
            'name': 'Hip Drop',
            'severity': _severity_for_value(hip_asymmetry, 10),
            'value': round(hip_asymmetry, 2),
            'threshold': 10,
        })

    posture_stability = _numeric_metric(analysis, 'posture_stability')
    if posture_stability is not None and posture_stability < 50:
        anomalies.append({
            'name': 'Poor Posture Stability',
            'severity': _severity_for_value(50 - posture_stability, 20),
            'value': round(posture_stability, 2),
            'threshold': 50,
        })

    if not anomalies:
        return {
            'anomalies': [],
            'anomaly_count': 0,
            'movement_status': 'Normal',
        }

    high_risk = any(item['severity'] == 'High' for item in anomalies)
    movement_status = 'High Risk' if high_risk else 'Needs Attention'

    return {
        'anomalies': anomalies,
        'anomaly_count': len(anomalies),
        'movement_status': movement_status,
    }
