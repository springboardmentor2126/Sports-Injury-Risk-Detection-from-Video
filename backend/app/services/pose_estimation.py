"""
pose_estimation.py — wraps MediaPipe's PoseLandmarker (Tasks API) and
converts its 33-point output down to the 17-point COCO layout used
everywhere else in this project (DB schema's joint_coordinates column,
datasets/pose_dataset_loader.py, biomechanics.py).

IMPORTANT: newer mediapipe (0.10.x) removed the old `mp.solutions.pose`
API you'll see in most tutorials. This uses the current
`mp.tasks.vision.PoseLandmarker` API instead — verified against
mediapipe==0.10.33.
"""

from pathlib import Path
from typing import Optional

import mediapipe as mp
import numpy as np

from .pose_utils import Point

# MediaPipe's 33-landmark index -> our 17 COCO names.
# (MediaPipe PoseLandmark enum: 0=nose, 2=left_eye, 5=right_eye, 7=left_ear,
#  8=right_ear, 11/12=shoulders, 13/14=elbows, 15/16=wrists, 23/24=hips,
#  25/26=knees, 27/28=ankles. The rest -- fingers, face detail, heels,
#  foot index -- aren't part of COCO's 17 and are dropped.)
_MP_TO_COCO_INDEX = {
    "nose": 0, "left_eye": 2, "right_eye": 5, "left_ear": 7, "right_ear": 8,
    "left_shoulder": 11, "right_shoulder": 12,
    "left_elbow": 13, "right_elbow": 14,
    "left_wrist": 15, "right_wrist": 16,
    "left_hip": 23, "right_hip": 24,
    "left_knee": 25, "right_knee": 26,
    "left_ankle": 27, "right_ankle": 28,
}

VISIBILITY_THRESHOLD = 0.5

DEFAULT_MODEL_PATH = (
    Path(__file__).resolve().parents[3] / "models" / "pose_landmarker_lite.task"
)


class PoseEstimator:
    """
    Usage:
        with PoseEstimator() as estimator:
            keypoints = estimator.estimate(frame_rgb)
    """

    def __init__(self, model_path: Optional[str] = None):
        model_path = str(model_path or DEFAULT_MODEL_PATH)
        if not Path(model_path).exists():
            raise FileNotFoundError(
                f"Pose model not found at {model_path}. Run "
                "`python models/download_pose_model.py` once before "
                "starting the backend."
            )

        base_options = mp.tasks.BaseOptions(model_asset_path=model_path)
        options = mp.tasks.vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_poses=1,
        )
        self._landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(options)

    def close(self):
        self._landmarker.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()

    def estimate(self, frame_rgb: np.ndarray) -> Optional[dict[str, Point]]:
        """
        frame_rgb: HxWx3 uint8 numpy array, RGB channel order (OpenCV
        gives you BGR -- convert before calling this).

        Returns COCO-style {name: Point} for the first detected person,
        with coordinates in PIXEL space (not MediaPipe's normalized
        0-1 range) -- angle math needs real pixel ratios, otherwise a
        non-square frame silently skews every angle.

        Returns None if no person was detected in the frame.
        """
        height, width = frame_rgb.shape[:2]
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        result = self._landmarker.detect(mp_image)

        if not result.pose_landmarks:
            return None

        return map_landmarks_to_coco(result.pose_landmarks[0], width, height)


def map_landmarks_to_coco(landmarks, width: int, height: int) -> dict[str, Point]:
    """
    Pure conversion function, split out from estimate() so it's unit
    testable without needing a real model file / real image -- pass any
    object with .x/.y/.visibility per index 0-32 (matching MediaPipe's
    PoseLandmark layout) and it'll produce the same COCO dict.
    """
    keypoints: dict[str, Point] = {}
    for name, idx in _MP_TO_COCO_INDEX.items():
        lm = landmarks[idx]
        visibility = 2 if lm.visibility >= VISIBILITY_THRESHOLD else 0
        keypoints[name] = Point(
            x=lm.x * width,
            y=lm.y * height,
            visibility=visibility,
        )
    return keypoints
