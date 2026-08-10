"""
annotation.py — draws the detected skeleton (joints + connecting bones)
and key angle readouts onto video frames, and writes them out as a
playable annotated video.

Scope note: the annotated video is built from the SAME sampled frames
that pose estimation already runs on (up to video_processing's
MAX_FRAMES_TO_ANALYZE), not every frame of the original upload. That
keeps this bounded and reuses work already done instead of doubling
processing cost. It plays back at a fixed FIXED_OUTPUT_FPS, so it's a
representative motion sequence of the analyzed frames, not a
frame-exact real-time replay of the original clip. Said explicitly here
and in the API/UI so nobody mistakes it for the original footage.

Browser-compatibility note (important, learned the hard way): OpenCV's
VideoWriter with the 'mp4v' fourcc produces MPEG-4 Part 2 video. That's
a perfectly valid file -- cv2.VideoCapture can read it back fine, which
is why writing it looks "correct" in a quick test -- but most browsers'
HTML5 <video> decoders only support H.264/AVC (or VP8/9, AV1), not
MPEG-4 Part 2. Playing an mp4v file directly in a browser tends to
render as glitchy, corrupted-looking color noise instead of erroring
out cleanly, which is a confusing failure mode if you don't know to
look for it. So: OpenCV writes the raw draft, then ffmpeg re-encodes it
to real H.264 before it's ever served to the frontend.
"""

import shutil
import subprocess
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from .pose_utils import Point, COCO_KEYPOINT_NAMES
from .biomechanics import FrameMetrics

FIXED_OUTPUT_FPS = 8

# Standard COCO 17-point skeleton connections. Face landmarks (eyes/ears)
# are drawn as dots only, no connecting lines -- they're not
# biomechanically useful and just add visual clutter.
SKELETON_EDGES = [
    ("left_shoulder", "right_shoulder"),
    ("left_shoulder", "left_elbow"), ("left_elbow", "left_wrist"),
    ("right_shoulder", "right_elbow"), ("right_elbow", "right_wrist"),
    ("left_shoulder", "left_hip"), ("right_shoulder", "right_hip"),
    ("left_hip", "right_hip"),
    ("left_hip", "left_knee"), ("left_knee", "left_ankle"),
    ("right_hip", "right_knee"), ("right_knee", "right_ankle"),
]

JOINT_COLOR = (45, 212, 191)     # pulse-cyan (BGR) -- matches frontend theme
EDGE_COLOR = (230, 230, 230)     # light gray bones
LABEL_COLOR = (255, 255, 255)
LABEL_BG = (20, 20, 20)
JOINT_RADIUS = 5


def draw_skeleton(
    frame_bgr: np.ndarray,
    keypoints: Optional[dict[str, Point]],
    metrics: Optional[FrameMetrics] = None,
) -> np.ndarray:
    """
    Draws in place on frame_bgr and also returns it (for chaining).
    If keypoints is None (no person detected in this frame), the frame
    is returned untouched except for a small "no detection" label.
    """
    if keypoints is None:
        cv2.putText(
            frame_bgr, "no person detected", (12, 28),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2, cv2.LINE_AA,
        )
        return frame_bgr

    def pt(name: str):
        p = keypoints.get(name)
        if p is None or p.visibility == 0:
            return None
        return (int(round(p.x)), int(round(p.y)))

    for a_name, b_name in SKELETON_EDGES:
        a, b = pt(a_name), pt(b_name)
        if a and b:
            cv2.line(frame_bgr, a, b, EDGE_COLOR, 2, cv2.LINE_AA)

    for name in COCO_KEYPOINT_NAMES:
        p = pt(name)
        if p:
            cv2.circle(frame_bgr, p, JOINT_RADIUS, JOINT_COLOR, -1, cv2.LINE_AA)

    if metrics:
        _label_angle(frame_bgr, pt("left_knee"), metrics.left_knee_angle)
        _label_angle(frame_bgr, pt("right_knee"), metrics.right_knee_angle)

    return frame_bgr


def _label_angle(frame_bgr: np.ndarray, anchor: Optional[tuple[int, int]], angle: Optional[float]):
    if anchor is None or angle is None:
        return
    text = f"{angle:.0f} deg"
    x, y = anchor[0] + 8, anchor[1] - 8
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
    cv2.rectangle(frame_bgr, (x - 2, y - th - 4), (x + tw + 2, y + 4), LABEL_BG, -1)
    cv2.putText(frame_bgr, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, LABEL_COLOR, 1, cv2.LINE_AA)


class AnnotatedVideoWriter:
    """
    Usage:
        with AnnotatedVideoWriter(path, width, height) as writer:
            for frame_rgb, keypoints, metrics in frames:
                writer.write(frame_rgb, keypoints, metrics)
    """

    def __init__(self, output_path: str, width: int, height: int, fps: int = FIXED_OUTPUT_FPS):
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        self._writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        self._frames_written = 0

    def write(self, frame_rgb: np.ndarray, keypoints: Optional[dict[str, Point]], metrics: Optional[FrameMetrics]):
        frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
        draw_skeleton(frame_bgr, keypoints, metrics)
        self._writer.write(frame_bgr)
        self._frames_written += 1

    @property
    def frames_written(self) -> int:
        return self._frames_written

    def close(self):
        self._writer.release()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()


def reencode_for_browser(raw_path: str, output_path: str) -> bool:
    """
    Re-encodes raw_path (OpenCV's mp4v output) to real H.264/yuv420p at
    output_path using ffmpeg -- this is what actually makes it play in
    a browser's <video> tag instead of showing as corrupted color
    noise. +faststart moves the moov atom to the front so the video can
    start playing before the whole file downloads.

    Returns True on success. If ffmpeg isn't installed or the encode
    fails, returns False -- callers should treat that as "no annotated
    video available" rather than serving the unplayable raw file, since
    a broken player is worse than an honest "not available" message.
    """
    if shutil.which("ffmpeg") is None:
        return False

    result = subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", raw_path,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-loglevel", "error",
            output_path,
        ],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and Path(output_path).exists() and Path(output_path).stat().st_size > 0

