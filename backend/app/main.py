from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import auth
from .routes import video
from .database import engine
from . import models

app = FastAPI(
    title="Sports Injury Detection API"
)

# Allow requests from React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Register API routes
app.include_router(auth.router)
app.include_router(video.router)


@app.get("/")
def home():
    return {
        "project": "Sports Injury Risk Detection",
        "status": "Backend is running successfully!"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }