from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.health import router as health_router
from app.routes.profile import router as profile_router
from app.routes.videos import router as videos_router
from app.routes.pose import router as pose_router
from app.routes.injury_prediction import router as injury_prediction_router
from app.routes.analysis_history import router as analysis_history_router
from app.database.database import create_tables

app = FastAPI(
    title='Sports Injury Risk Detection API',
    version='0.1.0',
    description='Starter FastAPI application for the sports injury risk detection project.',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(health_router)
app.include_router(auth_router, prefix='/api/v1')
app.include_router(profile_router, prefix='/api/v1')
app.include_router(videos_router, prefix='/api/v1')
app.include_router(pose_router)
app.include_router(injury_prediction_router)
app.include_router(analysis_history_router)


@app.on_event('startup')
def on_startup() -> None:
    create_tables()
