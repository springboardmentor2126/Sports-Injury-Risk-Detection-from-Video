import json
from pathlib import Path

import pytest

from app.services import biomechanics, pose_service


@pytest.fixture()
def isolated_pose_paths(tmp_path, monkeypatch):
    pose_dir = tmp_path / 'pose_results'
    uploads_dir = tmp_path / 'uploads' / 'videos'
    pose_dir.mkdir(parents=True, exist_ok=True)
    uploads_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(pose_service, 'POSE_RESULTS_DIR', pose_dir)
    monkeypatch.setattr(pose_service, 'UPLOADS_DIR', uploads_dir)

    return pose_dir, uploads_dir


def test_returns_pending_when_uploaded_video_exists_but_result_json_is_missing(isolated_pose_paths):
    _, uploads_dir = isolated_pose_paths
    (uploads_dir / 'abc123_video.mp4').write_bytes(b'data')

    result = pose_service.get_pose_result('abc123')

    assert result == {'status': 'pending', 'video_id': 'abc123'}


def test_returns_completed_payload_when_result_json_exists(isolated_pose_paths):
    pose_dir, uploads_dir = isolated_pose_paths
    (uploads_dir / 'abc123_video.mp4').write_bytes(b'data')
    result_path = pose_dir / 'abc123.json'
    result_path.write_text(
        '{"status": "completed", "video_id": "abc123", "analysis_time": "2026-08-06T10:15:00+00:00", "analysis_date": "2026-08-06T10:15:00+00:00", "pose_data": [{"landmarks": []}], "metadata": {"fps": 30, "duration": 5.0, "total_frames": 1, "processed_at": "2026-08-06T10:15:00+00:00"}, "injury_risk": "low", "recommendations": ["Keep your shoulders level."], "balance_score": 83.4, "stability_score": 79.2, "pose_quality_score": 81.3}',
        encoding='utf-8',
    )

    result = pose_service.get_pose_result('abc123')

    assert result['status'] == 'completed'
    assert result['video_id'] == 'abc123'
    assert result['frames_processed'] == 1
    assert result['fps'] == 30
    assert result['total_frames'] == 1
    assert result['duration'] == 5.0
    assert result['landmarks_detected'] == 0
    assert result['injury_risk'] == 'low'
    assert result['recommendations'] == ['Keep your shoulders level.']
    assert result['analysis_time'] == '2026-08-06T10:15:00+00:00'
    assert result['analysis_date'] == '2026-08-06T10:15:00+00:00'
    assert result['balance_score'] == 83.4
    assert result['stability_score'] == 79.2
    assert result['pose_quality_score'] == 81.3


def test_adds_default_risk_and_recommendations_when_missing_from_result_json(isolated_pose_paths):
    pose_dir, uploads_dir = isolated_pose_paths
    (uploads_dir / 'abc123_video.mp4').write_bytes(b'data')
    result_path = pose_dir / 'abc123.json'
    result_path.write_text(
        '{"status": "completed", "video_id": "abc123", "pose_data": [{"landmarks": []}], "metadata": {"fps": 30, "duration": 5.0, "total_frames": 1}}',
        encoding='utf-8',
    )

    result = pose_service.get_pose_result('abc123')

    assert result['injury_risk'] == 'low'
    assert result['recommendations'] == [{
        'title': 'Maintain Current Form',
        'description': 'No significant movement issues detected. Continue training with proper technique.',
        'priority': 'Low',
    }]


def test_generates_risk_and_recommendations_from_analysis_metrics(isolated_pose_paths):
    pose_dir, uploads_dir = isolated_pose_paths
    (uploads_dir / 'abc123_video.mp4').write_bytes(b'data')
    result_path = pose_dir / 'abc123.json'
    result_path.write_text(
        '{"status": "completed", "video_id": "abc123", "pose_data": [{"landmarks": []}], "metadata": {"fps": 30, "duration": 5.0, "total_frames": 1}, "analysis": {"average_left_knee_angle": 120, "average_right_knee_angle": 132, "average_left_hip_angle": 95, "average_right_hip_angle": 110, "average_torso_lean": 38, "average_balance_score": 48, "knee_asymmetry": 12, "hip_asymmetry": 15, "posture_stability": 45}}',
        encoding='utf-8',
    )

    result = pose_service.get_pose_result('abc123')

    assert result['injury_risk'] in {'medium', 'high'}
    assert result['risk_score'] >= 0
    assert result['recommendations']
    assert result['biomechanical_analysis']['average_torso_lean'] == 38
    assert result['movement_quality']['excessive_torso_lean'] is True


def test_completed_payload_is_json_serializable_when_analysis_references_pose_data(isolated_pose_paths):
    pose_dir, uploads_dir = isolated_pose_paths
    (uploads_dir / 'abc123_video.mp4').write_bytes(b'data')
    result_path = pose_dir / 'abc123.json'
    result_path.write_text(
        json.dumps({
            'status': 'completed',
            'video_id': 'abc123',
            'pose_data': [{'landmarks': []}],
            'metadata': {'fps': 30, 'duration': 5.0, 'total_frames': 1},
            'analysis': {},
        }),
        encoding='utf-8',
    )

    result = pose_service.get_pose_result('abc123')

    assert json.loads(json.dumps(result)) == result


def test_build_analysis_summary_aggregates_multiple_frames():
    pose_data = [
        {
            'frame': 1,
            'landmarks': [
                {'name': 'LEFT_HIP', 'x': 0.2, 'y': 0.8, 'z': 0.0},
                {'name': 'LEFT_KNEE', 'x': 0.25, 'y': 0.55, 'z': 0.0},
                {'name': 'LEFT_ANKLE', 'x': 0.3, 'y': 0.2, 'z': 0.0},
                {'name': 'RIGHT_HIP', 'x': 0.8, 'y': 0.8, 'z': 0.0},
                {'name': 'RIGHT_KNEE', 'x': 0.75, 'y': 0.55, 'z': 0.0},
                {'name': 'RIGHT_ANKLE', 'x': 0.7, 'y': 0.2, 'z': 0.0},
                {'name': 'LEFT_SHOULDER', 'x': 0.3, 'y': 0.95, 'z': 0.0},
                {'name': 'RIGHT_SHOULDER', 'x': 0.7, 'y': 0.95, 'z': 0.0},
            ],
        },
        {
            'frame': 2,
            'landmarks': [
                {'name': 'LEFT_HIP', 'x': 0.25, 'y': 0.78, 'z': 0.0},
                {'name': 'LEFT_KNEE', 'x': 0.28, 'y': 0.5, 'z': 0.0},
                {'name': 'LEFT_ANKLE', 'x': 0.32, 'y': 0.15, 'z': 0.0},
                {'name': 'RIGHT_HIP', 'x': 0.75, 'y': 0.78, 'z': 0.0},
                {'name': 'RIGHT_KNEE', 'x': 0.72, 'y': 0.5, 'z': 0.0},
                {'name': 'RIGHT_ANKLE', 'x': 0.68, 'y': 0.15, 'z': 0.0},
                {'name': 'LEFT_SHOULDER', 'x': 0.32, 'y': 0.93, 'z': 0.0},
                {'name': 'RIGHT_SHOULDER', 'x': 0.68, 'y': 0.93, 'z': 0.0},
            ],
        },
    ]

    summary = biomechanics.build_analysis_summary(pose_data)

    assert summary['average_left_knee_angle'] > 0
    assert summary['average_right_knee_angle'] > 0
    assert summary['average_left_hip_angle'] > 0
    assert summary['average_right_hip_angle'] > 0
    assert 'knee_asymmetry' in summary
    assert 'hip_asymmetry' in summary
    assert 'posture_stability' in summary
