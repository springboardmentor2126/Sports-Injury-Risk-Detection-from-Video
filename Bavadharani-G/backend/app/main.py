from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routes import auth, athlete, video, risk, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sports Injury Risk Detection API",
    description=(
        "Milestone 1: Auth + Athlete Profiles | "
        "Milestone 2: Pose Estimation & Biomechanics | "
        "Milestone 3: Injury Risk Prediction | "
        "Milestone 4: Dashboard & Analytics"
    ),
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(athlete.router)
app.include_router(video.router)
app.include_router(risk.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"message": "Sports Injury Risk Detection API is running"}
