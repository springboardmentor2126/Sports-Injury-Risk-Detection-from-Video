import cv2
import mediapipe as mp

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

MODEL_PATH = "pose_landmarker.task"


def create_landmarker():

    base_options = python.BaseOptions(
        model_asset_path=MODEL_PATH
    )

    options = vision.PoseLandmarkerOptions(

        base_options=base_options,

        running_mode=vision.RunningMode.VIDEO,

        num_poses=1,

        min_pose_detection_confidence=0.5,

        min_pose_presence_confidence=0.5,

        min_tracking_confidence=0.5

    )

    return vision.PoseLandmarker.create_from_options(
        options
    )


def track_pose(video_path: str):

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():

        raise Exception("Cannot open video")

    fps = cap.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        fps = 30

    print(f"Video FPS : {fps}")

    landmarker = create_landmarker()

    landmarks_per_frame = []

    frame_number = 0

    while True:

        success, frame = cap.read()
        
        if not success:
            break

        frame_number += 1

        print("Processing Frame:", frame_number)
        
        # Process every 5th frame
        if frame_number % 5 != 0:
            continue

        rgb = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2RGB
        )

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb
        )

        timestamp_ms = int(
            frame_number * 1000 / fps
        )

        result = landmarker.detect_for_video(

            mp_image,

            timestamp_ms

        )

        if result.pose_landmarks:

            frame_landmarks = []

            pose = result.pose_landmarks[0]

            for landmark in pose:

                frame_landmarks.append({

                    "x": landmark.x,

                    "y": landmark.y,

                    "z": landmark.z,

                    "visibility": landmark.visibility

                })

            landmarks_per_frame.append(
                frame_landmarks
            )

    cap.release()

    landmarker.close()

    print(
        f"Total Frames With Pose : {len(landmarks_per_frame)}"
    )

    return landmarks_per_frame