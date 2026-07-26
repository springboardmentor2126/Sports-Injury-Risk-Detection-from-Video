from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.database import engine, Base
from app.api.routes import auth, athletes, video

# Import all models so SQLAlchemy can create their tables
from app.models import user, athlete, video_analysis  # noqa: F401

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

# ─── App Initialization ────────────────────────────────────────
app = FastAPI(
    title="Sports Injury Risk Detection API",
    description="AI-powered platform for detecting sports injury risks from movement videos.",
    version="1.0.0",
)

# ─── CORS Middleware ───────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Static Files (annotated pose images served to frontend) ───
uploads_path = Path("uploads")
uploads_path.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ─── Routers ───────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(athletes.router)
app.include_router(video.router)


# ─── Health Check ──────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Sports Injury Detection API is running 🏃"}
