import cv2
import mediapipe as mp
import os


# MediaPipe Tasks API
BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode


def process_video(input_path: str, output_path: str):

    """
    Process video using MediaPipe Pose Landmarker
    and save skeleton detected video.
    """

    cap = cv2.VideoCapture(input_path)

    if not cap.isOpened():
        raise Exception("Cannot open video")


    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)


    os.makedirs(
        os.path.dirname(output_path),
        exist_ok=True
    )


    fourcc = cv2.VideoWriter_fourcc(*"mp4v")

    out = cv2.VideoWriter(
        output_path,
        fourcc,
        fps,
        (width, height)
    )


    # Create pose model
    options = PoseLandmarkerOptions(
        base_options=BaseOptions(
            model_asset_path="pose_landmarker.task"
        ),
        running_mode=VisionRunningMode.VIDEO,
        num_poses=1
    )


    with PoseLandmarker.create_from_options(options) as landmarker:

        frame_timestamp = 0


        while True:

            success, frame = cap.read()

            if not success:
                break


            rgb_frame = cv2.cvtColor(
                frame,
                cv2.COLOR_BGR2RGB
            )


            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb_frame
            )


            result = landmarker.detect_for_video(
                mp_image,
                frame_timestamp
            )


            # Draw landmarks
            if result.pose_landmarks:

                for landmarks in result.pose_landmarks:

                    for landmark in landmarks:

                        x = int(
                            landmark.x * width
                        )

                        y = int(
                            landmark.y * height
                        )


                        cv2.circle(
                            frame,
                            (x, y),
                            3,
                            (0,255,0),
                            -1
                        )


            out.write(frame)

            frame_timestamp += int(
                1000 / fps
            )


    cap.release()
    out.release()


    return output_path