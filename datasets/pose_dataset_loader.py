"""
pose_dataset_loader.py — utilities for reading COCO-format keypoint
annotations (what both the COCO Keypoints dataset and MediaPipe/YOLOv8
pose output use) and turning them into joint angles.

This is the shared format your Milestone 2 Pose Estimation Engine will
produce and your Milestone 2 Biomechanical Analysis Engine will consume,
so it's worth having tested now rather than improvising it later.
"""

import json
import math
from pathlib import Path
from typing import NamedTuple, Optional

# Standard COCO 17-keypoint order. MediaPipe Pose uses a different,
# larger keypoint set (33 points) -- see COCO_TO_MEDIAPIPE_NOTE below.
COCO_KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]

COCO_TO_MEDIAPIPE_NOTE = (
    "MediaPipe Pose returns 33 landmarks (includes fingers, feet detail). "
    "When wiring up the real Pose Estimation Engine in Milestone 2, map "
    "MediaPipe's landmark indices down to this 17-point COCO layout so "
    "the rest of the pipeline (this loader, angle calc, DB schema's "
    "joint_coordinates/joint_angles JSON columns) doesn't need to change "
    "depending on which pose backend produced the data."
)


class Point(NamedTuple):
    x: float
    y: float
    visibility: float  # COCO: 0 = not labeled, 1 = labeled but not visible, 2 = visible


def parse_keypoints(flat_keypoints: list[float]) -> dict[str, Point]:
    """
    COCO stores keypoints as a flat [x1, y1, v1, x2, y2, v2, ...] array.
    Returns them as a name -> Point dict, which is what you actually
    want to work with.
    """
    if len(flat_keypoints) != len(COCO_KEYPOINT_NAMES) * 3:
        raise ValueError(
            f"Expected {len(COCO_KEYPOINT_NAMES) * 3} values "
            f"(17 keypoints x 3), got {len(flat_keypoints)}"
        )

    points = {}
    for i, name in enumerate(COCO_KEYPOINT_NAMES):
        x, y, v = flat_keypoints[i * 3: i * 3 + 3]
        points[name] = Point(x=x, y=y, visibility=v)
    return points


def load_coco_keypoints(json_path: str | Path) -> list[dict]:
    """
    Loads a COCO person_keypoints_*.json annotation file and returns a
    list of {image_id, keypoints, bbox} dicts -- one per annotated person.
    Skips annotations with zero visible keypoints (num_keypoints == 0),
    since those are unusable for pose/biomechanics work.
    """
    with open(json_path) as f:
        data = json.load(f)

    results = []
    for ann in data.get("annotations", []):
        if ann.get("num_keypoints", 0) == 0:
            continue
        results.append({
            "image_id": ann["image_id"],
            "keypoints": parse_keypoints(ann["keypoints"]),
            "bbox": ann.get("bbox"),
        })
    return results


def calculate_joint_angle(a: Point, b: Point, c: Point) -> Optional[float]:
    """
    Angle at joint `b`, formed by the two segments b->a and b->c, in
    degrees. This is the core building block for the Biomechanical
    Analysis Engine's "Joint angle analysis" requirement -- e.g. knee
    angle = calculate_joint_angle(hip, knee, ankle).

    Returns None if any of the three points weren't actually detected
    (visibility == 0), so callers can skip/flag frames with missing data
    instead of silently computing a meaningless angle.
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


def knee_angle(keypoints: dict[str, Point], side: str = "left") -> Optional[float]:
    """Convenience wrapper: knee_angle(kp) == hip-knee-ankle angle."""
    return calculate_joint_angle(
        keypoints[f"{side}_hip"],
        keypoints[f"{side}_knee"],
        keypoints[f"{side}_ankle"],
    )


def elbow_angle(keypoints: dict[str, Point], side: str = "left") -> Optional[float]:
    """Convenience wrapper: elbow_angle(kp) == shoulder-elbow-wrist angle."""
    return calculate_joint_angle(
        keypoints[f"{side}_shoulder"],
        keypoints[f"{side}_elbow"],
        keypoints[f"{side}_wrist"],
    )
