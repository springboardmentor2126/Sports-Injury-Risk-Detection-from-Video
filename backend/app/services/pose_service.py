import logging
from pathlib import Path
import json
from typing import Any, Dict

from app.services.biomechanics import build_analysis_summary
from app.services.risk_scoring import score_risk
from app.services.recommendations import build_recommendations

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
POSE_RESULTS_DIR = BASE_DIR / 'uploads' / 'pose_results'
UPLOADS_DIR = BASE_DIR / 'uploads' / 'videos'


def _determine_injury_risk(analysis: Dict[str, Any]) -> str:
    scoring = score_risk(analysis)
    return scoring['injury_risk']


def _build_recommendations(analysis: Dict[str, Any]) -> list[str]:
    scoring = score_risk(analysis)
    return build_recommendations(analysis, scoring['issues'])


def _has_uploaded_video(video_id: str) -> bool:
    if not UPLOADS_DIR.exists():
        logger.warning(f'[DEBUG] UPLOADS_DIR does not exist: {UPLOADS_DIR}')
        return False

    for file_path in UPLOADS_DIR.iterdir():
        if file_path.name.startswith(f"{video_id}_") or file_path.name == video_id:
            logger.info(f'[DEBUG] Found uploaded video: {file_path.name}')
            return True

    logger.warning(f'[DEBUG] No uploaded video found for {video_id}')
    return False


def load_pose_result(video_id: str) -> Dict[str, Any]:
    result_path = POSE_RESULTS_DIR / f"{video_id}.json"
    logger.info(f'[DEBUG] Looking for pose result at: {result_path}')
    logger.info(f'[DEBUG] File exists: {result_path.exists()}')
    
    if not result_path.exists():
        logger.warning(f'[DEBUG] Pose result file does not exist: {result_path}')
        raise FileNotFoundError('Pose result not found')

    logger.info(f'[DEBUG] Loading pose result from: {result_path}')
    with result_path.open('r', encoding='utf-8') as fh:
        data = json.load(fh)
    logger.info(f'[DEBUG] Loaded JSON successfully. Status: {data.get("status")}, Keys: {list(data.keys())}')
    return data


def _normalize_analysis(analysis: Dict[str, Any], pose_data: list[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(analysis, dict):
        analysis = {}

    normalized = dict(analysis)
    scoring = score_risk(normalized)
    normalized['risk_score'] = scoring['risk_score']
    normalized['injury_risk'] = scoring['injury_risk']
    normalized['recommendations'] = build_recommendations(normalized, scoring['issues'])
    normalized['movement_quality'] = {
        'knee_valgus': 'knee_valgus' in scoring['issues'],
        'excessive_torso_lean': 'excessive_torso_lean' in scoring['issues'],
        'hip_drop': 'hip_drop' in scoring['issues'],
        'shoulder_imbalance': 'shoulder_imbalance' in scoring['issues'],
        'poor_squat_depth': 'poor_squat_depth' in scoring['issues'],
        'posture_instability': 'posture_instability' in scoring['issues'],
    }

    if not normalized.get('biomechanical_analysis') and pose_data:
        biomechanical_analysis = dict(normalized)
        biomechanical_analysis.pop('biomechanical_analysis', None)
        normalized['biomechanical_analysis'] = biomechanical_analysis

    return normalized


def get_pose_result(video_id: str) -> Dict[str, Any]:
    logger.info(f'[DEBUG] get_pose_result called for video_id: {video_id}')
    
    if not _has_uploaded_video(video_id):
        logger.warning(f'[DEBUG] Video not uploaded: {video_id}')
        raise FileNotFoundError('Video not found or invalid video_id')

    try:
        data = load_pose_result(video_id)
    except FileNotFoundError as e:
        logger.info(f'[DEBUG] Pose result file not found, returning pending status. Error: {e}')
        return {'status': 'pending', 'video_id': video_id}

    if not isinstance(data, dict):
        logger.error(f'[DEBUG] Pose result payload is not a dict: {type(data)}')
        raise ValueError('Pose result payload is invalid')

    pose_data = data.get('pose_data', []) or []
    metadata = data.get('metadata', {}) or {}
    # Use metadata.total_frames when available; otherwise fall back to counted frames
    frames_processed = metadata.get('total_frames') if metadata.get('total_frames') is not None else len(pose_data)
    landmarks_detected = 0
    if pose_data:
        landmarks_detected = len(pose_data[0].get('landmarks', []))

    logger.info(f'[DEBUG] Extracted from JSON - status: {data.get("status")}, frames: {frames_processed}, landmarks: {landmarks_detected}')

    status = data.get('status', 'completed')
    payload = {
        'status': status,
        'video_id': data.get('video_id', video_id),
        'frames_processed': frames_processed,
        'fps': metadata.get('fps'),
        'total_frames': metadata.get('total_frames'),
        'duration': metadata.get('duration'),
        'landmarks_detected': landmarks_detected,
        'pose_data': pose_data,
    }

    analysis_timestamp = (
        data.get('analysis_time')
        or data.get('analysis_date')
        or metadata.get('processed_at')
    )
    if analysis_timestamp:
        payload['analysis_time'] = analysis_timestamp
        payload['analysis_date'] = analysis_timestamp
        payload['timestamp'] = analysis_timestamp

    # Include analysis and additional fields only when processing completed
    if status == 'completed':
        raw_analysis = data.get('analysis')
        analysis = _normalize_analysis(raw_analysis or build_analysis_summary(pose_data), pose_data)
        if analysis_timestamp:
            analysis['analysis_time'] = analysis_timestamp
            analysis['analysis_date'] = analysis_timestamp
        payload['analysis'] = analysis
        payload['biomechanical_analysis'] = analysis.get('biomechanical_analysis', analysis)
        payload['movement_quality'] = analysis.get('movement_quality', {})
        payload['balance_score'] = data.get('balance_score') if data.get('balance_score') is not None else analysis.get('average_balance_score')
        payload['stability_score'] = data.get('stability_score') if data.get('stability_score') is not None else analysis.get('posture_stability')
        payload['pose_quality_score'] = data.get('pose_quality_score') if data.get('pose_quality_score') is not None else analysis.get('pose_quality_score')
        if data.get('metric_availability') is not None:
            payload['metric_availability'] = data.get('metric_availability')
        elif analysis.get('metric_availability') is not None:
            payload['metric_availability'] = analysis.get('metric_availability')
        if data.get('detected_issues') is not None:
            payload['detected_issues'] = data.get('detected_issues')
        if data.get('total_issues_detected') is not None:
            payload['total_issues_detected'] = data.get('total_issues_detected')

        if 'injury_risk' in data:
            payload['injury_risk'] = data.get('injury_risk')
        else:
            payload['injury_risk'] = _determine_injury_risk(analysis)

        if 'recommendations' in data:
            payload['recommendations'] = data.get('recommendations')
        else:
            payload['recommendations'] = _build_recommendations(analysis)

        payload['risk_score'] = analysis.get('risk_score', 0)
    elif status == 'failed':
        # Surface backend error details to the frontend
        payload['error'] = data.get('error') or 'Processing failed on the backend.'

    logger.info(f'[DEBUG] Final payload status: {payload.get("status")}')
    return payload
