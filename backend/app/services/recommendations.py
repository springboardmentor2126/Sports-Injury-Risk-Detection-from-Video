from __future__ import annotations

from typing import Any, Dict, List


ISSUE_RECOMMENDATIONS = {
    'excessive_torso_lean': {
        'title': 'Improve Upright Posture',
        'description': 'Strengthen core muscles, practice upright squat posture, and reduce forward trunk lean.',
        'priority': 'High',
    },
    'posture_instability': {
        'title': 'Improve Core Stability',
        'description': 'Work on core strengthening and balance drills to improve posture control.',
        'priority': 'High',
    },
    'knee_valgus': {
        'title': 'Improve Knee Alignment',
        'description': 'Perform glute strengthening and knee tracking drills.',
        'priority': 'High',
    },
    'hip_drop': {
        'title': 'Improve Hip Stability',
        'description': 'Add single-leg balance exercises, hip abductor strengthening, and pelvic stability drills.',
        'priority': 'High',
    },
    'shoulder_imbalance': {
        'title': 'Improve Shoulder Stability',
        'description': 'Practice shoulder mobility exercises, scapular stabilization, and upper back strengthening.',
        'priority': 'Medium',
    },
    'poor_squat_depth': {
        'title': 'Improve Squat Mobility',
        'description': 'Work on ankle mobility, hip mobility stretches, and assisted squat practice.',
        'priority': 'Medium',
    },
}


def _priority_rank(priority: str) -> int:
    if priority == 'High':
        return 0
    if priority == 'Medium':
        return 1
    return 2


def build_recommendations(analysis: Dict[str, Any], issues: List[str]) -> List[Dict[str, str]]:
    """Generate dynamic recommendations based on the detected movement issues."""
    recommendations: List[Dict[str, str]] = []
    seen_recommendations = set()

    for issue in issues:
        if not isinstance(issue, str):
            continue

        issue_key = issue.strip()
        recommendation = ISSUE_RECOMMENDATIONS.get(issue_key)
        if not recommendation:
            continue

        signature = (recommendation['title'].lower(), recommendation['description'].lower())
        if signature in seen_recommendations:
            continue

        seen_recommendations.add(signature)
        recommendations.append(dict(recommendation))

    if not recommendations:
        return [{
            'title': 'Maintain Current Form',
            'description': 'No significant movement issues detected. Continue training with proper technique.',
            'priority': 'Low',
        }]

    recommendations.sort(key=lambda item: _priority_rank(item['priority']))
    return recommendations
