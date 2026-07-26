"""
math_utils.py — Pure mathematical functions for biomechanical analysis.

All functions here are stateless (no class needed) — they take numbers in
and return numbers out. This makes them trivial to test and reuse anywhere.

The single core function `calculate_angle_3d` is reused for EVERY joint in
the body — knees, hips, elbows, shoulders, ankles. The same trigonometry
works for all of them.
"""

import numpy as np
from typing import Tuple, Optional


def calculate_angle_3d(
    a: Tuple[float, float, float],
    b: Tuple[float, float, float],
    c: Tuple[float, float, float],
) -> float:
    """
    Calculate the angle (in degrees) at point B, formed by the ray B->A
    and the ray B->C.

    This is the universal joint angle formula. Use it for any joint:
    - Knee angle:    (hip, knee, ankle)
    - Elbow angle:   (shoulder, elbow, wrist)
    - Hip angle:     (shoulder, hip, knee)
    - Shoulder angle:(hip, shoulder, elbow)
    - Ankle angle:   (knee, ankle, foot)

    Args:
        a: (x, y, z) of the first point  (e.g. hip)
        b: (x, y, z) of the vertex point (e.g. knee) — the joint we measure
        c: (x, y, z) of the third point  (e.g. ankle)

    Returns:
        Angle in degrees (0–180). Returns 0.0 if points are degenerate.
    """
    a_arr = np.array(a, dtype=float)
    b_arr = np.array(b, dtype=float)
    c_arr = np.array(c, dtype=float)

    # Vectors FROM the vertex TO each neighbouring point
    ba = a_arr - b_arr
    bc = c_arr - b_arr

    ba_norm = np.linalg.norm(ba)
    bc_norm = np.linalg.norm(bc)

    # Guard against zero-length vectors (degenerate landmarks)
    if ba_norm == 0 or bc_norm == 0:
        return 0.0

    # cos(θ) = (BA · BC) / (|BA| * |BC|)
    cos_angle = np.dot(ba, bc) / (ba_norm * bc_norm)

    # Clamp to [-1, 1] to avoid NaN from floating-point drift
    cos_angle = np.clip(cos_angle, -1.0, 1.0)

    return float(np.degrees(np.arccos(cos_angle)))


def calculate_symmetry(left_val: float, right_val: float) -> float:
    """
    Calculate a symmetry score between a left-side and right-side measurement.

    Returns:
        A score from 0.0 to 1.0 where:
        - 1.0 = perfect symmetry (both sides identical)
        - 0.0 = completely asymmetric (one side is 0, or extreme difference)

    Example:
        Left knee angle: 140°, Right knee angle: 118°
        → symmetry = 0.84  (84% symmetric — mild asymmetry, worth flagging)
    """
    if left_val <= 0 and right_val <= 0:
        return 1.0  # Both zero — treat as symmetric

    avg = (left_val + right_val) / 2.0
    if avg == 0:
        return 0.0

    diff = abs(left_val - right_val)
    symmetry = max(0.0, 1.0 - (diff / avg))
    return round(symmetry, 4)


def midpoint(
    a: Tuple[float, float, float],
    b: Tuple[float, float, float],
) -> Tuple[float, float, float]:
    """Return the 3D midpoint between two landmarks."""
    return (
        (a[0] + b[0]) / 2.0,
        (a[1] + b[1]) / 2.0,
        (a[2] + b[2]) / 2.0,
    )


def calculate_trunk_lean(
    shoulder_mid: Tuple[float, float, float],
    hip_mid: Tuple[float, float, float],
) -> float:
    """
    Calculate how much the trunk/spine is leaning forward or to the side.

    We measure the angle of the line from the hip midpoint to the shoulder
    midpoint relative to a perfect vertical line (0°, 1.0, 0.0).

    Returns:
        Trunk lean in degrees. 0° = perfectly upright. Higher = more lean.
    """
    vertical = (0.0, -1.0, 0.0)  # MediaPipe Y increases downward
    trunk_vec = (
        shoulder_mid[0] - hip_mid[0],
        shoulder_mid[1] - hip_mid[1],
        shoulder_mid[2] - hip_mid[2],
    )
    return calculate_angle_3d(
        (hip_mid[0] + vertical[0], hip_mid[1] + vertical[1], hip_mid[2] + vertical[2]),
        hip_mid,
        shoulder_mid,
    )


def calculate_rotation_deg(
    left_point: Tuple[float, float, float],
    right_point: Tuple[float, float, float],
) -> float:
    """
    Calculate the axial rotation (twist) of a body segment using the Z-depth
    difference between the left and right landmarks of that segment.

    Use this for:
    - Torso rotation:  (left_shoulder, right_shoulder)
    - Hip rotation:    (left_hip, right_hip)

    MediaPipe Z is depth — negative = closer to the camera.
    If the left shoulder is much closer to the camera than the right shoulder,
    the torso is rotating to the right (and vice versa).

    Returns:
        Rotation angle in degrees (0 = square-on to camera, 90 = fully sideways).
        Positive = left side forward, Negative = right side forward.
    """
    import math
    # Distance between left and right in X (width)
    dx = right_point[0] - left_point[0]
    # Z-depth difference: left minus right
    dz = left_point[2] - right_point[2]

    if dx == 0 and dz == 0:
        return 0.0

    # atan2 gives us the angle of the twist in radians
    rotation_rad = math.atan2(dz, max(abs(dx), 1e-6))
    return round(math.degrees(rotation_rad), 2)


def calculate_neck_angle(
    nose: Tuple[float, float, float],
    left_shoulder: Tuple[float, float, float],
    right_shoulder: Tuple[float, float, float],
) -> float:
    """
    Approximate the neck/head tilt angle.

    We calculate the angle from the shoulder midpoint to the nose,
    relative to a straight vertical line upward from the shoulders.
    This is a useful injury-risk signal for:
    - Boxing: head position when absorbing impacts
    - Wrestling: neck loading during holds and takedowns

    Returns:
        Neck tilt angle in degrees. 0° = head perfectly upright.
        Higher = head is tilted forward/sideways.
    """
    shoulder_mid = midpoint(left_shoulder, right_shoulder)
    # Virtual point directly above the shoulder midpoint (perfect upright)
    vertical_above = (shoulder_mid[0], shoulder_mid[1] - 0.2, shoulder_mid[2])
    return calculate_angle_3d(vertical_above, shoulder_mid, nose)


def calculate_knee_valgus_deg(
    hip: Tuple[float, float, float],
    knee: Tuple[float, float, float],
    ankle: Tuple[float, float, float],
) -> float:
    """
    Measure the Frontal Plane Projection Angle (FPPA) at the knee.

    This is the clinical gold-standard for detecting KNEE VALGUS (knee-in
    collapse) and KNEE VARUS (knee-out bowing).

    The key difference from our regular knee angle:
    - Regular knee angle uses 3D (X, Y, Z) → measures flexion/extension
    - FPPA uses only 2D (X, Y)            → measures medial/lateral collapse

    Clinical thresholds:
    - FPPA < 165°: Mild valgus — monitor closely
    - FPPA < 150°: Severe valgus — high ACL tear risk, especially in landing
    - FPPA > 195°: Varus (bow-legged) — knee bowing outward

    Returns:
        Frontal plane angle at the knee in degrees.
        ~180° = neutral. Lower = valgus (inward collapse).
    """
    # Project to 2D frontal plane by zeroing out Z (depth) component
    hip_2d   = (hip[0],   hip[1],   0.0)
    knee_2d  = (knee[0],  knee[1],  0.0)
    ankle_2d = (ankle[0], ankle[1], 0.0)

    # Reuse the same universal angle formula — now in 2D only
    return calculate_angle_3d(hip_2d, knee_2d, ankle_2d)


def calculate_balance_offset(
    left_hip: Tuple[float, float, float],
    right_hip: Tuple[float, float, float],
    left_ankle: Tuple[float, float, float],
    right_ankle: Tuple[float, float, float],
) -> float:
    """
    Estimate dynamic balance by measuring the horizontal displacement between
    the center of mass (CoM) and the center of the base of support (BoS).

    - CoM: Approximated as the midpoint of the two hips (pelvis position).
    - BoS: Midpoint of the two ankles (the footprint support area).
    - If CoM shifts far laterally from BoS, the athlete is losing balance.

    Clinical interpretation:
    - < 0.03  = stable, well-balanced
    - 0.03–0.07 = mild lateral sway
    - > 0.07  = significant instability — hip stability risk flag raised

    Returns:
        Horizontal offset as a normalized fraction of image width (0.0 = perfect).
    """
    com_x = (left_hip[0] + right_hip[0]) / 2.0
    bos_x = (left_ankle[0] + right_ankle[0]) / 2.0
    return round(abs(com_x - bos_x), 4)


def calculate_stance_width(
    left_ankle: Tuple[float, float, float],
    right_ankle: Tuple[float, float, float],
) -> float:
    """
    Calculate the horizontal distance between the two ankles (stance width).

    Relevant for:
    - Running: Narrow stride = unstable, wide stride = inefficient
    - Squats / landings: Optimal width reduces valgus/varus stress
    - Boxing / wrestling: Guard stance width assessment

    Returns:
        Horizontal distance as a normalized fraction of image width.
        (e.g., 0.2 = ankles are 20% of the frame width apart)
    """
    return round(abs(right_ankle[0] - left_ankle[0]), 4)
