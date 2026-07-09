from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import engine
from .routers import auth, athletes

# Creates injury_risk.db and all tables on first run.
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sports Injury Risk Detection Platform API",
    description="Milestone 1: Authentication, Role-Based Access & Athlete Profile Management",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(athletes.router)


@app.get("/")
def root():
    return {
        "message": "Sports Injury Risk Detection Platform API is running",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
