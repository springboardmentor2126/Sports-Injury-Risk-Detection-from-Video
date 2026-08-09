"""
MediaPipe's newer versions (0.10.30+, needed for Python 3.13/3.14 support)
require a separately downloaded model file for pose detection — this is
standard MediaPipe practice, not a hack. Downloads once, caches locally.
"""

import os
import urllib.request

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models_data")
MODEL_PATH = os.path.join(MODEL_DIR, "pose_landmarker_lite.task")

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
)


def ensure_model_downloaded() -> str:
    os.makedirs(MODEL_DIR, exist_ok=True)

    if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 0:
        return MODEL_PATH

    try:
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    except Exception as e:
        if os.path.exists(MODEL_PATH):
            os.remove(MODEL_PATH)
        raise RuntimeError(
            "Could not download the pose detection model. This requires an "
            "internet connection the first time you process a video. "
            f"Original error: {e}"
        )

    return MODEL_PATH
