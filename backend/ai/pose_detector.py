from ultralytics import YOLO
from ai.angle_calculator import AngleCalculator
from ai.injury_detector import InjuryDetector
from ai.risk_engine import RiskEngine
from ai.prediction_engine import PredictionEngine
from ai.recommendation import RecommendationEngine

import cv2
import os


class PoseDetector:

    def __init__(self):
        print("Loading YOLO Pose Model...")
        self.model = YOLO("yolo11n-pose.pt")
        print("✅ Model Loaded Successfully!")

    def process_video(self, input_path, output_path):

        if not os.path.exists(input_path):
            return {"success": False, "message": f"Video not found: {input_path}"}

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        cap = cv2.VideoCapture(input_path)

        if not cap.isOpened():
            return {"success": False, "message": "Unable to open video."}

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        total_frames = 0
        analysis = []

        print("\nProcessing Video...\n")

        while True:

            ret, frame = cap.read()
            if not ret:
                break

            results = self.model(frame, verbose=False)
            annotated = results[0].plot()
            out.write(annotated)

            frame_info = {"frame": total_frames, "people": []}

            if results[0].keypoints is None:
                analysis.append(frame_info)
                total_frames += 1
                continue

            persons = results[0].keypoints.xy.cpu().numpy()

            for person_id, person in enumerate(persons):

                if len(person) < 17:
                    continue

                left_shoulder = person[5]
                right_shoulder = person[6]
                left_elbow = person[7]
                right_elbow = person[8]
                left_wrist = person[9]
                right_wrist = person[10]
                left_hip = person[11]
                right_hip = person[12]
                left_knee = person[13]
                right_knee = person[14]
                left_ankle = person[15]
                right_ankle = person[16]

                left_knee_angle = AngleCalculator.calculate_angle(left_hip, left_knee, left_ankle)
                right_knee_angle = AngleCalculator.calculate_angle(right_hip, right_knee, right_ankle)
                left_elbow_angle = AngleCalculator.calculate_angle(left_shoulder, left_elbow, left_wrist)
                right_elbow_angle = AngleCalculator.calculate_angle(right_shoulder, right_elbow, right_wrist)

                injury = InjuryDetector.detect(
                    left_knee_angle,
                    right_knee_angle,
                    left_elbow_angle,
                    right_elbow_angle
                )

                risk = RiskEngine.calculate(injury)
                predictions = PredictionEngine.predict(injury["warnings"])
                recommendations = RecommendationEngine.recommend(risk["risk_level"])

                print(f"\nPerson {person_id + 1}")
                print("Left Knee :", left_knee_angle)
                print("Right Knee:", right_knee_angle)
                print("Left Elbow:", left_elbow_angle)
                print("Right Elbow:", right_elbow_angle)
                print("Risk Score :", risk["risk_score"])
                print("Risk Level :", risk["risk_level"])

                frame_info["people"].append({
                    "person_id": person_id + 1,
                    "left_knee_angle": left_knee_angle,
                    "right_knee_angle": right_knee_angle,
                    "left_elbow_angle": left_elbow_angle,
                    "right_elbow_angle": right_elbow_angle,
                    "risk_score": risk["risk_score"],
                    "risk_level": risk["risk_level"],
                    "predicted_injuries": predictions,
                    "recommendations": recommendations,
                    "warnings": injury["warnings"]
                })

            analysis.append(frame_info)
            total_frames += 1

        cap.release()
        out.release()

        return {
            "success": True,
            "frames_processed": total_frames,
            "output_video": output_path,
            "analysis": analysis
        }