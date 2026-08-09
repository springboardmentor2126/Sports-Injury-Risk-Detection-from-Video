import json
import os
import time
import logging
from datetime import datetime, timezone
from pathlib import Path

import cv2
import tempfile
import shutil
from pathlib import Path

import sys

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.pose_estimator import run_pose_estimation
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status, BackgroundTasks

from app.crud.analysis_history import save_analysis_history
from app.database.database import SessionLocal
from app.schemas.analysis_history import AnalysisHistoryCreate
from app.services.biomechanics import build_analysis_summary
from app.services.injury_prediction import _normalize_issues
from app.services.video_service import save_uploaded_video, UPLOAD_DIR, select_sampled_frame_numbers
from app.services.risk_scoring import score_risk
from app.services.recommendations import build_recommendations

logger = logging.getLogger(__name__)

POSE_RESULTS_DIR = UPLOAD_DIR.parent / 'pose_results'
POSE_RESULTS_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix='/videos', tags=['videos'])


def _process_video_background(video_path: Path, video_id: str, user_id: str | None = None, video_name: str | None = None) -> None:
    logger.info(f'[BACKGROUND TASK] Pose estimation started for {video_id}')
    print(f'Pose estimation started for {video_id}')
    total_start = time.perf_counter()
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        logger.error(f'[BACKGROUND TASK] Unable to open uploaded video file for {video_id}')
        raise RuntimeError('Unable to open uploaded video file.')

    frame_extraction_time = 0.0
    pose_estimation_time = 0.0
    biomechanical_time = 0.0
    json_save_time = 0.0

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
            logger.error(f'[BACKGROUND TASK] No frames to process for {video_id}')
            raise RuntimeError('Uploaded video contains no frames.')

        logger.info(f'[BACKGROUND TASK] Video uploaded: {video_id}')
        logger.info(f'[BACKGROUND TASK] Frame extraction started for {video_id}')
        logger.info(f'[BACKGROUND TASK] Video metadata for {video_id}: fps={fps}, duration={duration}, total_frames={total_frames}, sampled_frame_count={len(sampled_frame_numbers)}')
        print(f'Video uploaded: {video_id}')
        print(f'Frame extraction started for {video_id}')

        selected_frame_numbers = set(sampled_frame_numbers)
        pose_data = []

        # Write sampled frames to a temporary directory and run YOLOv8-pose on them
        frame_extraction_start = time.perf_counter()
        tmp_dir = Path(tempfile.mkdtemp(prefix=f'frames_{video_id}_', dir=str(POSE_RESULTS_DIR)))
        try:
            for frame_number in sorted(selected_frame_numbers):
                cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, frame_number - 1))
                success, frame = cap.read()
                if not success or frame is None:
                    logger.warning(f'[BACKGROUND TASK] Failed to read frame {frame_number} for {video_id}')
                    continue

                # Resize for faster processing
                if frame.shape[1] > 640:
                    resized_frame = cv2.resize(frame, (640, int(frame.shape[0] * 640 / frame.shape[1])))
                else:
                    resized_frame = frame

                frame_path = tmp_dir / f'frame_{frame_number:06d}.jpg'
                cv2.imencode('.jpg', resized_frame)[1].tofile(str(frame_path))

            # Run YOLOv8 pose estimator on sampled frames (up to 30 inside function)
            tmp_pose_json = POSE_RESULTS_DIR / f'{video_id}_raw_pose.json'
            pose_est_start = time.perf_counter()
            run_pose_estimation(str(tmp_dir), str(tmp_pose_json), metadata={'video_id': video_id, 'fps': fps, 'duration': duration, 'total_frames': total_frames})
            pose_estimation_time += time.perf_counter() - pose_est_start

            # Read produced pose data
            if tmp_pose_json.exists():
                with tmp_pose_json.open('r', encoding='utf-8') as fh:
                    tmp = json.load(fh)
                    pose_data = tmp.get('pose_data', [])

            frame_extraction_time = time.perf_counter() - frame_extraction_start
            # If no valid frames were detected, write a completed JSON with guidance
            if not pose_data:
                analysis_completed_at = datetime.now(timezone.utc)
                analysis_timestamp = analysis_completed_at.isoformat()
                output_path = POSE_RESULTS_DIR / f'{video_id}.json'
                output_data = {
                    'status': 'completed',
                    'video_id': video_id,
                    'analysis_time': analysis_timestamp,
                    'analysis_date': analysis_timestamp,
                    'metadata': {
                        'fps': fps,
                        'duration': duration,
                        'total_frames': total_frames,
                        'processed_at': analysis_timestamp,
                    },
                    'pose_data': [],
                    'analysis': {},
                    'keypoints': [],
                    'biomechanical_analysis': {},
                    'injury_risk': 'unknown',
                    'balance_score': None,
                    'stability_score': None,
                    'pose_quality_score': None,
                    'metric_availability': {
                        'balance_score': {'status': 'unavailable', 'reason': 'No pose landmarks detected.'},
                        'stability_score': {'status': 'unavailable', 'reason': 'No pose landmarks detected.'},
                        'pose_quality_score': {'status': 'unavailable', 'reason': 'No pose landmarks detected.'},
                    },
                    'recommendations': ['No pose detected in the uploaded video.'],
                }
                try:
                    with output_path.open('w', encoding='utf-8') as fh:
                        json.dump(output_data, fh, indent=2)
                    logger.info(f'[BACKGROUND TASK] No poses found — saved empty result for {video_id} at {output_path}')
                except Exception:
                    logger.exception('[BACKGROUND TASK] Failed saving empty pose result for %s', video_id)
                # Nothing else to do for this video
                return
        finally:
            try:
                shutil.rmtree(tmp_dir)
            except Exception:
                pass
        logger.info(f'[BACKGROUND TASK] Frame extraction completed for {video_id}. Extracted {len(pose_data)} sampled frames.')
        print(f'Frame extraction completed for {video_id}. Extracted {len(pose_data)} sampled frames.')

        logger.info(f'[BACKGROUND TASK] Pose estimation started for {video_id}')
        print(f'Pose estimation started for {video_id}')
        analysis_start = time.perf_counter()
        analysis = build_analysis_summary(pose_data)
        biomechanical_time = time.perf_counter() - analysis_start
        logger.info(f'[BACKGROUND TASK] Pose estimation completed for {video_id}')
        logger.info(f'[BACKGROUND TASK] Biomechanical analysis completed for {video_id}')
        print(f'Pose estimation completed for {video_id}')
        print(f'Biomechanical analysis completed for {video_id}')

        scoring = score_risk(analysis) if isinstance(analysis, dict) else {'risk_score': 0, 'injury_risk': 'low', 'issues': []}
        recommendations = build_recommendations(analysis, scoring['issues']) if isinstance(analysis, dict) else []
        detected_issues = _normalize_issues(scoring.get('issues', [])) if isinstance(analysis, dict) else []
        total_issues_detected = len(detected_issues) if detected_issues is not None else None
        balance_score = analysis.get('average_balance_score') if isinstance(analysis, dict) else None
        stability_score = analysis.get('posture_stability') if isinstance(analysis, dict) else None
        pose_quality_score = analysis.get('pose_quality_score') if isinstance(analysis, dict) else None
        analysis_completed_at = datetime.now(timezone.utc)
        analysis_timestamp = analysis_completed_at.isoformat()

        if isinstance(analysis, dict):
            analysis['analysis_time'] = analysis_timestamp
            analysis['analysis_date'] = analysis_timestamp
        movement_quality = {
            'knee_valgus': 'knee_valgus' in scoring['issues'],
            'excessive_torso_lean': 'excessive_torso_lean' in scoring['issues'],
            'hip_drop': 'hip_drop' in scoring['issues'],
            'shoulder_imbalance': 'shoulder_imbalance' in scoring['issues'],
            'poor_squat_depth': 'poor_squat_depth' in scoring['issues'],
            'posture_instability': 'posture_instability' in scoring['issues'],
        }
        output_data = {
            'status': 'completed',
            'video_id': video_id,
            'analysis_time': analysis_timestamp,
            'analysis_date': analysis_timestamp,
            'metadata': {
                'fps': fps,
                'duration': duration,
                'total_frames': total_frames,
                'processed_at': analysis_timestamp,
            },
            'pose_data': pose_data,
            'analysis': analysis,
            'keypoints': pose_data[0]['landmarks'] if pose_data else [],
            'biomechanical_analysis': analysis,
            'movement_quality': movement_quality,
            'risk_score': scoring['risk_score'],
            'injury_risk': scoring['injury_risk'],
            'recommendations': recommendations,
            'detected_issues': detected_issues,
            'total_issues_detected': total_issues_detected,
            'balance_score': balance_score,
            'stability_score': stability_score,
            'pose_quality_score': pose_quality_score,
            'metric_availability': analysis.get('metric_availability') if isinstance(analysis, dict) else None,
        }

        output_path = POSE_RESULTS_DIR / f'{video_id}.json'
        json_save_start = time.perf_counter()
        logger.info(f'[BACKGROUND TASK] Saving JSON to: {output_path}')
        with output_path.open('w', encoding='utf-8') as fh:
            json.dump(output_data, fh, indent=2)
        json_save_time = time.perf_counter() - json_save_start
        logger.info(f'[BACKGROUND TASK] JSON saved for {video_id} at {output_path}')
        print(f'JSON saved for {video_id}')
        print(f'File exists after save: {output_path.exists()}')

        total_time = time.perf_counter() - total_start
        logger.info(f'[BACKGROUND TASK] Video Upload Time: N/A for background task')
        logger.info(f'[BACKGROUND TASK] Frame Extraction Time: {frame_extraction_time:.3f}s')
        logger.info(f'[BACKGROUND TASK] Pose Estimation Time: {pose_estimation_time:.3f}s')
        logger.info(f'[BACKGROUND TASK] Biomechanical Analysis Time: {biomechanical_time:.3f}s')
        logger.info(f'[BACKGROUND TASK] JSON Save Time: {json_save_time:.3f}s')
        logger.info(f'[BACKGROUND TASK] Total Processing Time: {total_time:.3f}s')
        print(f'Video Upload Time: N/A for background task')
        print(f'Frame Extraction Time: {frame_extraction_time:.3f}s')
        print(f'Pose Estimation Time: {pose_estimation_time:.3f}s')
        print(f'Biomechanical Analysis Time: {biomechanical_time:.3f}s')
        print(f'JSON Save Time: {json_save_time:.3f}s')
        print(f'Total Processing Time: {total_time:.3f}s')

        if user_id:
            try:
                with SessionLocal() as db:
                    save_analysis_history(
                        db=db,
                        payload=AnalysisHistoryCreate(
                            user_id=int(user_id),
                            video_id=video_id,
                            video_name=video_name,
                            risk_score=float(scoring.get('risk_score', 0) or 0),
                            risk_level=scoring.get('injury_risk') or 'low',
                            balance_score=balance_score,
                            stability_score=stability_score,
                            pose_quality_score=pose_quality_score,
                            total_issues=len(scoring.get('issues', []) or []),
                            total_issues_detected=total_issues_detected,
                            detected_issues=detected_issues,
                            recommendations=recommendations if recommendations else None,
                            frames_processed=total_frames,
                            duration=duration,
                            processing_status='Completed',
                            analysis_time=analysis_completed_at,
                        ),
                    )
            except Exception as history_error:
                logger.warning(f'[BACKGROUND TASK] Unable to save history for {video_id}: {history_error}')

        logger.info(f'[BACKGROUND TASK] Pose estimation finished for {video_id}')
        logger.info(f'[BACKGROUND TASK] Analysis completed for {video_id}')
        print('Pose estimation finished for', video_id)
        print('Analysis completed for', video_id)
    except Exception as error:
        logger.error(f'[BACKGROUND TASK] Pose estimation failed for {video_id}: {error}', exc_info=True)
        print('Pose estimation failed for', video_id, error)
        fail_output_path = POSE_RESULTS_DIR / f'{video_id}.json'
        with fail_output_path.open('w', encoding='utf-8') as fh:
            json.dump({'status': 'failed', 'video_id': video_id, 'error': str(error)}, fh, indent=2)
    finally:
        cap.release()


@router.post('/upload')
def upload_video(video: UploadFile = File(...), user_id: str | None = Form(default=None), background_tasks: BackgroundTasks = None) -> dict:
    try:
        upload_start = time.perf_counter()
        result = save_uploaded_video(video)
        upload_time = time.perf_counter() - upload_start

        logger.info(f'[UPLOAD] Video Upload Time: {upload_time:.3f}s')
        logger.info(f'[UPLOAD] Generated video_id: {result.get("video_id")}')
        logger.info(f'[UPLOAD] Saved upload: {result.get("filename")}')
        logger.info(f'[UPLOAD] Current status: {result.get("status")}')
        print('Video Upload Time:', f'{upload_time:.3f}s')
        print('Generated video_id:', result.get('video_id'))
        print('Saved upload:', result.get('filename'))
        print('Current status:', result.get('status'))

        if background_tasks is not None:
            video_path = UPLOAD_DIR / result.get('filename')
            logger.info(f'[UPLOAD] Scheduling background task for {result.get("video_id")} from {video_path}')
            background_tasks.add_task(_process_video_background, video_path, result.get('video_id'), user_id, result.get('original_filename') or result.get('filename'))
            logger.info(f'[UPLOAD] Background task scheduled')

        return result
    except ValueError as error:
        logger.error(f'[UPLOAD] ValueError: {error}')
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
