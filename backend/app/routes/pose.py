import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.services.pose_service import _has_uploaded_video, get_pose_result as get_pose_result_payload

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/api/v1')


@router.get('/pose-result/{video_id}')
def get_pose_result(video_id: str):
    logger.info(f'GET /api/v1/pose-result/{video_id} received')
    if not _has_uploaded_video(video_id):
        logger.warning(f'[DEBUG] Video not found for id: {video_id}')
        raise HTTPException(status_code=404, detail='Video not found or invalid video_id')

    logger.info(f'[DEBUG] Video found for {video_id}, loading pose result')
    try:
        result = get_pose_result_payload(video_id)
        logger.info(f'[DEBUG] Pose result loaded for {video_id}: status={result.get("status")}, frames_processed={result.get("frames_processed")}')
    except Exception as e:
        logger.error(f'[DEBUG] Error loading pose result for {video_id}: {e}', exc_info=True)
        raise
    
    if result.get('status') == 'pending':
        logger.info(f'[DEBUG] Returning pending response for video_id: {video_id}')
        return JSONResponse({'status': 'pending', 'video_id': video_id})

    logger.info(f'[DEBUG] Returning completed response for video_id: {video_id} with {result.get("frames_processed")} frames')
    return JSONResponse(result)
