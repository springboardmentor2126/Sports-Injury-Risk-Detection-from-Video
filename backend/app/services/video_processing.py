"""
video_processing.py — video upload validation and frame extraction.
Covers the project spec's "Video Upload & Processing Engine" module
(preprocessing, frame extraction, quality validation).
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import cv2
import numpy as np

SUPPORTED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv"}
MIN_RESOLUTION = (240, 240)  # (width, height) -- reject unusably small video
MAX_FRAMES_TO_ANALYZE = 60  # cap per-video processing time without a job queue


@dataclass
class VideoInfo:
    width: int
    height: int
    fps: float
    frame_count: int
    duration_seconds: float


class InvalidVideoError(ValueError):
    pass


def validate_upload_filename(filename: str) -> None:
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise InvalidVideoError(
            f"Unsupported file type '{ext}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )


def get_video_info(video_path: str) -> VideoInfo:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise InvalidVideoError("Could not open video file -- it may be corrupt or an unsupported codec.")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    if width < MIN_RESOLUTION[0] or height < MIN_RESOLUTION[1]:
        raise InvalidVideoError(
            f"Video resolution {width}x{height} is below the minimum "
            f"{MIN_RESOLUTION[0]}x{MIN_RESOLUTION[1]} needed for reliable pose detection."
        )
    if frame_count <= 0:
        raise InvalidVideoError("Video has no readable frames.")

    return VideoInfo(
        width=width,
        height=height,
        fps=fps,
        frame_count=frame_count,
        duration_seconds=round(frame_count / fps, 2) if fps else 0.0,
    )


def extract_frames(video_path: str, max_frames: int = MAX_FRAMES_TO_ANALYZE) -> Iterator[tuple[int, np.ndarray]]:
    """
    Yields (frame_number, frame_rgb) tuples, evenly sampled across the
    whole video so a short clip and a long clip both get representative
    coverage instead of only analyzing the first few seconds.

    frame_rgb is RGB channel order (converted from OpenCV's native BGR)
    since that's what PoseEstimator/mediapipe expects.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise InvalidVideoError("Could not open video file for frame extraction.")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        cap.release()
        raise InvalidVideoError("Video has no readable frames.")

    sample_count = min(max_frames, total_frames)
    # Evenly spaced frame indices across the whole video.
    indices = [round(i * (total_frames - 1) / max(sample_count - 1, 1)) for i in range(sample_count)]
    indices = sorted(set(indices))

    for frame_number in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ok, frame_bgr = cap.read()
        if not ok:
            continue
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        yield frame_number, frame_rgb

    cap.release()
