"""
PoseEngine — Core MediaPipe Pose Estimation wrapper.

Uses the NEW MediaPipe Tasks API (required for MediaPipe 0.10.x+).
The old mp.solutions.pose API was removed in 0.10.x.

This engine is the pure AI brain — completely decoupled from:
- How the video arrives (file picker vs HTTP upload)
- How results are displayed (OpenCV window vs HTTP JSON response)
"""

import cv2
import numpy as np
import mediapipe as mp
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from mediapipe.tasks.python.components.containers.landmark import NormalizedLandmark

# Path to the downloaded pose landmarker model file
MODEL_PATH = Path(__file__).parent / "pose_landmarker.task"


@dataclass
class JointCoordinates:
    """
    Holds the normalized (0.0–1.0) X, Y, Z coordinates of key body joints
    for a single video frame. Used by Biomechanical Analysis (Step 2).
    """
    nose:              Optional[tuple] = None
    left_shoulder:     Optional[tuple] = None
    right_shoulder:    Optional[tuple] = None
    left_elbow:        Optional[tuple] = None
    right_elbow:       Optional[tuple] = None
    left_wrist:        Optional[tuple] = None
    right_wrist:       Optional[tuple] = None
    left_hip:          Optional[tuple] = None
    right_hip:         Optional[tuple] = None
    left_knee:         Optional[tuple] = None
    right_knee:        Optional[tuple] = None
    left_ankle:        Optional[tuple] = None
    right_ankle:       Optional[tuple] = None
    left_heel:         Optional[tuple] = None
    right_heel:        Optional[tuple] = None
    left_foot_index:   Optional[tuple] = None
    right_foot_index:  Optional[tuple] = None
    # Finger tips — used for wrist angle (boxing/throwing sports)
    left_index:        Optional[tuple] = None
    right_index:       Optional[tuple] = None
    left_pinky:        Optional[tuple] = None
    right_pinky:       Optional[tuple] = None
    all_landmarks:     list = field(default_factory=list)


@dataclass
class FrameResult:
    """
    Complete output of processing one video frame.
    Used identically by demo_pose.py (local) and video_router.py (FastAPI).
    """
    frame_index:        int
    timestamp_seconds:  float
    pose_detected:      bool
    annotated_frame:    np.ndarray
    joints:             Optional[JointCoordinates] = None


# MediaPipe landmark index → joint name
LANDMARK_MAP = {
    "nose": 0,
    "left_shoulder": 11,  "right_shoulder": 12,
    "left_elbow":    13,  "right_elbow":    14,
    "left_wrist":    15,  "right_wrist":    16,
    "left_hip":      23,  "right_hip":      24,
    "left_knee":     25,  "right_knee":     26,
    "left_ankle":    27,  "right_ankle":    28,
    "left_heel":     29,  "right_heel":     30,
    "left_foot_index": 31, "right_foot_index": 32,
    # Finger tips for wrist angle calculation
    "left_pinky":  17,    "right_pinky":  18,
    "left_index":  19,    "right_index":  20,
}

# Skeleton connections for drawing (pairs of landmark indices)
POSE_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 7),        # Face left
    (0, 4), (4, 5), (5, 6), (6, 8),        # Face right
    (9, 10),                                 # Mouth
    (11, 12),                                # Shoulders
    (11, 13), (13, 15),                     # Left arm
    (12, 14), (14, 16),                     # Right arm
    (15, 17), (15, 19), (15, 21),           # Left hand
    (16, 18), (16, 20), (16, 22),           # Right hand
    (11, 23), (12, 24), (23, 24),           # Torso
    (23, 25), (25, 27), (27, 29), (27, 31), # Left leg
    (24, 26), (26, 28), (28, 30), (28, 32), # Right leg
    (29, 31), (30, 32),                     # Feet
]


class PoseEngine:
    """
    Core Pose Estimation Engine using MediaPipe Tasks API (0.10.x+).

    Usage:
        with PoseEngine() as engine:
            result = engine.process_frame(frame, frame_index=0, fps=30)
    """

    def __init__(
        self,
        model_complexity: str = "full",   # "lite", "full", or "heavy"
        min_detection_confidence: float = 0.5,
        min_presence_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Pose model not found at {MODEL_PATH}.\n"
                f"Run this to download it:\n"
                f"  python -c \"import urllib.request; urllib.request.urlretrieve("
                f"'https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
                f"pose_landmarker_full/float16/1/pose_landmarker_full.task', "
                f"'app/ml/pose_estimation/pose_landmarker.task')\""
            )

        base_options = mp_python.BaseOptions(model_asset_path=str(MODEL_PATH))
        options = mp_vision.PoseLandmarkerOptions(
            base_options=base_options,
            output_segmentation_masks=False,
            min_pose_detection_confidence=min_detection_confidence,
            min_pose_presence_confidence=min_presence_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self.landmarker = mp_vision.PoseLandmarker.create_from_options(options)

    def process_frame(
        self,
        frame: np.ndarray,
        frame_index: int = 0,
        fps: float = 30.0,
    ) -> FrameResult:
        """
        Process a single BGR video frame from OpenCV.

        Returns:
            FrameResult with skeleton drawn on annotated_frame and joint coordinates.
        """
        timestamp = frame_index / fps if fps > 0 else 0.0

        # MediaPipe Tasks API needs RGB image wrapped in mp.Image
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        # Run inference
        detection_result = self.landmarker.detect(mp_image)

        annotated_frame = frame.copy()

        if not detection_result.pose_landmarks:
            return FrameResult(
                frame_index=frame_index,
                timestamp_seconds=timestamp,
                pose_detected=False,
                annotated_frame=annotated_frame,
                joints=None,
            )

        # Use the first detected person's landmarks
        landmarks = detection_result.pose_landmarks[0]

        # Draw skeleton on frame
        self._draw_skeleton(annotated_frame, landmarks)

        # Extract structured joint coordinates
        joints = self._extract_joints(landmarks)

        return FrameResult(
            frame_index=frame_index,
            timestamp_seconds=timestamp,
            pose_detected=True,
            annotated_frame=annotated_frame,
            joints=joints,
        )

    def _draw_skeleton(self, frame: np.ndarray, landmarks: list) -> None:
        """Draw skeleton connections and joint dots manually on the frame."""
        h, w = frame.shape[:2]
        
        # Minimum confidence thresholds
        VIS_THRESHOLD = 0.6
        PRESENCE_THRESHOLD = 0.6

        # Convert normalized coords to pixel coords, only if visible AND on-screen
        points = {}
        for i, lm in enumerate(landmarks):
            vis = getattr(lm, "visibility", 1.0)
            pres = getattr(lm, "presence", 1.0)
            
            # Must be confident it's visible, confident it's in the frame, and ACTUALLY in the frame bounds
            if vis > VIS_THRESHOLD and pres > PRESENCE_THRESHOLD:
                if 0.0 <= lm.x <= 1.0 and 0.0 <= lm.y <= 1.0:
                    points[i] = (int(lm.x * w), int(lm.y * h))

        # Draw connection lines
        for start_idx, end_idx in POSE_CONNECTIONS:
            if start_idx in points and end_idx in points:
                cv2.line(frame, points[start_idx], points[end_idx], (0, 255, 0), 2)

        # Draw joint circles
        for idx, (px, py) in points.items():
            cv2.circle(frame, (px, py), 5, (0, 0, 255), -1)   # Red dot
            cv2.circle(frame, (px, py), 5, (255, 255, 255), 1) # White outline

    def _extract_joints(self, landmarks: list) -> JointCoordinates:
        """Map MediaPipe landmarks into our clean JointCoordinates dataclass."""
        joints = JointCoordinates()
        VIS_THRESHOLD = 0.6
        PRESENCE_THRESHOLD = 0.6

        for joint_name, idx in LANDMARK_MAP.items():
            lm = landmarks[idx]
            vis = getattr(lm, "visibility", 1.0)
            pres = getattr(lm, "presence", 1.0)
            
            # Only record if the AI is confident AND the joint is physically within the camera frame
            if vis > VIS_THRESHOLD and pres > PRESENCE_THRESHOLD:
                if 0.0 <= lm.x <= 1.0 and 0.0 <= lm.y <= 1.0:
                    setattr(joints, joint_name, (
                        round(lm.x, 4),
                        round(lm.y, 4),
                        round(lm.z, 4),
                    ))

        joints.all_landmarks = [
            {
                "x": round(lm.x, 4), "y": round(lm.y, 4), "z": round(lm.z, 4),
                "visibility": round(getattr(lm, "visibility", 1.0), 4)
            }
            for lm in landmarks
        ]

        return joints

    def close(self) -> None:
        """Release MediaPipe resources."""
        self.landmarker.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
