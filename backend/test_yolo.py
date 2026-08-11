from ultralytics import YOLO

print("Loading YOLO Pose model...")

model = YOLO("yolo11n-pose.pt")

print("✅ YOLO Pose Loaded Successfully!")