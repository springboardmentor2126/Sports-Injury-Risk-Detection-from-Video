"""
test_video_processing.py — verifies frame extraction and validation
logic against a small synthetic video generated on the fly (no sample
video file needed).

Run from the project root:
    python backend/tests/test_video_processing.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import cv2
import numpy as np

from backend.app.services.video_processing import (
    extract_frames,
    get_video_info,
    validate_upload_filename,
    InvalidVideoError,
)


def make_synthetic_video(path: str, num_frames: int = 30, size=(320, 240), fps: int = 10):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(path, fourcc, fps, size)
    for i in range(num_frames):
        frame = np.full((size[1], size[0], 3), fill_value=(i * 8) % 256, dtype=np.uint8)
        writer.write(frame)
    writer.release()


def main():
    path = "/tmp/synthetic_test_video.mp4"
    make_synthetic_video(path, num_frames=30)

    info = get_video_info(path)
    print("video info:", info)
    assert info.width == 320 and info.height == 240
    assert info.frame_count == 30
    print("get_video_info: OK")

    frames = list(extract_frames(path, max_frames=10))
    frame_numbers = [f[0] for f in frames]
    print("sampled frame numbers:", frame_numbers)
    assert len(frames) == 10
    assert frame_numbers[0] == 0
    assert frame_numbers[-1] == 29
    assert frames[0][1].shape == (240, 320, 3)
    print("extract_frames: OK (evenly sampled, correct shape/order)")

    try:
        validate_upload_filename("video.exe")
        raise AssertionError("should have rejected .exe")
    except InvalidVideoError:
        print("filename validation rejects unsupported extensions: OK")

    validate_upload_filename("clip.mp4")
    print("filename validation accepts .mp4: OK")

    print("\nALL VIDEO PROCESSING TESTS PASSED")


if __name__ == "__main__":
    main()
