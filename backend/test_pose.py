from ai.pose_detector import PoseDetector
from ai.report_generator import ReportGenerator

detector = PoseDetector()

result = detector.process_video(
    "uploads/sample.mp4",
    "processed/output.mp4"
)

report = ReportGenerator.save_report(result)

print("\n==============================")
print("Processing Completed")
print("==============================")

print("Frames :", result["frames_processed"])
print("Video  :", result["output_video"])
print("Report :", report)