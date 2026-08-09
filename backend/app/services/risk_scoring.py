from __future__ import annotations

from typing import Any, Dict, List


WEIGHTS = {
    'torso_lean': 0.22,
    'balance': 0.18,
    'shoulder_alignment': 0.12,
    'knee_asymmetry': 0.20,
    'hip_drop': 0.16,
    'posture_stability': 0.12,
}


def _numeric_metric(analysis: Dict[str, Any], *keys: str) -> float | None:
    for key in keys:
        value = analysis.get(key)
        if isinstance(value, (int, float)):
            return float(value)
    return None


def _risk_component(name: str, value: float | None, threshold: float, weight: float, direction: str) -> Dict[str, Any]:
    if value is None:
        return {'name': name, 'value': None, 'threshold': threshold, 'weight': weight, 'contribution': 0.0}

    if direction == 'higher_is_worse':
        risk_ratio = max(0.0, min(1.0, value / threshold))
    else:
        risk_ratio = max(0.0, min(1.0, (threshold - value) / threshold))

    contribution = round(risk_ratio * weight * 100.0, 2)
    return {
        'name': name,
        'value': round(value, 2),
        'threshold': threshold,
        'weight': round(weight, 2),
        'contribution': contribution,
    }


def score_risk(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Return a weighted injury risk score, issue flags, and an explanation."""
    if not analysis:
        return {
            'risk_score': 0,
            'injury_risk': 'low',
            'issues': [],
            'metric_contributions': {},
            'explanation': 'No biomechanical metrics were provided.',
        }

    avg_torso_lean = _numeric_metric(analysis, 'average_torso_lean', 'torso_lean')
    avg_balance = _numeric_metric(analysis, 'average_balance_score', 'balance_score')
    avg_shoulder_delta = _numeric_metric(analysis, 'average_shoulder_alignment_delta', 'shoulder_alignment_delta')
    knee_asymmetry = _numeric_metric(analysis, 'knee_asymmetry')
    hip_asymmetry = _numeric_metric(analysis, 'hip_asymmetry')
    posture_stability = _numeric_metric(analysis, 'posture_stability')

    metric_contributions: Dict[str, Dict[str, Any]] = {
        'torso_lean': _risk_component('torso_lean', avg_torso_lean, 25.0, WEIGHTS['torso_lean'], 'higher_is_worse'),
        'balance': _risk_component('balance', avg_balance, 60.0, WEIGHTS['balance'], 'lower_is_worse'),
        'shoulder_alignment': _risk_component('shoulder_alignment', avg_shoulder_delta, 0.05, WEIGHTS['shoulder_alignment'], 'higher_is_worse'),
        'knee_asymmetry': _risk_component('knee_asymmetry', knee_asymmetry, 10.0, WEIGHTS['knee_asymmetry'], 'higher_is_worse'),
        'hip_drop': _risk_component('hip_drop', hip_asymmetry, 10.0, WEIGHTS['hip_drop'], 'higher_is_worse'),
        'posture_stability': _risk_component('posture_stability', posture_stability, 50.0, WEIGHTS['posture_stability'], 'lower_is_worse'),
    }

    issues: List[str] = []
    score = 0.0
    for metric_name, contribution in metric_contributions.items():
        if contribution['value'] is None:
            continue
        score += contribution['contribution']
        if metric_name == 'torso_lean' and avg_torso_lean is not None and avg_torso_lean > 25:
            issues.append('excessive_torso_lean')
        elif metric_name == 'balance' and avg_balance is not None and avg_balance < 60:
            issues.append('posture_instability')
        elif metric_name == 'shoulder_alignment' and avg_shoulder_delta is not None and avg_shoulder_delta > 0.05:
            issues.append('shoulder_imbalance')
        elif metric_name == 'knee_asymmetry' and knee_asymmetry is not None and knee_asymmetry > 10:
            issues.append('knee_valgus')
        elif metric_name == 'hip_drop' and hip_asymmetry is not None and hip_asymmetry > 10:
            issues.append('hip_drop')
        elif metric_name == 'posture_stability' and posture_stability is not None and posture_stability < 50:
            issues.append('poor_squat_depth')

    score = min(100.0, round(score, 2))
    if score >= 70:
        injury_risk = 'high'
    elif score >= 40:
        injury_risk = 'medium'
    else:
        injury_risk = 'low'

    explanation_parts = []
    for name, contribution in metric_contributions.items():
        if contribution['value'] is None:
            continue
        explanation_parts.append(f"{name} contributed {contribution['contribution']} due to a value of {contribution['value']} against threshold {contribution['threshold']}")

    return {
        'risk_score': score,
        'injury_risk': injury_risk,
        'issues': issues,
        'metric_contributions': metric_contributions,
        'explanation': 'Weighted risk model: ' + '; '.join(explanation_parts) if explanation_parts else 'Weighted risk model: no metrics available.',
    }
