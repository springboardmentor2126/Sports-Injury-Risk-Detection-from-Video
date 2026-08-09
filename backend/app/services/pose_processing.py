from __future__ import annotations

from typing import Any, Dict, List, Sequence

MAX_FRAME_COUNT = 60


def prepare_pose_frames(pose_data: Sequence[Dict[str, Any]] | None, max_frames: int = MAX_FRAME_COUNT) -> List[Dict[str, Any]]:
    """Return a CPU-friendly subset of valid pose frames, capped to the configured limit."""
    if not pose_data:
        return []

    cleaned_frames: List[Dict[str, Any]] = []
    for frame in pose_data:
        if not isinstance(frame, dict):
            continue
        landmarks = frame.get('landmarks')
        if isinstance(landmarks, list):
            cleaned_frames.append(frame)

    if max_frames <= 0:
        return cleaned_frames

    return cleaned_frames[:max_frames]
