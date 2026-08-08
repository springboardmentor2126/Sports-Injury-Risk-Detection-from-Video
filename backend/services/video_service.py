import os
from pathlib import Path
 
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
PROCESSED_DIR = Path(__file__).parent.parent / "processed_videos"
 
 
def delete_video_files(video) -> None:
    """
    Removes the original uploaded file and the processed (skeleton-overlay)
    video from disk for a given Video ORM row. Safe to call even if one or
    both files are already gone.
    """
    if video is None:
        return
 
    if video.stored_filename:
        upload_path = UPLOAD_DIR / video.stored_filename
        if upload_path.exists():
            os.remove(upload_path)
 
    if video.processed_filename:
        processed_path = PROCESSED_DIR / video.processed_filename
        if processed_path.exists():
            os.remove(processed_path)
 