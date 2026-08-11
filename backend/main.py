from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from . import models

from .routes import auth
from .routes import video

app = FastAPI(
    title="Sports Injury Detection API",
    version="1.0"
)

# -----------------------------
# CORS
# -----------------------------

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

# -----------------------------
# Database
# -----------------------------

models.Base.metadata.create_all(bind=engine)

# -----------------------------
# Routers
# -----------------------------

app.include_router(auth.router)
app.include_router(video.router)

# -----------------------------
# Home
# -----------------------------

@app.get("/")
def home():

    return {

        "project": "Sports Injury Risk Detection",

        "version": "Milestone 3",

        "status": "Running"

    }


@app.get("/health")
def health():

    return {

        "status": "healthy"

    }