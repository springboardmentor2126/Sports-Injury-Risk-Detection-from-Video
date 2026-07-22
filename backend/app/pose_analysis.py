
import math
import statistics
from typing import List, Dict, Optional

import cv2
import numpy as np
import mediapipe as mp

mp_pose = mp.solutions.pose


FRAME_SAMPLE_RATE = 3


def _angle_between(a, b, c) -> float:
    """Angle at point b, formed by rays b->a and b->c, in degrees."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    cosine = np.clip(cosine, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosine)))


def _get_xy(landmarks, idx) -> Optional[tuple]:
    lm = landmarks[idx]
    if lm.visibility < 0.5:
        return None
    return (lm.x, lm.y)


LMK = mp_pose.PoseLandmark


def process_video(filepath: str) -> Dict:
    
    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        raise RuntimeError("Could not open video file for processing")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration_seconds = (total_frames / fps) if fps else None

    left_knee_angles, right_knee_angles = [], []
    trunk_leans = []
    hip_centers_x, hip_centers_y = [], []
    knee_valgus_samples = []
    ankle_distances = []
    joint_alignment_samples = []
    frames_with_pose = 0
    frame_idx = 0

    with mp_pose.Pose(static_image_mode=False, model_complexity=1,
                       min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame_idx += 1
            if frame_idx % FRAME_SAMPLE_RATE != 0:
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)
            if not result.pose_landmarks:
                continue

            lm = result.pose_landmarks.landmark
            frames_with_pose += 1

            l_hip, r_hip = _get_xy(lm, LMK.LEFT_HIP), _get_xy(lm, LMK.RIGHT_HIP)
            l_knee, r_knee = _get_xy(lm, LMK.LEFT_KNEE), _get_xy(lm, LMK.RIGHT_KNEE)
            l_ankle, r_ankle = _get_xy(lm, LMK.LEFT_ANKLE), _get_xy(lm, LMK.RIGHT_ANKLE)
            l_shoulder, r_shoulder = _get_xy(lm, LMK.LEFT_SHOULDER), _get_xy(lm, LMK.RIGHT_SHOULDER)

            # Knee flexion angles
            if l_hip and l_knee and l_ankle:
                left_knee_angles.append(_angle_between(l_hip, l_knee, l_ankle))
            if r_hip and r_knee and r_ankle:
                right_knee_angles.append(_angle_between(r_hip, r_knee, r_ankle))

            # Trunk lean: angle of shoulder-midpoint -> hip-midpoint line vs vertical
            if l_shoulder and r_shoulder and l_hip and r_hip:
                shoulder_mid = ((l_shoulder[0] + r_shoulder[0]) / 2, (l_shoulder[1] + r_shoulder[1]) / 2)
                hip_mid = ((l_hip[0] + r_hip[0]) / 2, (l_hip[1] + r_hip[1]) / 2)
                dx = shoulder_mid[0] - hip_mid[0]
                dy = shoulder_mid[1] - hip_mid[1]
                trunk_leans.append(abs(math.degrees(math.atan2(dx, -dy))))
                hip_centers_x.append(hip_mid[0])
                hip_centers_y.append(hip_mid[1])

            # Knee valgus proxy: horizontal deviation of knee from the hip-ankle line
            for hip, knee, ankle in [(l_hip, l_knee, l_ankle), (r_hip, r_knee, r_ankle)]:
                if hip and knee and ankle:
                    expected_x = (hip[0] + ankle[0]) / 2
                    deviation = abs(knee[0] - expected_x)
                    leg_length = abs(hip[1] - ankle[1]) + 1e-6
                    knee_valgus_samples.append(deviation / leg_length)

            # Stride length proxy: horizontal distance between ankles, normalized by hip-to-ankle length
            if l_ankle and r_ankle and l_hip:
                stride = abs(l_ankle[0] - r_ankle[0])
                body_ref = abs(l_hip[1] - l_ankle[1]) + 1e-6
                ankle_distances.append(stride / body_ref)

            # Joint alignment proxy: how well knee sits between hip and ankle (lower = better aligned)
            for hip, knee, ankle in [(l_hip, l_knee, l_ankle), (r_hip, r_knee, r_ankle)]:
                if hip and knee and ankle:
                    midpoint = ((hip[0] + ankle[0]) / 2, (hip[1] + ankle[1]) / 2)
                    dist = math.hypot(knee[0] - midpoint[0], knee[1] - midpoint[1])
                    ref = math.hypot(hip[0] - ankle[0], hip[1] - ankle[1]) + 1e-6
                    joint_alignment_samples.append(dist / ref)

    cap.release()

    if frames_with_pose == 0:
        raise RuntimeError(
            "No human pose could be detected in this video. "
            "Try a clearer, well-lit clip with the full body visible."
        )

    def avg(lst):
        return round(statistics.mean(lst), 2) if lst else None

    avg_left_knee = avg(left_knee_angles)
    avg_right_knee = avg(right_knee_angles)

    # Movement symmetry: how close left/right knee angles track each other (100 = identical)
    symmetry_score = None
    if left_knee_angles and right_knee_angles:
        n = min(len(left_knee_angles), len(right_knee_angles))
        diffs = [abs(left_knee_angles[i] - right_knee_angles[i]) for i in range(n)]
        mean_diff = statistics.mean(diffs)
        symmetry_score = round(max(0.0, 100 - mean_diff * 2), 1)

    # Knee valgus score: 0 = none, 100 = severe (scaled heuristically)
    knee_valgus_score = None
    if knee_valgus_samples:
        knee_valgus_score = round(min(100.0, avg(knee_valgus_samples) * 300), 1)

    # Hip stability: lower variance in hip center position = more stable (invert to 0-100, higher=better)
    hip_stability_score = None
    if len(hip_centers_x) > 1:
        variance = statistics.pstdev(hip_centers_x) + statistics.pstdev(hip_centers_y)
        hip_stability_score = round(max(0.0, 100 - variance * 400), 1)

    trunk_lean_degrees = avg(trunk_leans)

    # Landing mechanics: deeper minimum knee flexion during the clip = better shock absorption
    landing_mechanics_score = None
    all_knee_angles = left_knee_angles + right_knee_angles
    if all_knee_angles:
        min_angle = min(all_knee_angles)
        # 180deg (straight leg) -> poor landing mechanics; ~90-140deg flexion -> good
        landing_mechanics_score = round(max(0.0, min(100.0, (180 - min_angle) * 1.3)), 1)

    stride_length_ratio = avg(ankle_distances)

    joint_alignment_score = None
    if joint_alignment_samples:
        joint_alignment_score = round(max(0.0, 100 - avg(joint_alignment_samples) * 150), 1)

    balance_score = None
    if len(hip_centers_x) > 1:
        balance_score = round(max(0.0, 100 - statistics.pstdev(hip_centers_x) * 500), 1)

    # Overall movement quality score — simple weighted average of the sub-scores we have.
    component_scores = [s for s in [
        knee_valgus_score if knee_valgus_score is None else 100 - knee_valgus_score,
        hip_stability_score, landing_mechanics_score, joint_alignment_score,
        balance_score, symmetry_score,
    ] if s is not None]
    movement_quality_score = round(statistics.mean(component_scores), 1) if component_scores else None

    if movement_quality_score is None:
        risk_category = "Unknown"
    elif movement_quality_score >= 80:
        risk_category = "Low"
    elif movement_quality_score >= 60:
        risk_category = "Moderate"
    elif movement_quality_score >= 40:
        risk_category = "High"
    else:
        risk_category = "Critical"

    return {
        "duration_seconds": round(duration_seconds, 2) if duration_seconds else None,
        "frames_processed": frames_with_pose,
        "avg_left_knee_angle": avg_left_knee,
        "avg_right_knee_angle": avg_right_knee,
        "knee_valgus_score": knee_valgus_score,
        "hip_stability_score": hip_stability_score,
        "trunk_lean_degrees": trunk_lean_degrees,
        "landing_mechanics_score": landing_mechanics_score,
        "stride_length_ratio": stride_length_ratio,
        "joint_alignment_score": joint_alignment_score,
        "balance_score": balance_score,
        "movement_symmetry_score": symmetry_score,
        "movement_quality_score": movement_quality_score,
        "risk_category": risk_category,
    }
