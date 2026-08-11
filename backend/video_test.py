import cv2

video_path = "uploads/sample.mp4"

cap = cv2.VideoCapture(video_path)

print("Video Path:", video_path)
print("Video Opened:", cap.isOpened())

if cap.isOpened():
    ret, frame = cap.read()
    print("First Frame Read:", ret)

    if ret:
        print("Frame Shape:", frame.shape)

cap.release()