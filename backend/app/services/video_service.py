import os
from pathlib import Path
from typing import List
from uuid import uuid4

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / 'uploads' / 'videos'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {'.mp4', '.avi', '.mov'}
MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024


def select_sampled_frame_numbers(
    total_frames: int,
    sample_interval: int = 1,
    max_frames: int = 60,
) -> List[int]:
    """Return a sequence of sampled frame numbers from a video.

    If sample_interval > 1, this function selects every Nth frame first.
    If there are still more frames than max_frames, it downsamples further
    to a fixed number of frames.
    """
    if total_frames <= 0:
        return []

    if sample_interval < 1:
        sample_interval = 1

    sampled = list(range(1, total_frames + 1, sample_interval))
    if len(sampled) <= max_frames:
        return sampled

    # When there are more sampled frames than we can keep, we downsample.
    # Use different strategies depending on whether a sample_interval was
    # provided: if sample_interval > 1 we downsample the already-sampled
    # frames (preserving the last sampled frame semantics); if sample_interval
    # == 1 we sample evenly across the full video and ensure the last frame
    # equals `total_frames`.
    if max_frames == 1:
        return [sampled[0]]

    if sample_interval > 1:
        # Downsample the already-sampled frames while keeping both endpoints.
        selected: List[int] = []
        n = len(sampled)
        for i in range(max_frames):
            idx = int(round(i * (n - 1) / (max_frames - 1)))
            if idx >= n:
                idx = n - 1
            frame_number = sampled[idx]
            if not selected or frame_number != selected[-1]:
                selected.append(frame_number)
        return selected[:max_frames]
    else:
        # sample_interval == 1: pick max_frames evenly from 1..total_frames,
        # including the final frame explicitly.
        selected: List[int] = []
        for i in range(max_frames):
            frame_number = int(round(1 + i * (total_frames - 1) / (max_frames - 1)))
            if frame_number > total_frames:
                frame_number = total_frames
            if not selected or frame_number != selected[-1]:
                selected.append(frame_number)
        return selected[:max_frames]


def is_allowed_video_file(filename: str, size_bytes: int) -> bool:
    extension = Path(filename).suffix.lower()
    return extension in ALLOWED_EXTENSIONS and size_bytes <= MAX_FILE_SIZE_BYTES


def save_uploaded_video(upload_file) -> dict:
    filename = Path(upload_file.filename or 'video').name
    if not filename:
        raise ValueError('No file selected.')

    if not is_allowed_video_file(filename, upload_file.size or 0):
        raise ValueError('Unsupported file format or file too large.')

    video_id = uuid4().hex
    destination_name = f"{video_id}_{filename}"
    destination_path = UPLOAD_DIR / destination_name

    with destination_path.open('wb') as destination:
        while True:
            chunk = upload_file.file.read(1024 * 1024)
            if not chunk:
                break
            destination.write(chunk)

    return {
        'video_id': video_id,
        'filename': destination_path.name,
        'original_filename': filename,
        'status': 'uploaded',
        'filepath': str(destination_path.relative_to(Path(__file__).resolve().parent.parent.parent)).replace('\\', '/'),
    }
