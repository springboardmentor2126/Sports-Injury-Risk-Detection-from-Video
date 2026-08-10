from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from . import models
from .routers import athlete, video
from .routers.auth_router import router as auth_router

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Sports Injury Risk Detection API")

# Allows the Vite dev server (localhost:5173) to actually call this API.
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

app.include_router(auth_router)
app.include_router(athlete.router)
app.include_router(video.router)


@app.get("/")
def root():
    return {"message": "AI Sports Injury Risk Detection Backend Running"}

