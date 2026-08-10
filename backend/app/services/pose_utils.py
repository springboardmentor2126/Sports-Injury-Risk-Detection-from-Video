"""
pose_utils.py — shared pose primitives for the backend.

This deliberately mirrors datasets/pose_dataset_loader.py rather than
importing it. backend/ and datasets/ are separate top-level folders (not
an installable shared package), and reaching across that boundary with
sys.path hacks at runtime (inside a uvicorn process) is more fragile
than duplicating ~30 lines of stable math. If you ever turn this repo
into a proper package, unify these into one module first.
"""

import math
from typing import NamedTuple, Optional

# Standard COCO 17-keypoint order.
COCO_KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]


class Point(NamedTuple):
    x: float
    y: float
    visibility: float  # 0 = not detected, 2 = detected (COCO convention)


def calculate_joint_angle(a: Point, b: Point, c: Point) -> Optional[float]:
    """
    Angle at joint `b`, formed by segments b->a and b->c, in degrees.
    Returns None if any point wasn't actually detected.
    """
    if a.visibility == 0 or b.visibility == 0 or c.visibility == 0:
        return None

    ba = (a.x - b.x, a.y - b.y)
    bc = (c.x - b.x, c.y - b.y)

    dot = ba[0] * bc[0] + ba[1] * bc[1]
    mag_ba = math.hypot(*ba)
    mag_bc = math.hypot(*bc)

    if mag_ba == 0 or mag_bc == 0:
        return None

    cos_angle = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))
