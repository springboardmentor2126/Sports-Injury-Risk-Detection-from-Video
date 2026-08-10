"""
test_pose_mapping.py — verifies the MediaPipe(33 landmarks) -> COCO(17
keypoints) mapping and pixel-space conversion, without needing the real
.task model file or a real image.

Run from the project root:
    python backend/tests/test_pose_mapping.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.services.pose_estimation import map_landmarks_to_coco
from backend.app.services.pose_utils import calculate_joint_angle


class FakeLandmark:
    def __init__(self, x, y, visibility):
        self.x, self.y, self.visibility = x, y, visibility


def main():
    landmarks = [FakeLandmark(0, 0, 0.0) for _ in range(33)]
    # Simple squat-like pose in normalized [0,1] coords.
    landmarks[11] = FakeLandmark(0.45, 0.30, 0.99)  # left_shoulder
    landmarks[12] = FakeLandmark(0.55, 0.30, 0.99)  # right_shoulder
    landmarks[23] = FakeLandmark(0.46, 0.55, 0.99)  # left_hip
    landmarks[24] = FakeLandmark(0.54, 0.55, 0.99)  # right_hip
    landmarks[25] = FakeLandmark(0.60, 0.70, 0.99)  # left_knee (bent)
    landmarks[26] = FakeLandmark(0.40, 0.70, 0.99)  # right_knee
    landmarks[27] = FakeLandmark(0.47, 0.90, 0.99)  # left_ankle
    landmarks[28] = FakeLandmark(0.53, 0.90, 0.99)  # right_ankle

    # Deliberately non-square to catch aspect-ratio bugs in the pixel conversion.
    width, height = 1920, 1080
    kp = map_landmarks_to_coco(landmarks, width, height)

    assert kp["left_hip"].x == 0.46 * width
    assert kp["left_hip"].y == 0.55 * height
    print("pixel conversion respects non-square aspect ratio: OK")

    left_knee_angle = calculate_joint_angle(kp["left_hip"], kp["left_knee"], kp["left_ankle"])
    print(f"left knee angle: {left_knee_angle:.1f} degrees")
    assert left_knee_angle < 150, "expected a clearly bent knee"

    # A landmark below the visibility threshold should map to visibility=0
    landmarks[15] = FakeLandmark(0.5, 0.5, 0.1)  # low-confidence left_wrist
    kp2 = map_landmarks_to_coco(landmarks, width, height)
    assert kp2["left_wrist"].visibility == 0
    print("low-visibility landmarks correctly marked undetected: OK")

    print("\nALL POSE MAPPING TESTS PASSED")


if __name__ == "__main__":
    main()
