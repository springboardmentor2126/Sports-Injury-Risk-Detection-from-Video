"""
test_annotation.py — verifies skeleton drawing (joints + bones get
actually drawn) and that AnnotatedVideoWriter produces a real, playable
video file.

Run from the project root:
    python backend/tests/test_annotation.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import cv2
import numpy as np

from backend.app.services.pose_utils import Point
from backend.app.services.biomechanics import analyze_frame
from backend.app.services.annotation import draw_skeleton, AnnotatedVideoWriter


def make_pose():
    return {
        "left_shoulder": Point(150, 60, 2), "right_shoulder": Point(190, 60, 2),
        "left_hip": Point(155, 130, 2), "right_hip": Point(185, 130, 2),
        "left_knee": Point(156, 180, 2), "right_knee": Point(184, 180, 2),
        "left_ankle": Point(157, 220, 2), "right_ankle": Point(183, 220, 2),
        "left_elbow": Point(130, 90, 2), "right_elbow": Point(210, 90, 2),
        "left_wrist": Point(125, 120, 2), "right_wrist": Point(215, 120, 2),
        "nose": Point(170, 40, 2), "left_eye": Point(165, 35, 2), "right_eye": Point(175, 35, 2),
        "left_ear": Point(158, 38, 1), "right_ear": Point(182, 38, 1),
    }


def main():
    kp = make_pose()
    metrics = analyze_frame(1, kp)

    # --- draw_skeleton actually draws something at the joint locations ---
    frame = np.zeros((240, 320, 3), dtype=np.uint8)
    result = draw_skeleton(frame.copy(), kp, metrics)
    assert result.shape == frame.shape
    px = result[130, 155]  # left_hip location
    assert not np.array_equal(px, [0, 0, 0]), "expected a joint marker drawn at the hip"
    print("draw_skeleton draws joints on a real pose: OK")

    # --- no-detection frames degrade gracefully instead of crashing ---
    blank = np.zeros((240, 320, 3), dtype=np.uint8)
    result_none = draw_skeleton(blank.copy(), None, None)
    assert not np.array_equal(result_none, blank), "expected a no-detection label"
    print("draw_skeleton handles missing detections: OK")

    # --- AnnotatedVideoWriter produces a real, readable video ---
    out_path = "/tmp/test_annotated_output.mp4"
    with AnnotatedVideoWriter(out_path, width=320, height=240, fps=8) as writer:
        for _ in range(5):
            writer.write(np.full((240, 320, 3), 50, dtype=np.uint8), kp, metrics)
        writer.write(np.full((240, 320, 3), 50, dtype=np.uint8), None, None)  # mixed in
    assert writer.frames_written == 6

    cap = cv2.VideoCapture(out_path)
    assert cap.isOpened(), "output video should be readable"
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    assert frame_count == 6
    assert (width, height) == (320, 240)
    print(f"AnnotatedVideoWriter produced a valid {width}x{height}, {frame_count}-frame video: OK")

    print("\nALL ANNOTATION TESTS PASSED")


if __name__ == "__main__":
    main()
