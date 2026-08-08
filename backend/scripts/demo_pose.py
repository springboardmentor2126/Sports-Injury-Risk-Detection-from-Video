"""
demo_pose.py — Local Mentor Demo Script

This script is for LOCAL TESTING ONLY. It is NOT deployed to the server.
It lives in scripts/ and simulates what the web app does when a user uploads a video.

Run it from the backend/ directory with your virtualenv activated:
    python scripts/demo_pose.py

What it does:
1. Opens a Windows file picker to select a video from your gallery
2. Calls service.process_video() — the SAME function the FastAPI endpoint uses
3. Plays the video in a window with real-time skeleton tracking overlaid
4. Saves 5 annotated frame images to backend/test_outputs/ for your mentor to view
"""

import sys
import os
import cv2

# Add the backend root to the Python path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from tkinter import Tk, filedialog
from pathlib import Path
from app.ml.pose_estimation.service import process_video
from app.ml.pose_estimation.engine import PoseEngine


def pick_video_file() -> str:
    """Open a Windows file picker and return the selected video path."""
    root = Tk()
    root.withdraw()  # Hide the main tkinter window
    root.lift()
    root.attributes("-topmost", True)

    file_path = filedialog.askopenfilename(
        title="Select a sports video for pose estimation",
        filetypes=[
            ("Video files", "*.mp4 *.mov *.avi *.mkv *.webm"),
            ("All files", "*.*"),
        ],
    )
    root.destroy()
    return file_path


def play_with_tracking(video_path: str) -> None:
    """
    Play the video in an OpenCV window with real-time skeleton tracking.
    Press 'Q' at any time to quit.
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    delay_ms = max(1, int(1000 / fps))
    frame_index = 0

    print("\n[>] Playing video with skeleton tracking. Press Q to quit.\n")

    with PoseEngine() as engine:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            result = engine.process_frame(frame, frame_index=frame_index, fps=fps)
            status = "✅ Pose detected" if result.pose_detected else "❌ No pose"

            # Overlay status text on the video frame
            cv2.putText(
                result.annotated_frame,
                f"Frame {frame_index} | {status}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0) if result.pose_detected else (0, 0, 255),
                2,
            )

            cv2.imshow("SportGuard — Pose Estimation Demo (Q to quit)", result.annotated_frame)
            frame_index += 1

            if cv2.waitKey(delay_ms) & 0xFF == ord("q"):
                break

    cap.release()
    cv2.destroyAllWindows()


def main():
    print("=" * 60)
    print("  SportGuard - Pose Estimation Mentor Demo")
    print("=" * 60)

    # Step 1: Let user pick a video
    print("\n[>] Opening file picker... select a sports video.")
    video_path = pick_video_file()

    if not video_path:
        print("[!] No video selected. Exiting.")
        return

    print(f"\n[OK] Selected: {video_path}")

    # Step 2: Save annotated frames (same call as the FastAPI endpoint makes)
    output_dir = os.path.join(os.path.dirname(__file__), "..", "test_outputs")
    output_dir = os.path.abspath(output_dir)

    print(f"\n[~] Processing video and saving annotated frames to:\n   {output_dir}\n")

    result = process_video(
        video_path=video_path,
        output_dir=output_dir,
    )

    # Step 3: Print the full summary report
    print("\n" + "=" * 60)
    print("  POSE ANALYSIS SUMMARY")
    print("=" * 60)
    print(f"  Duration:            {result.duration_seconds:.1f} seconds")
    print(f"  Total frames:        {result.total_frames}")
    print(f"  Frames analyzed:     {result.frames_processed}")
    print(f"  Frames with pose:    {result.frames_with_pose}")
    print(f"  Detection rate:      {result.pose_detection_rate}%")
    print(f"  Saved images:        {len(result.saved_image_paths)}")
    print("\n  Annotated frame images saved:")
    for path in result.saved_image_paths:
        print(f"     -> {path}")

    print("\n" + "=" * 60)
    print("  BIOMECHANICAL ANALYSIS REPORT")
    print("=" * 60)

    def show(label, val, unit="deg"):
        if val is not None:
            print(f"  {label:<35} {val:.1f} {unit}")
        else:
            print(f"  {label:<35} N/A")

    show("Avg Left Knee Angle:",    result.avg_left_knee_angle)
    show("Avg Right Knee Angle:",   result.avg_right_knee_angle)
    show("Min Left Knee (worst):",  result.min_left_knee_angle)
    show("Min Right Knee (worst):", result.min_right_knee_angle)
    show("Avg Left Hip Angle:",     result.avg_left_hip_angle)
    show("Avg Right Hip Angle:",    result.avg_right_hip_angle)
    show("Avg Left Elbow Angle:",   result.avg_left_elbow_angle)
    show("Avg Right Elbow Angle:",  result.avg_right_elbow_angle)
    show("Avg Trunk Lean:",         result.avg_trunk_lean)
    show("Avg Knee Symmetry:",      result.avg_knee_symmetry, unit="(1.0=perfect)")
    show("Avg Overall Symmetry:",   result.avg_overall_symmetry, unit="(1.0=perfect)")

    print("\n  Risk Flag Summary:")
    print(f"     Knee Hyperextension frames:  {result.frames_knee_hyperextension}")
    print(f"     Knee Acute Flexion frames:   {result.frames_knee_acute_flexion}")
    print(f"     Excessive Trunk Lean frames: {result.frames_excessive_trunk_lean}")
    print(f"     Low Symmetry frames:         {result.frames_low_symmetry}")
    print(f"     Elbow Hyperextension frames: {result.frames_elbow_hyperextension}")
    print("=" * 60)

    # Step 4: Play the video with live skeleton + biomechanics overlay
    play_with_tracking(video_path)

    print("\n[DONE] Demo complete! Check the test_outputs/ folder for your saved images.")


if __name__ == "__main__":
    main()
