"""
biomechanics.py — turns a frame's COCO keypoints into the biomechanical
metrics the project spec calls for: joint angle analysis, movement
symmetry evaluation, posture assessment (Milestone 2 scope). Injury
risk scoring itself is Milestone 3 -- this module produces the inputs
that engine will consume.

Honesty note on accuracy: these are computed from a single 2D camera
view. True knee valgus and hip stability are frontal-plane (front-on)
measurements; without a calibrated frontal camera or 3D pose (world
landmarks), what's below is a useful *proxy*, not a clinical-grade
measurement. Flag this in any report/UI copy so it doesn't overstate
what the system can currently tell you.
"""

from dataclasses import dataclass
from typing import Optional

from .pose_utils import Point, calculate_joint_angle


@dataclass
class FrameMetrics:
    frame_number: int
    left_knee_angle: Optional[float]
    right_knee_angle: Optional[float]
    left_elbow_angle: Optional[float]
    right_elbow_angle: Optional[float]
    left_hip_angle: Optional[float]
    right_hip_angle: Optional[float]
    trunk_lean_deg: Optional[float]
    knee_valgus_proxy: Optional[float]
    knee_symmetry_diff: Optional[float]


def knee_angle(kp: dict[str, Point], side: str) -> Optional[float]:
    return calculate_joint_angle(kp[f"{side}_hip"], kp[f"{side}_knee"], kp[f"{side}_ankle"])


def elbow_angle(kp: dict[str, Point], side: str) -> Optional[float]:
    return calculate_joint_angle(kp[f"{side}_shoulder"], kp[f"{side}_elbow"], kp[f"{side}_wrist"])


def hip_angle(kp: dict[str, Point], side: str) -> Optional[float]:
    return calculate_joint_angle(kp[f"{side}_shoulder"], kp[f"{side}_hip"], kp[f"{side}_knee"])


def trunk_lean(kp: dict[str, Point]) -> Optional[float]:
    """
    Degrees off vertical for the shoulder-midpoint -> hip-midpoint line.
    0 = perfectly upright. Useful for landing-mechanics / posture checks.
    """
    ls, rs = kp["left_shoulder"], kp["right_shoulder"]
    lh, rh = kp["left_hip"], kp["right_hip"]
    if 0 in (ls.visibility, rs.visibility, lh.visibility, rh.visibility):
        return None

    shoulder_mid = ((ls.x + rs.x) / 2, (ls.y + rs.y) / 2)
    hip_mid = ((lh.x + rh.x) / 2, (lh.y + rh.y) / 2)

    dx = shoulder_mid[0] - hip_mid[0]
    dy = shoulder_mid[1] - hip_mid[1]  # image y grows downward

    import math
    # angle between the trunk vector and straight-up (0, -1)
    trunk_vec = (dx, dy)
    up_vec = (0, -1)
    dot = trunk_vec[0] * up_vec[0] + trunk_vec[1] * up_vec[1]
    mag = math.hypot(*trunk_vec)
    if mag == 0:
        return None
    cos_angle = max(-1.0, min(1.0, dot / mag))
    return math.degrees(math.acos(cos_angle))


def knee_valgus_proxy(kp: dict[str, Point], side: str) -> Optional[float]:
    """
    Horizontal distance (in pixels, normalized by leg length) the knee
    sits inside the hip-to-ankle line. Positive = knee caving inward,
    which is the pattern associated with ACL injury risk during
    landing/cutting.

    2D PROXY ONLY -- see module docstring. Real valgus assessment needs
    a frontal-view camera; from an arbitrary single viewpoint this
    number is directional, not diagnostic.
    """
    hip = kp[f"{side}_hip"]
    knee = kp[f"{side}_knee"]
    ankle = kp[f"{side}_ankle"]
    if 0 in (hip.visibility, knee.visibility, ankle.visibility):
        return None

    leg_length = ((hip.x - ankle.x) ** 2 + (hip.y - ankle.y) ** 2) ** 0.5
    if leg_length == 0:
        return None

    # Signed horizontal offset of the knee from the straight hip-ankle
    # line, as a fraction of leg length (so it's comparable across
    # people/distances-from-camera instead of being a raw pixel count).
    if ankle.y == hip.y:
        return None
    t = (knee.y - hip.y) / (ankle.y - hip.y)
    expected_knee_x = hip.x + t * (ankle.x - hip.x)
    offset = knee.x - expected_knee_x

    # Sign convention: positive = knee moved toward the body midline
    # (valgus direction) for that side.
    sign = 1 if side == "left" else -1
    percentage = round(sign * offset / leg_length * 100, 2)  # as % of leg length

    # Sanity guard -- |percentage| > 100 is anatomically impossible: it
    # would mean the knee sits sideways-displaced by MORE than the
    # entire straight-line hip-to-ankle distance. In practice this fires
    # almost exclusively on a bent-knee frame (classically running's
    # swing phase): bending the knee brings hip and ankle physically
    # closer together in a 2D projection, shrinking `leg_length` even
    # though the leg's actual reach hasn't changed, which inflates the
    # percentage for any offset, however small -- that's how a real
    # clip produced a "-129.5%" reading here. Same failure family as the
    # ROM-based symmetry fix in summarize() below: a metric implicitly
    # assumes a static/bilateral (squat-like) posture and silently
    # breaks on cyclical gait. Rather than report a number that isn't a
    # real measurement, treat this frame as "not measurable" (None) --
    # same honesty as an occluded joint already gets.
    if abs(percentage) > 100:
        return None

    return percentage


def analyze_frame(frame_number: int, kp: dict[str, Point]) -> FrameMetrics:
    left_knee = knee_angle(kp, "left")
    right_knee = knee_angle(kp, "right")

    symmetry_diff = (
        abs(left_knee - right_knee) if left_knee is not None and right_knee is not None else None
    )

    return FrameMetrics(
        frame_number=frame_number,
        left_knee_angle=left_knee,
        right_knee_angle=right_knee,
        left_elbow_angle=elbow_angle(kp, "left"),
        right_elbow_angle=elbow_angle(kp, "right"),
        left_hip_angle=hip_angle(kp, "left"),
        right_hip_angle=hip_angle(kp, "right"),
        trunk_lean_deg=trunk_lean(kp),
        knee_valgus_proxy=knee_valgus_proxy(kp, "left"),
        knee_symmetry_diff=symmetry_diff,
    )


def summarize(frames: list[FrameMetrics]) -> dict:
    """
    Aggregate per-frame metrics into the kind of summary a Milestone 2
    "biomechanics report" (per the project spec's Reports & Export
    System) would show, and that Milestone 3's risk-scoring engine
    would consume as input features.

    Symmetry metric design note: this used to report the single largest
    same-frame |left - right| knee angle difference across the clip.
    That's meaningful for bilateral movements (squats, landings) where
    both legs are supposed to move together at the same instant -- but
    for cyclical gait (running, sprinting), legs are *supposed* to be
    out of phase (one leg extended in support while the other is bent
    in swing), so that same-frame comparison produces a large number
    for completely normal running and reads as a false asymmetry
    alarm. Comparing each leg's range of motion (ROM) over the whole
    clip instead is valid for both movement types: it asks "does each
    leg move through a similar range overall", not "are both legs at
    the same angle at this exact instant."
    """
    def avg(values: list[Optional[float]]) -> Optional[float]:
        clean = [v for v in values if v is not None]
        return round(sum(clean) / len(clean), 2) if clean else None

    def maxabs(values: list[Optional[float]]) -> Optional[float]:
        clean = [v for v in values if v is not None]
        return round(max(clean, key=abs), 2) if clean else None

    def rom(values: list[Optional[float]]) -> Optional[float]:
        clean = [v for v in values if v is not None]
        return round(max(clean) - min(clean), 2) if len(clean) >= 2 else None

    left_knee_values = [f.left_knee_angle for f in frames]
    right_knee_values = [f.right_knee_angle for f in frames]
    left_knee_rom = rom(left_knee_values)
    right_knee_rom = rom(right_knee_values)
    knee_rom_asymmetry = (
        round(abs(left_knee_rom - right_knee_rom), 2)
        if left_knee_rom is not None and right_knee_rom is not None
        else None
    )

    return {
        "frames_analyzed": len(frames),
        "frames_with_detection": sum(1 for f in frames if f.left_knee_angle is not None),
        "avg_left_knee_angle": avg(left_knee_values),
        "avg_right_knee_angle": avg(right_knee_values),
        "avg_trunk_lean_deg": avg([f.trunk_lean_deg for f in frames]),
        "left_knee_rom": left_knee_rom,
        "right_knee_rom": right_knee_rom,
        "knee_rom_asymmetry": knee_rom_asymmetry,
        "peak_knee_valgus_proxy": maxabs([f.knee_valgus_proxy for f in frames]),
    }


