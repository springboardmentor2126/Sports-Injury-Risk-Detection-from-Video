from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

# Ensure storage dirs exist
BASE_DIR = os.path.dirname(__file__)
for d in ('uploads', 'extracted_frames', 'pose_results'):
    os.makedirs(os.path.join(BASE_DIR, d), exist_ok=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title='Sports Injury Risk Detection - Backend')

# CORS to allow the frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Import and include routers (deferred to avoid circular imports)
from routes.upload import router as upload_router  # noqa: E402
from routes.pose import router as pose_router  # noqa: E402
from routes.analysis import router as analysis_router  # noqa: E402
from routes.report import router as report_router  # noqa: E402

app.include_router(upload_router, prefix='')
app.include_router(pose_router, prefix='')
app.include_router(analysis_router, prefix='')
app.include_router(report_router, prefix='')

