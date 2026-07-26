"""
PoseService — Business logic layer for video processing.

This file orchestrates the full pipeline:
  Video File → PoseEngine (skeleton tracking) → BiomechanicalAnalyzer (math) → Results

It is called identically by:
- demo_pose.py (local): called with a local file path
- video_router.py (FastAPI): called with a temp file path after an HTTP upload

This means ZERO code duplication between local testing and the production web server.
"""

import cv2
import os
import subprocess
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional

from app.ml.pose_estimation.engine import PoseEngine, FrameResult
from app.ml.biomechanics.analyzer import BiomechanicalAnalyzer, BiomechanicsResult


@dataclass
class VideoAnalysisResult:
    """
    The complete result of analyzing an entire video.
    Includes both raw pose data AND aggregated biomechanical statistics.
    """
    video_path:           str
    total_frames:         int
    fps:                  float
    duration_seconds:     float
    frames_processed:     int
    frames_with_pose:     int
    pose_detection_rate:  float
    saved_image_paths:    List[str]

    # ── Aggregated Biomechanics (across all frames) ───────────────────
    # These are the values XGBoost will use in Milestone 3.
    avg_left_knee_angle:    Optional[float] = None
    avg_right_knee_angle:   Optional[float] = None
    min_left_knee_angle:    Optional[float] = None   # Worst-case flexion (most stress)
    min_right_knee_angle:   Optional[float] = None
    avg_left_hip_angle:     Optional[float] = None
    avg_right_hip_angle:    Optional[float] = None
    avg_left_elbow_angle:   Optional[float] = None
    avg_right_elbow_angle:  Optional[float] = None
    avg_knee_symmetry:      Optional[float] = None
    avg_hip_symmetry:       Optional[float] = None
    avg_trunk_lean:         Optional[float] = None
    avg_overall_symmetry:   Optional[float] = None

    # Risk flag counts: how many frames triggered each risk flag
    frames_knee_hyperextension: int = 0
    frames_knee_acute_flexion:  int = 0
    frames_excessive_trunk_lean: int = 0
    frames_low_symmetry:        int = 0
    frames_elbow_hyperextension: int = 0

    # Per-frame data for detailed analysis
    frame_results:         List[FrameResult] = field(default_factory=list)
    biomechanics_results:  List[BiomechanicsResult] = field(default_factory=list)

    # Path to the temporary skeleton-annotated video (deleted after user views it)
    annotated_video_path:  Optional[str] = None


def process_video(
    video_path: str,
    output_dir: str,
    process_every_n_frames: int = 3,
    save_frames_at_seconds: Optional[List[float]] = None,
) -> VideoAnalysisResult:
    """
    Full video processing pipeline: Pose Estimation + Biomechanical Analysis.

    Args:
        video_path:             Path to the input video file.
        output_dir:             Directory where annotated frame images will be saved.
        process_every_n_frames: Analyze every Nth frame (3 = ~10fps from 30fps video).
        save_frames_at_seconds: Timestamps (in seconds) at which to save images.
                                Defaults to 5 evenly-spaced frames.

    Returns:
        VideoAnalysisResult with all pose, biomechanics, and risk data.
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    duration_seconds = total_frames / fps

    if save_frames_at_seconds is None:
        save_frames_at_seconds = [duration_seconds * i / 4 for i in range(5)]
    save_at_frame_indices = {int(t * fps) for t in save_frames_at_seconds}

    saved_image_paths: List[str] = []
    all_frame_results: List[FrameResult] = []
    all_biomechanics: List[BiomechanicsResult] = []

    frames_with_pose = 0
    frames_processed = 0
    frame_index = 0
    video_stem = Path(video_path).stem

    with PoseEngine() as pose_engine:
        analyzer = BiomechanicalAnalyzer()

        # ── Set up VideoWriter for the skeleton-annotated output video ──
        # OpenCV writes a raw AVI (uncompressed-friendly) as intermediate.
        # After processing, FFmpeg converts it to H.264 MP4 which browsers
        # can play natively. The raw AVI is deleted immediately after.
        first_frame_read = cap.read()
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # rewind back to start
        if first_frame_read[0]:
            fh, fw = first_frame_read[1].shape[:2]
        else:
            fh, fw = 720, 1280  # fallback

        raw_video_path   = os.path.join(output_dir, f"{video_stem}_raw.avi")
        final_video_path = os.path.join(output_dir, f"{video_stem}_skeleton.mp4")
        effective_fps    = fps / process_every_n_frames

        fourcc       = cv2.VideoWriter_fourcc(*"MJPG")  # MJPEG in AVI — reliable on all platforms
        video_writer = cv2.VideoWriter(raw_video_path, fourcc, effective_fps, (fw, fh))

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_index % process_every_n_frames == 0:
                # Step 1: Pose Estimation
                pose_result = pose_engine.process_frame(frame, frame_index=frame_index, fps=fps)
                frames_processed += 1

                if pose_result.pose_detected:
                    frames_with_pose += 1

                    # Step 2: Biomechanical Analysis
                    bio_result = analyzer.analyze(pose_result.joints, frame_index=frame_index)

                    if bio_result:
                        all_biomechanics.append(bio_result)
                        # Annotate the frame with live biomechanics overlay
                        _draw_biomechanics_overlay(pose_result.annotated_frame, bio_result)

                    all_frame_results.append(pose_result)

                    # Write this annotated frame to the skeleton video
                    video_writer.write(pose_result.annotated_frame)

                    # Save key frames as still images
                    if frame_index in save_at_frame_indices or len(saved_image_paths) == 0:
                        img_name = f"{video_stem}_frame_{frame_index:05d}.jpg"
                        img_path = os.path.join(output_dir, img_name)
                        cv2.imwrite(img_path, pose_result.annotated_frame)
                        saved_image_paths.append(img_path)

                else:
                    # No pose detected — write original frame to keep video smooth
                    video_writer.write(frame)

            frame_index += 1

        video_writer.release()
    cap.release()

    # ── FFmpeg: re-encode the raw AVI to browser-compatible H.264 MP4 ──
    # mp4v / MJPEG written by OpenCV cannot play in Chrome/Firefox/Edge.
    # H.264 (libx264) is the universal browser codec.
    annotated_video_path: Optional[str] = None
    if Path(raw_video_path).exists() and Path(raw_video_path).stat().st_size > 0:
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", raw_video_path,
                    "-vcodec", "libx264",
                    "-pix_fmt", "yuv420p",   # required for browser compatibility
                    "-preset", "ultrafast",   # fastest encoding, minimal quality loss
                    "-crf", "28",             # quality (lower = better, 28 is fine for review)
                    "-movflags", "+faststart", # enables streaming before full download
                    final_video_path,
                ],
                check=True,
                capture_output=True,
                timeout=300,  # 5 minutes max
            )
            annotated_video_path = final_video_path
        except Exception:
            pass  # if ffmpeg fails, video just won't show — screenshots still work
        finally:
            # Always delete the raw intermediate AVI
            Path(raw_video_path).unlink(missing_ok=True)

    detection_rate = (frames_with_pose / frames_processed * 100) if frames_processed > 0 else 0.0

    result = VideoAnalysisResult(
        video_path=video_path,
        total_frames=total_frames,
        fps=fps,
        duration_seconds=round(duration_seconds, 2),
        frames_processed=frames_processed,
        frames_with_pose=frames_with_pose,
        pose_detection_rate=round(detection_rate, 1),
        saved_image_paths=saved_image_paths,
        frame_results=all_frame_results,
        biomechanics_results=all_biomechanics,
        annotated_video_path=annotated_video_path,
    )

    # Aggregate biomechanics data across all frames
    _aggregate_biomechanics(result, all_biomechanics)

    return result


def _draw_biomechanics_overlay(frame, bio: BiomechanicsResult) -> None:
    """
    Draw a live biomechanics data panel on the video frame.
    Angles in RED indicate a risk flag is raised.
    """
    import cv2

    h, w = frame.shape[:2]
    panel_x = 10
    y = 40
    line_h = 26
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.6
    thickness = 2

    def put(label: str, value: Optional[float], risk: bool = False):
        nonlocal y
        if value is None:
            return
        color = (0, 0, 255) if risk else (0, 255, 0)   # Red = risk, Green = ok
        text = f"{label}: {value:.1f} deg"
        cv2.putText(frame, text, (panel_x, y), font, scale, (0, 0, 0), thickness + 2)  # Shadow
        cv2.putText(frame, text, (panel_x, y), font, scale, color, thickness)
        y += line_h

    def put_score(label: str, value: Optional[float], risk: bool = False):
        nonlocal y
        if value is None:
            return
        color = (0, 0, 255) if risk else (0, 255, 0)
        text = f"{label}: {value:.2f}"
        cv2.putText(frame, text, (panel_x, y), font, scale, (0, 0, 0), thickness + 2)
        cv2.putText(frame, text, (panel_x, y), font, scale, color, thickness)
        y += line_h

    # Section header
    cv2.putText(frame, "BIOMECHANICS", (panel_x, y - 10), font, 0.65, (255, 255, 0), 2)
    y += 10

    a = bio.angles
    f = bio.risk_flags

    put("L-Knee", a.left_knee,  f.knee_acute_flexion or f.knee_hyperextension)
    put("R-Knee", a.right_knee, f.knee_acute_flexion or f.knee_hyperextension)
    put("L-Hip",  a.left_hip,   f.hip_angle_low)
    put("R-Hip",  a.right_hip,  f.hip_angle_low)
    put("L-Elbow", a.left_elbow,  f.elbow_hyperextension)
    put("R-Elbow", a.right_elbow, f.elbow_hyperextension)
    put("Trunk Lean", bio.trunk_lean_deg, f.trunk_lean_excessive)
    put_score("Symmetry", bio.symmetry.overall, f.low_symmetry)

    # Risk banner
    if f.any_risk:
        cv2.putText(frame, "! RISK DETECTED", (panel_x, y + 5), font, 0.7, (0, 0, 255), 2)


def _aggregate_biomechanics(
    result: VideoAnalysisResult,
    bio_frames: List[BiomechanicsResult],
) -> None:
    """Calculate video-level summary statistics from per-frame biomechanics data."""
    if not bio_frames:
        return

    def avg(vals):
        clean = [v for v in vals if v is not None]
        return round(sum(clean) / len(clean), 2) if clean else None

    def safe_min(vals):
        clean = [v for v in vals if v is not None]
        return round(min(clean), 2) if clean else None

    result.avg_left_knee_angle  = avg(b.angles.left_knee   for b in bio_frames)
    result.avg_right_knee_angle = avg(b.angles.right_knee  for b in bio_frames)
    result.min_left_knee_angle  = safe_min(b.angles.left_knee  for b in bio_frames)
    result.min_right_knee_angle = safe_min(b.angles.right_knee for b in bio_frames)
    result.avg_left_hip_angle   = avg(b.angles.left_hip    for b in bio_frames)
    result.avg_right_hip_angle  = avg(b.angles.right_hip   for b in bio_frames)
    result.avg_left_elbow_angle  = avg(b.angles.left_elbow  for b in bio_frames)
    result.avg_right_elbow_angle = avg(b.angles.right_elbow for b in bio_frames)
    result.avg_knee_symmetry    = avg(b.symmetry.knee      for b in bio_frames)
    result.avg_hip_symmetry     = avg(b.symmetry.hip       for b in bio_frames)
    result.avg_trunk_lean       = avg(b.trunk_lean_deg     for b in bio_frames)
    result.avg_overall_symmetry = avg(b.symmetry.overall   for b in bio_frames)

    result.frames_knee_hyperextension = sum(1 for b in bio_frames if b.risk_flags.knee_hyperextension)
    result.frames_knee_acute_flexion  = sum(1 for b in bio_frames if b.risk_flags.knee_acute_flexion)
    result.frames_excessive_trunk_lean = sum(1 for b in bio_frames if b.risk_flags.trunk_lean_excessive)
    result.frames_low_symmetry        = sum(1 for b in bio_frames if b.risk_flags.low_symmetry)
    result.frames_elbow_hyperextension = sum(1 for b in bio_frames if b.risk_flags.elbow_hyperextension)
