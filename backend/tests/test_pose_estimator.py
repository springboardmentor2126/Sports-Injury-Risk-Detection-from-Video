import sys
from pathlib import Path

import cv2
import numpy as np
from ultralytics.engine.results import Keypoints

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services import pose_estimator


class DummyResult:
    def __init__(self):
        data = np.array(
            [
                [[10.0, 20.0, 0.95], [0.0, 0.0, 0.0]] + [[0.0, 0.0, 0.0] for _ in range(15)]
            ],
            dtype=float,
        )
        self.keypoints = Keypoints(data, orig_shape=(64, 64))


class DummyModel:
    def predict(self, source, imgsz=640, conf=0.25, verbose=False):
        return [DummyResult()]


def test_run_pose_estimation_accepts_numpy_keypoint_arrays(tmp_path, monkeypatch):
    image_path = tmp_path / 'frame.jpg'
    cv2.imwrite(str(image_path), np.zeros((64, 64, 3), dtype=np.uint8))

    monkeypatch.setattr(pose_estimator, 'YOLO', lambda *args, **kwargs: DummyModel())

    out_json = tmp_path / 'out.json'
    result = pose_estimator.run_pose_estimation(str(tmp_path), str(out_json))

    assert result['pose_data'][0]['landmarks'][0]['name'] == 'NOSE'
    assert result['pose_data'][0]['landmarks'][0]['visibility'] == 0.95
    assert 0.0 <= result['pose_data'][0]['landmarks'][0]['x'] <= 1.0
    assert 0.0 <= result['pose_data'][0]['landmarks'][0]['y'] <= 1.0
