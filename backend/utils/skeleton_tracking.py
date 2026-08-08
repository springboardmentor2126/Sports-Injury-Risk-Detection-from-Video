import os
import shutil
import subprocess
from pathlib import Path
 
import cv2
 
from utils.pose_estimation import (
    detect_pose,
    draw_pose,
    extract_joint_coordinates,
    calculate_visibility,
)
 
 
# Known-good fallback locations, used only if ffmpeg isn't found on PATH
# (e.g. right after a winget install, before the shell/PATH has refreshed).
# You can also set the FFMPEG_PATH environment variable to override this.
_FFMPEG_FALLBACK_CANDIDATES = [
    os.environ.get("FFMPEG_PATH", ""),
    os.path.expandvars(
        r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
        r"\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"
    ),
]
 
 
def _resolve_ffmpeg():
    """Return a usable ffmpeg executable path, or raise a clear error."""
    on_path = shutil.which("ffmpeg")
    if on_path:
        return on_path
 
    for candidate in _FFMPEG_FALLBACK_CANDIDATES:
        if candidate and os.path.isfile(candidate):
            return candidate
 
    raise Exception(
        "ffmpeg is not on PATH and no fallback location was found. "
        "Either fix your PATH (reboot after installing via winget), or set the "
        "FFMPEG_PATH environment variable to the full path of ffmpeg.exe."
    )
 
 
# ---------------------------------------------------------
# Process Video with Skeleton Tracking
# ---------------------------------------------------------
 
def process_video_with_skeleton(video_path, output_folder="processed_videos"):
    """
    Detect pose for every frame, draw skeleton, and save a processed,
    browser-playable video.
 
    IMPORTANT: this function always returns exactly ONE final file, named
    deterministically from the input filename. There is no prefix-stripping
    / re-processing logic here anymore - that was the source of the
    'processed_processed_...' duplicate files. The caller (main.py) is
    responsible for handing this function an already-unique, already-safe
    filename (no spaces/special characters), so we just prefix it once.
    """
 
    os.makedirs(output_folder, exist_ok=True)
 
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception(f"Unable to open video: {video_path}")
 
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
 
    if width <= 0 or height <= 0:
        cap.release()
        raise Exception("Invalid video resolution.")
    if fps <= 0:
        fps = 30
 
    ffmpeg_exe = _resolve_ffmpeg()
 
    input_stem = Path(video_path).stem
    final_filename = f"processed_{input_stem}.mp4"
    final_path = os.path.abspath(os.path.join(output_folder, final_filename))
 
    # Raw intermediate file written with OpenCV's mp4v codec. mp4v is NOT
    # H.264 - it plays fine in Windows Media Player / VLC (which have the
    # codec installed natively) but Chrome/Firefox/Safari cannot decode it
    # at all. This is why the video "plays" locally but sits frozen at 0:00
    # in the React <video> tag. We always re-encode it below before serving
    # anything to the frontend.
    raw_path = os.path.abspath(os.path.join(output_folder, f"_raw_{input_stem}.mp4"))
 
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(raw_path, fourcc, fps, (width, height))
    if not writer.isOpened():
        cap.release()
        raise Exception(f"Unable to create output video:\n{raw_path}")
 
    total_frames = 0
    detected_frames = 0
    latest_joints = {}
    all_joints = []
    visibility_scores = []
 
    while True:
        success, frame = cap.read()
        if not success:
            break
 
        total_frames += 1
        results = detect_pose(frame)
 
        if results.pose_landmarks:
            detected_frames += 1
            latest_joints = extract_joint_coordinates(results)
            all_joints.append({k: v.to_dict() for k, v in latest_joints.items()})
            visibility_scores.append(calculate_visibility(results))
 
        frame = draw_pose(frame, results)
        writer.write(frame)
 
    cap.release()
    writer.release()
    cv2.destroyAllWindows()
 
    if not os.path.exists(raw_path):
        raise Exception(f"Raw processed video was not created.\nExpected:\n{raw_path}")
 
    # --- Mandatory H.264 re-encode so the file actually plays in a browser ---
    try:
        subprocess.run(
            [
                ffmpeg_exe,
                "-y",
                "-i",
                raw_path,
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                final_path,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError as e:
        raise Exception(f"ffmpeg conversion failed for {raw_path}: {e}")
    finally:
        # Clean up the raw mp4v intermediate file so it never lingers
        # alongside the final file (this is what used to cause duplicate /
        # mismatched files in processed_videos).
        if os.path.exists(raw_path):
            os.remove(raw_path)
 
    if not os.path.exists(final_path):
        raise Exception(f"Processed video was not created.\nExpected:\n{final_path}")
 
    average_visibility = 0
    if visibility_scores:
        average_visibility = round(sum(visibility_scores) / len(visibility_scores), 2)
 
    return {
        "processed_video": final_path,
        "total_frames": total_frames,
        "detected_frames": detected_frames,
        "detection_rate": round((detected_frames / total_frames) * 100, 2)
        if total_frames
        else 0,
        "average_visibility": average_visibility,
        "joints": {k: v.to_dict() for k, v in latest_joints.items()} if latest_joints else {},
        "all_joints": all_joints,
    }
 
 
# ---------------------------------------------------------
# Get Video Information
# ---------------------------------------------------------
 
def get_video_information(video_path):
    cap = cv2.VideoCapture(video_path)
    info = {
        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        "fps": cap.get(cv2.CAP_PROP_FPS),
        "frame_count": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
    }
    cap.release()
    return info
 
 
# ---------------------------------------------------------
# Save First Frame
# ---------------------------------------------------------
 
def save_thumbnail(video_path, output_folder="processed_videos"):
    os.makedirs(output_folder, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    success, frame = cap.read()
    if not success:
        cap.release()
        return None
    thumbnail_path = os.path.join(output_folder, "thumbnail.jpg")
    cv2.imwrite(thumbnail_path, frame)
    cap.release()
    return thumbnail_path