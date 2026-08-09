import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover - optional dependency in test env
    YOLO = None

COCO_KEYPOINT_NAMES = [
    'NOSE',
    'LEFT_EYE',
    'RIGHT_EYE',
    'LEFT_EAR',
    'RIGHT_EAR',
    'LEFT_SHOULDER',
    'RIGHT_SHOULDER',
    'LEFT_ELBOW',
    'RIGHT_ELBOW',
    'LEFT_WRIST',
    'RIGHT_WRIST',
    'LEFT_HIP',
    'RIGHT_HIP',
    'LEFT_KNEE',
    'RIGHT_KNEE',
    'LEFT_ANKLE',
    'RIGHT_ANKLE',
]


def _load_model(model_path: Optional[str] = None):
    if YOLO is None:
        raise RuntimeError('ultralytics is not installed. Install backend requirements to enable pose estimation.')
    if model_path:
        return YOLO(model_path)
    return YOLO('yolov8n-pose.pt')


def _coerce_array(value: Any) -> Optional[np.ndarray]:
    if value is None:
        return None

    if hasattr(value, 'detach'):
        try:
            value = value.detach()
        except Exception:
            pass

    if hasattr(value, 'cpu'):
        try:
            value = value.cpu()
        except Exception:
            pass

    if hasattr(value, 'numpy'):
        try:
            value = value.numpy()
        except Exception:
            pass

    try:
        return np.asarray(value, dtype=float)
    except Exception:
        return None


def _extract_landmarks(result: Any) -> List[Dict[str, Any]]:
    keypoints = getattr(result, 'keypoints', None)
    if keypoints is None:
        return []

    point_arrays = []
    # Prefer normalized coordinates because downstream scoring assumes a 0..1 scale.
    for attribute in ('xyn', 'xy', 'data'):
        candidate = getattr(keypoints, attribute, None)
        point_array = _coerce_array(candidate)
        if point_array is None:
            continue

        if point_array.ndim == 2 and point_array.shape[1] >= 2:
            point_arrays.append(point_array)
        elif point_array.ndim == 3 and point_array.shape[0] == 1:
            point_arrays.append(point_array[0])
        elif point_array.ndim == 1 and point_array.shape[0] >= 2:
            point_arrays.append(point_array.reshape(-1, 2))

    if not point_arrays:
        return []

    points = point_arrays[0]
    if points.ndim == 3 and points.shape[0] == 1:
        points = points[0]

    if points.ndim != 2 or points.shape[1] < 2:
        return []

    confidence_values = None
    confidence = getattr(keypoints, 'conf', None)
    if confidence is not None:
        confidence_values = _coerce_array(confidence)
        if confidence_values is not None:
            if confidence_values.ndim == 3 and confidence_values.shape[0] == 1:
                confidence_values = confidence_values[0]
            if confidence_values.ndim == 2:
                if confidence_values.shape[0] == points.shape[0] and confidence_values.shape[1] == 1:
                    confidence_values = confidence_values[:, 0]
                elif confidence_values.shape[1] == points.shape[0]:
                    confidence_values = confidence_values[0]
                elif confidence_values.size == points.shape[0]:
                    confidence_values = confidence_values.reshape(-1)
            elif confidence_values.ndim == 1 and confidence_values.size != points.shape[0]:
                confidence_values = confidence_values.reshape(-1)

    landmarks: List[Dict[str, Any]] = []
    for idx, point in enumerate(points):
        try:
            x = float(point[0])
            y = float(point[1])
        except Exception:
            continue

        visibility = 1.0
        if confidence_values is not None and idx < len(confidence_values):
            try:
                value = confidence_values[idx]
                if hasattr(value, 'size') and value.size == 1:
                    visibility = float(np.asarray(value).reshape(-1)[0])
                else:
                    visibility = float(value)
            except Exception:
                visibility = 1.0

        landmarks.append({
            'name': COCO_KEYPOINT_NAMES[idx] if idx < len(COCO_KEYPOINT_NAMES) else f'KEYPOINT_{idx + 1}',
            'x': x,
            'y': y,
            'visibility': visibility,
        })

    return landmarks


def run_pose_estimation(input_dir: str, output_json: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Run a lightweight pose-estimation pass over image frames and emit JSON for the API."""
    input_path = Path(input_dir)
    output_path = Path(output_json)

    if not input_path.exists():
        raise FileNotFoundError(f'Input directory does not exist: {input_path}')

    image_files = sorted(input_path.glob('*.jpg')) + sorted(input_path.glob('*.png'))
    if not image_files:
        raise ValueError(f'No image files found in {input_path}')

    model = _load_model(model_path=str(Path(__file__).resolve().parents[1] / 'yolov8n-pose.pt'))

    pose_data: List[Dict[str, Any]] = []
    for image_file in image_files:
        image = cv2.imread(str(image_file))
        if image is None:
            continue

        if hasattr(model, 'predict'):
            results = model.predict(image, imgsz=640, conf=0.25, verbose=False)
        else:
            results = model(image, imgsz=640, conf=0.25, verbose=False)

        frame_landmarks: List[Dict[str, Any]] = []
        for result in results:
            frame_landmarks.extend(_extract_landmarks(result))

        pose_data.append({'image': image_file.name, 'landmarks': frame_landmarks})

    payload = {
        'status': 'completed',
        'pose_data': pose_data,
        'metadata': metadata or {},
    }

    output_path.write_text(json.dumps(payload, indent=2), encoding='utf-8')
    return payload
