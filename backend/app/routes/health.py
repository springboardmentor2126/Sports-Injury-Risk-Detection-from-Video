from fastapi import APIRouter

router = APIRouter(tags=['health'])


@router.get('/')
def root():
    return {
        'message': 'Sports Injury Risk Detection API is running',
        'status': 'ok',
    }


@router.get('/health')
def health_check():
    return {
        'status': 'healthy',
    }
