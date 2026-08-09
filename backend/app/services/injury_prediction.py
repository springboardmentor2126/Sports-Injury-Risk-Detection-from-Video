from __future__ import annotations

import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import cv2

from app.services.anomaly_detection import detect_anomalies
from app.services.biomechanics import build_analysis_summary
from app.services.recommendations import build_recommendations
from app.services.risk_scoring import score_risk
from app.services.video_service import select_sampled_frame_numbers
from services.pose_estimator import run_pose_estimation

ISSUE_LABELS = {
    'excessive_torso_lean': 'Excessive torso lean',
    'posture_instability': 'Posture instability',
    'knee_valgus': 'Knee valgus',
    'hip_drop': 'Hip drop',
    'shoulder_imbalance': 'Shoulder imbalance',
    'poor_squat_depth': 'Poor squat depth',
}


def _normalize_risk_level(risk_level: Optional[str]) -> str:
    if isinstance(risk_level, str):
        level = risk_level.strip().lower()
        if level == 'high':
            return 'High'
        if level == 'medium':
            return 'Medium'
        if level == 'low':
            return 'Low'
    return 'Low'


def _normalize_issues(issues: Sequence[str]) -> List[str]:
    normalized: List[str] = []
    for issue in issues:
        if isinstance(issue, str):
            label = ISSUE_LABELS.get(issue, issue.replace('_', ' ').title())
            normalized.append(label)
    return normalized


def _build_prediction_payload(analysis: Optional[Dict[str, Any]] = None, pose_data: Optional[Sequence[Dict[str, Any]]] = None) -> Dict[str, Any]:
    if not isinstance(analysis, dict):
        analysis = {}

    if not analysis and pose_data:
        analysis = build_analysis_summary(pose_data)

    scoring = score_risk(analysis)
    recommendations = build_recommendations(analysis, scoring['issues'])
    risk_level = _normalize_risk_level(scoring.get('injury_risk'))
    anomalies_result = detect_anomalies(analysis)

    return {
        'risk_score': scoring.get('risk_score', 0),
        'risk_level': risk_level,
        'detected_issues': _normalize_issues(scoring.get('issues', [])),
        'biomechanical_analysis': analysis,
        'recommendations': recommendations,
        'anomalies': anomalies_result['anomalies'],
        'anomaly_count': anomalies_result['anomaly_count'],
        'movement_status': anomalies_result['movement_status'],
    }


def predict_injury(*, analysis: Optional[Dict[str, Any]] = None, pose_data: Optional[Sequence[Dict[str, Any]]] = None, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    request_payload = payload or {}
    if analysis is None:
        analysis = request_payload.get('analysis')
    if pose_data is None:
        pose_data = request_payload.get('pose_data') or request_payload.get('processed_pose_data')

    if analysis is None and not pose_data:
        analysis = request_payload.get('biomechanical_analysis') or request_payload.get('biomechanics')
    if not isinstance(analysis, dict):
        analysis = {}
    if not pose_data:
        pose_data = []

    return _build_prediction_payload(analysis=analysis, pose_data=pose_data)


def predict_injury_from_video(video_path: str | Path, video_id: Optional[str] = None) -> Dict[str, Any]:
    video_path = Path(video_path)
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError('Unable to open uploaded video file.')

    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration = total_frames / fps if fps else 0.0

        sample_interval = int(os.getenv('VIDEO_SAMPLE_INTERVAL', '5'))
        sampled_frame_numbers = select_sampled_frame_numbers(
            total_frames,
            sample_interval=sample_interval,
            max_frames=60,
        )
        if not sampled_frame_numbers:
            return _build_prediction_payload(analysis={}, pose_data=[])

        temp_dir = Path(tempfile.mkdtemp(prefix=f'predict_frames_{video_id or "video"}_', dir=str(video_path.parent)))
        try:
            for frame_number in sorted(sampled_frame_numbers):
                cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, frame_number - 1))
                success, frame = cap.read()
                if not success or frame is None:
                    continue

                if frame.shape[1] > 640:
                    resized_frame = cv2.resize(frame, (640, int(frame.shape[0] * 640 / frame.shape[1])))
                else:
                    resized_frame = frame

                frame_path = temp_dir / f'frame_{frame_number:06d}.jpg'
                cv2.imencode('.jpg', resized_frame)[1].tofile(str(frame_path))

            pose_json_path = temp_dir / 'pose_prediction.json'
            run_pose_estimation(
                str(temp_dir),
                str(pose_json_path),
                metadata={'video_id': video_id or video_path.stem, 'fps': fps, 'duration': duration, 'total_frames': total_frames},
            )
            if pose_json_path.exists():
                with pose_json_path.open('r', encoding='utf-8') as handle:
                    pose_payload = json.load(handle)
                pose_data = pose_payload.get('pose_data', [])
            else:
                pose_data = []

            return _build_prediction_payload(analysis={}, pose_data=pose_data)
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
    finally:
        cap.release()
