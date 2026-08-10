"""
download_pose_model.py — fetches the MediaPipe Pose Landmarker model.

mediapipe's Tasks API (the current API for pose detection -- see
backend/app/services/pose_estimation.py) needs a .task model file. It
is NOT bundled with `pip install mediapipe`; you download it once and
point the code at it.

Run this once from the project root:

    python models/download_pose_model.py

Downloads pose_landmarker_lite.task (~5-9MB) -- accurate enough for
Milestone 2 testing and fast on CPU. If you later need better accuracy
for real biomechanics work, swap to the "full" or "heavy" variant (see
--variant below); they're slower but more precise.
"""

import argparse
import urllib.request
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parent

# Official MediaPipe-hosted models. Source:
# https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
VARIANT_URLS = {
    "lite": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
    "full": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
    "heavy": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
}


def download(variant: str = "lite"):
    url = VARIANT_URLS[variant]
    dest = MODELS_DIR / f"pose_landmarker_{variant}.task"

    if dest.exists():
        print(f"Already downloaded: {dest}")
        return dest

    print(f"Downloading {variant} model from {url}")

    def _progress(block_num, block_size, total_size):
        if total_size <= 0:
            return
        pct = min(block_num * block_size * 100 / total_size, 100)
        print(f"\r  {pct:5.1f}%", end="", flush=True)

    urllib.request.urlretrieve(url, dest, _progress)
    print(f"\nSaved to {dest}")
    return dest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--variant",
        choices=list(VARIANT_URLS),
        default="lite",
        help="Model size/accuracy tradeoff. Default: lite (fast, good enough for dev).",
    )
    args = parser.parse_args()
    download(args.variant)
