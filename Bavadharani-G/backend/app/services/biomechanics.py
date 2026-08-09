"""
Pure math functions for biomechanical analysis — no video/AI dependency
here, just geometry on (x, y) joint coordinates.
"""

import math

LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_HIP, RIGHT_HIP = 23, 24
LEFT_KNEE, RIGHT_KNEE = 25, 26
LEFT_ANKLE, RIGHT_ANKLE = 27, 28


def calculate_angle(a, b, c):
    ax, ay = a
    bx, by = b
    cx, cy = c

    v1 = (ax - bx, ay - by)
    v2 = (cx - bx, cy - by)

    dot = v1[0] * v2[0] + v1[1] * v2[1]
    mag1 = math.hypot(*v1)
    mag2 = math.hypot(*v2)

    if mag1 == 0 or mag2 == 0:
        return None

    cos_angle = max(-1.0, min(1.0, dot / (mag1 * mag2)))
    angle_rad = math.acos(cos_angle)
    return math.degrees(angle_rad)


def knee_angle(landmarks, side="left"):
    if side == "left":
        hip, knee, ankle = LEFT_HIP, LEFT_KNEE, LEFT_ANKLE
    else:
        hip, knee, ankle = RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE

    return calculate_angle(
        (landmarks[hip].x, landmarks[hip].y),
        (landmarks[knee].x, landmarks[knee].y),
        (landmarks[ankle].x, landmarks[ankle].y),
    )


def hip_angle(landmarks, side="left"):
    if side == "left":
        shoulder, hip, knee = LEFT_SHOULDER, LEFT_HIP, LEFT_KNEE
    else:
        shoulder, hip, knee = RIGHT_SHOULDER, RIGHT_HIP, RIGHT_KNEE

    return calculate_angle(
        (landmarks[shoulder].x, landmarks[shoulder].y),
        (landmarks[hip].x, landmarks[hip].y),
        (landmarks[knee].x, landmarks[knee].y),
    )


def trunk_lean_angle(landmarks):
    mid_shoulder = (
        (landmarks[LEFT_SHOULDER].x + landmarks[RIGHT_SHOULDER].x) / 2,
        (landmarks[LEFT_SHOULDER].y + landmarks[RIGHT_SHOULDER].y) / 2,
    )
    mid_hip = (
        (landmarks[LEFT_HIP].x + landmarks[RIGHT_HIP].x) / 2,
        (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2,
    )

    vertical_reference = (mid_hip[0], mid_hip[1] - 0.3)

    return calculate_angle(vertical_reference, mid_hip, mid_shoulder)


def knee_asymmetry(left_angle, right_angle):
    if left_angle is None or right_angle is None:
        return None
    return abs(left_angle - right_angle)


def compute_movement_quality_score(avg_knee_asymmetry, avg_trunk_lean, detection_rate):
    score = 100.0

    if avg_knee_asymmetry is not None:
        score -= min(avg_knee_asymmetry * 1.5, 30)

    if avg_trunk_lean is not None:
        excess_lean = max(0, avg_trunk_lean - 10)
        score -= min(excess_lean * 1.2, 30)

    if detection_rate < 0.7:
        score -= (0.7 - detection_rate) * 50

    return round(max(0.0, min(100.0, score)), 1)
