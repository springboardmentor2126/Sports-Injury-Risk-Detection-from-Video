"""
Takes a video file, runs MediaPipe pose detection on frames, draws a
skeleton overlay video, and computes biomechanical stats.

Uses MediaPipe's Tasks API (PoseLandmarker) — required for mediapipe
0.10.30+, which is what installs on Python 3.13/3.14.
"""

import json
import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    PoseLandmarker,
    PoseLandmarkerOptions,
    RunningMode,
)

from app.services.model_downloader import ensure_model_downloaded
from app.services.biomechanics import (
    knee_angle,
    hip_angle,
    trunk_lean_angle,
    knee_asymmetry,
    compute_movement_quality_score,
)

FRAME_SAMPLE_INTERVAL = 3
MIN_DETECTION_CONFIDENCE = 0.5

SKELETON_CONNECTIONS = [
    (11, 12),
    (11, 23), (12, 24),
    (23, 24),
    (23, 25), (25, 27),
    (24, 26), (26, 28),
    (11, 13), (13, 15),
    (12, 14), (14, 16),
]


class VideoFeasibilityError(Exception):
    pass


def _draw_skeleton(frame, landmarks, width, height):
    points = {}
    for idx in {i for pair in SKELETON_CONNECTIONS for i in pair}:
        lm = landmarks[idx]
        points[idx] = (int(lm.x * width), int(lm.y * height))

    for a, b in SKELETON_CONNECTIONS:
        cv2.line(frame, points[a], points[b], (0, 255, 0), 3)
    for pt in points.values():
        cv2.circle(frame, pt, 5, (0, 140, 255), -1)


def process_video(input_path: str, output_path: str) -> dict:
    model_path = ensure_model_downloaded()

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise VideoFeasibilityError("Could not open video file — it may be corrupted or an unsupported format.")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if width == 0 or height == 0 or total_frames == 0:
        cap.release()
        raise VideoFeasibilityError("Video has no readable frames — file may be empty or corrupted.")

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    left_knee_angles, right_knee_angles = [], []
    left_hip_angles, right_hip_angles = [], []
    trunk_leans = []

    frames_analyzed = 0
    frames_with_person = 0
    frame_index = 0

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=MIN_DETECTION_CONFIDENCE,
        min_tracking_confidence=MIN_DETECTION_CONFIDENCE,
    )

    with PoseLandmarker.create_from_options(options) as landmarker:
        while True:
            success, frame = cap.read()
            if not success:
                break

            if frame_index % FRAME_SAMPLE_INTERVAL == 0:
                frames_analyzed += 1
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

                timestamp_ms = int((frame_index / fps) * 1000)
                result = landmarker.detect_for_video(mp_image, timestamp_ms)

                if result.pose_landmarks:
                    frames_with_person += 1
                    landmarks = result.pose_landmarks[0]

                    lk = knee_angle(landmarks, "left")
                    rk = knee_angle(landmarks, "right")
                    lh = hip_angle(landmarks, "left")
                    rh = hip_angle(landmarks, "right")
                    trunk = trunk_lean_angle(landmarks)

                    if lk is not None:
                        left_knee_angles.append(lk)
                    if rk is not None:
                        right_knee_angles.append(rk)
                    if lh is not None:
                        left_hip_angles.append(lh)
                    if rh is not None:
                        right_hip_angles.append(rh)
                    if trunk is not None:
                        trunk_leans.append(trunk)

                    _draw_skeleton(frame, landmarks, width, height)

            writer.write(frame)
            frame_index += 1

    cap.release()
    writer.release()

    detection_rate = (frames_with_person / frames_analyzed) if frames_analyzed > 0 else 0.0

    def avg_or_none(values):
        return round(sum(values) / len(values), 1) if values else None

    avg_left_knee = avg_or_none(left_knee_angles)
    avg_right_knee = avg_or_none(right_knee_angles)
    avg_left_hip = avg_or_none(left_hip_angles)
    avg_right_hip = avg_or_none(right_hip_angles)
    avg_trunk = avg_or_none(trunk_leans)
    asymmetry = knee_asymmetry(avg_left_knee, avg_right_knee)

    quality_score = compute_movement_quality_score(
        avg_knee_asymmetry=asymmetry,
        avg_trunk_lean=avg_trunk,
        detection_rate=detection_rate,
    )

    notes = []
    if detection_rate < 0.5:
        notes.append(
            "Low detection rate — the person may not be fully visible in frame, "
            "lighting may be poor, or the camera angle may be obscuring the body. "
            "Results below should be treated as low-confidence."
        )
    if asymmetry is not None and asymmetry > 15:
        notes.append(
            f"Notable left/right knee angle asymmetry ({asymmetry:.1f} degrees) — "
            "may indicate uneven loading between legs."
        )
    if avg_trunk is not None and avg_trunk > 20:
        notes.append(
            f"Elevated trunk lean ({avg_trunk:.1f} degrees average) — "
            "may indicate reduced postural control."
        )

    return {
        "frames_analyzed": frames_analyzed,
        "frames_with_person_detected": frames_with_person,
        "detection_rate": round(detection_rate, 3),
        "avg_left_knee_angle": avg_left_knee,
        "avg_right_knee_angle": avg_right_knee,
        "knee_angle_asymmetry": round(asymmetry, 1) if asymmetry is not None else None,
        "avg_trunk_lean_angle": avg_trunk,
        "avg_left_hip_angle": avg_left_hip,
        "avg_right_hip_angle": avg_right_hip,
        "movement_quality_score": quality_score,
        "notes": json.dumps(notes),
    }
