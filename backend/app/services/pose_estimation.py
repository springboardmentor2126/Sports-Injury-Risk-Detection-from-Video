import cv2
import mediapipe as mp
import math
from ..ml.predict import predict_injury
from ..ml.movement import evaluate_movement_quality
from ..ml.anomalies import detect_anomalies
from ..ml.recommendations import generate_recommendations

mp_pose = mp.solutions.pose

pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)


def calculate_angle(a, b, c):
    """
    Calculate the angle ABC in degrees.
    """

    a = [a.x, a.y]
    b = [b.x, b.y]
    c = [c.x, c.y]

    angle = math.degrees(
        math.atan2(c[1] - b[1], c[0] - b[0]) -
        math.atan2(a[1] - b[1], a[0] - b[0])
    )

    angle = abs(angle)

    if angle > 180:
        angle = 360 - angle

    return round(angle, 2)


def process_video(video_path):

    cap = cv2.VideoCapture(video_path)

    total_frames = 0
    pose_frames = 0

    left_knees = []
    right_knees = []

    left_hips = []
    right_hips = []

    left_shoulders = []
    right_shoulders = []

    left_elbows = []
    right_elbows = []

    symmetry_scores = []

    while cap.isOpened():

        success, frame = cap.read()

        if not success:
            break

        total_frames += 1

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        results = pose.process(rgb)

        if not results.pose_landmarks:
            continue

        pose_frames += 1

        lm = results.pose_landmarks.landmark

        # -----------------------------
        # LEFT LANDMARKS
        # -----------------------------

        left_shoulder = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
        left_elbow = lm[mp_pose.PoseLandmark.LEFT_ELBOW]
        left_wrist = lm[mp_pose.PoseLandmark.LEFT_WRIST]

        left_hip = lm[mp_pose.PoseLandmark.LEFT_HIP]
        left_knee = lm[mp_pose.PoseLandmark.LEFT_KNEE]
        left_ankle = lm[mp_pose.PoseLandmark.LEFT_ANKLE]

        # -----------------------------
        # RIGHT LANDMARKS
        # -----------------------------

        right_shoulder = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]
        right_elbow = lm[mp_pose.PoseLandmark.RIGHT_ELBOW]
        right_wrist = lm[mp_pose.PoseLandmark.RIGHT_WRIST]

        right_hip = lm[mp_pose.PoseLandmark.RIGHT_HIP]
        right_knee = lm[mp_pose.PoseLandmark.RIGHT_KNEE]
        right_ankle = lm[mp_pose.PoseLandmark.RIGHT_ANKLE]

        # -----------------------------
        # Knee Angles
        # -----------------------------

        left_knee_angle = calculate_angle(
            left_hip,
            left_knee,
            left_ankle
        )

        right_knee_angle = calculate_angle(
            right_hip,
            right_knee,
            right_ankle
        )

        left_knees.append(left_knee_angle)
        right_knees.append(right_knee_angle)

        # -----------------------------
        # Hip Angles
        # -----------------------------

        left_hip_angle = calculate_angle(
            left_shoulder,
            left_hip,
            left_knee
        )

        right_hip_angle = calculate_angle(
            right_shoulder,
            right_hip,
            right_knee
        )

        left_hips.append(left_hip_angle)
        right_hips.append(right_hip_angle)

        # -----------------------------
        # Elbow Angles
        # -----------------------------

        left_elbow_angle = calculate_angle(
            left_shoulder,
            left_elbow,
            left_wrist
        )

        right_elbow_angle = calculate_angle(
            right_shoulder,
            right_elbow,
            right_wrist
        )

        left_elbows.append(left_elbow_angle)
        right_elbows.append(right_elbow_angle)

        # -----------------------------
        # Shoulder Angles
        # -----------------------------

        left_shoulder_angle = calculate_angle(
            left_elbow,
            left_shoulder,
            left_hip
        )

        right_shoulder_angle = calculate_angle(
            right_elbow,
            right_shoulder,
            right_hip
        )

        left_shoulders.append(left_shoulder_angle)
        right_shoulders.append(right_shoulder_angle)

        # -----------------------------
        # Symmetry Score
        # -----------------------------

        difference = abs(left_knee_angle - right_knee_angle)

        symmetry = max(0, 100 - difference)

        symmetry_scores.append(symmetry)

    cap.release()

    # -----------------------------------------
    # No pose detected
    # -----------------------------------------

    if pose_frames == 0:

        return {

            "frames_processed": total_frames,
            "pose_detected_frames": 0,

            "left_knee_angle": 0,
            "right_knee_angle": 0,

            "left_hip_angle": 0,
            "right_hip_angle": 0,

            "left_shoulder_angle": 0,
            "right_shoulder_angle": 0,

            "left_elbow_angle": 0,
            "right_elbow_angle": 0,

            "posture_symmetry": 0,

            "movement_quality": "Poor",

            "injury_risk": "Unknown",

            "recommendation": "No human pose detected in the uploaded video."
        }

    # -----------------------------------------
    # Average Angles
    # -----------------------------------------

    left_knee_avg = round(sum(left_knees) / len(left_knees), 2)
    right_knee_avg = round(sum(right_knees) / len(right_knees), 2)

    left_hip_avg = round(sum(left_hips) / len(left_hips), 2)
    right_hip_avg = round(sum(right_hips) / len(right_hips), 2)

    left_shoulder_avg = round(sum(left_shoulders) / len(left_shoulders), 2)
    right_shoulder_avg = round(sum(right_shoulders) / len(right_shoulders), 2)

    left_elbow_avg = round(sum(left_elbows) / len(left_elbows), 2)
    right_elbow_avg = round(sum(right_elbows) / len(right_elbows), 2)

    symmetry_avg = round(sum(symmetry_scores) / len(symmetry_scores), 2)

    # -----------------------------------------
    # Movement Quality
    # -----------------------------------------

    movement_quality, movement_description = evaluate_movement_quality({

    "left_knee_angle": left_knee_avg,
    "right_knee_angle": right_knee_avg,

    "left_hip_angle": left_hip_avg,
    "right_hip_angle": right_hip_avg,

    "left_shoulder_angle": left_shoulder_avg,
    "right_shoulder_angle": right_shoulder_avg,

    "left_elbow_angle": left_elbow_avg,
    "right_elbow_angle": right_elbow_avg,

    "posture_symmetry": symmetry_avg

})

    # -----------------------------------------
    # Prepare Analysis
    # -----------------------------------------

    analysis = {

        "frames_processed": total_frames,

        "pose_detected_frames": pose_frames,

        "left_knee_angle": left_knee_avg,
        "right_knee_angle": right_knee_avg,

        "left_hip_angle": left_hip_avg,
        "right_hip_angle": right_hip_avg,

        "left_shoulder_angle": left_shoulder_avg,
        "right_shoulder_angle": right_shoulder_avg,

        "left_elbow_angle": left_elbow_avg,
        "right_elbow_angle": right_elbow_avg,

        "posture_symmetry": symmetry_avg,

        "movement_quality": movement_quality
    }

    # -----------------------------------------
    # AI Injury Analysis
    # -----------------------------------------

      # -----------------------------------------
    # AI Injury Analysis
    # -----------------------------------------

    features = {

        "left_knee": left_knee_avg,
        "right_knee": right_knee_avg,

        "left_hip": left_hip_avg,
        "right_hip": right_hip_avg,

        "left_shoulder": left_shoulder_avg,
        "right_shoulder": right_shoulder_avg,

        "left_elbow": left_elbow_avg,
        "right_elbow": right_elbow_avg,

        "symmetry": symmetry_avg,

        "movement": {
            "Poor": 0,
            "Fair": 1,
            "Good": 2,
            "Excellent": 3
        }[movement_quality],

        "age": 22,
        "experience": 2,
        "previous_injuries": 0

    }

    prediction = predict_injury(features)

    anomalies = detect_anomalies(analysis)

    recommendations = generate_recommendations(
        analysis,
        anomalies
    )

    analysis["movement_quality"] = movement_quality

    analysis["movement_quality_description"] = movement_description

    analysis["injury_risk"] = prediction["injury_risk"]

    analysis["movement_anomalies"] = anomalies

    analysis["recommendation"] = " ".join(recommendations)

    return analysis