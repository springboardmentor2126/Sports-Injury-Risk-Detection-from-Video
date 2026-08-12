import cv2
import os

def extract_frames(video_path: str, output_dir: str, frame_interval: int = 5):
    """
    Extracts frames from a video file at a given interval.
    frame_interval=5 means: save 1 out of every 5 frames (reduces processing load).
    """
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")

    frame_count = 0
    saved_frames = []

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_count % frame_interval == 0:
            frame_filename = f"frame_{frame_count}.jpg"
            frame_path = os.path.join(output_dir, frame_filename)
            cv2.imwrite(frame_path, frame)
            saved_frames.append(frame_path)
        frame_count += 1

    cap.release()
    return saved_frames