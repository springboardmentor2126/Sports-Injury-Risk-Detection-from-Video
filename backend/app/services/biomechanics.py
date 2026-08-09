from typing import Any, Dict, Sequence

from app.services.biomechanical_analysis import build_analysis_summary as _build_analysis_summary
from app.services.pose_processing import prepare_pose_frames
from app.services.recommendations import build_recommendations
from app.services.risk_scoring import score_risk


def build_analysis_summary(pose_data: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    """Build a multi-frame biomechanical summary that remains compatible with existing callers."""
    frames = prepare_pose_frames(pose_data)
    analysis = _build_analysis_summary(frames)
    if not analysis:
        return {}

    scoring = score_risk(analysis)
    analysis['risk_score'] = scoring['risk_score']
    analysis['injury_risk'] = scoring['injury_risk']
    analysis['recommendations'] = build_recommendations(analysis, scoring['issues'])

    movement_quality = {
        'knee_valgus': bool(scoring['issues'] and 'knee_valgus' in scoring['issues']),
        'excessive_torso_lean': bool(scoring['issues'] and 'excessive_torso_lean' in scoring['issues']),
        'hip_drop': bool(scoring['issues'] and 'hip_drop' in scoring['issues']),
        'shoulder_imbalance': bool(scoring['issues'] and 'shoulder_imbalance' in scoring['issues']),
        'poor_squat_depth': bool(scoring['issues'] and 'poor_squat_depth' in scoring['issues']),
        'posture_instability': bool(scoring['issues'] and 'posture_instability' in scoring['issues']),
    }
    analysis['movement_quality'] = movement_quality
    return analysis
