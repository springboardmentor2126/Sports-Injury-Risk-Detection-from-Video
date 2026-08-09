from __future__ import annotations

import json
import os
import tempfile
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Request, status

from app.services.injury_prediction import predict_injury, predict_injury_from_video

router = APIRouter(tags=['injury-prediction'])


@router.post('/predict-injury')
async def predict_injury_endpoint(request: Request) -> Dict[str, Any]:
    content_type = request.headers.get('content-type', '')

    if content_type.startswith('multipart/form-data'):
        form = await request.form()
        uploaded_video = form.get('video')
        if uploaded_video is None:
            payload = form.get('payload')
            if isinstance(payload, str):
                payload = json.loads(payload)
            if isinstance(payload, dict):
                return predict_injury(payload=payload)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Provide either JSON payload or an uploaded video.')

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as handle:
                temp_path = handle.name
                while True:
                    chunk = await uploaded_video.read(1024 * 1024)
                    if not chunk:
                        break
                    handle.write(chunk)
            return predict_injury_from_video(temp_path, video_id=uploaded_video.filename)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
        finally:
            if temp_path is not None:
                try:
                    os.remove(temp_path)
                except FileNotFoundError:
                    pass

    try:
        payload = await request.json()
    except Exception:
        payload = None

    if isinstance(payload, dict):
        return predict_injury(payload=payload)

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Provide either JSON payload or an uploaded video.')
