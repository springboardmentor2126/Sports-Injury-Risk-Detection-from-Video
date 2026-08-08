from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
 
from database.database import engine, SessionLocal
from database import models
from routers import auth, athlete, upload, analysis, report, access_request, admin
 
app = FastAPI(title="Sports Injury Risk Detection API")
 
# Creates any tables that don't exist yet (e.g. the new "users" table).
# NOTE: create_all does NOT add columns to tables that already exist - see
# the migration note in the summary for the new AnalysisResult.biomechanics
# column if your analysis_results table was created before this change.
models.Base.metadata.create_all(bind=engine)
 
 
@app.on_event("startup")
def reconcile_orphaned_processing_rows():
    """
    Background tasks (FastAPI's BackgroundTasks) run in-process and do NOT
    survive a server restart - if the server crashed, redeployed, or even
    just got a dev --reload trigger while a video was mid-processing, that
    row is stuck at status="processing" forever with nothing ever marking
    it done or failed, since the task that would have updated it is gone.
 
    On every startup, mark any such orphaned rows as "failed" with a clear
    message, so the frontend shows something actionable instead of an
    infinite spinner, and the user knows to just re-upload.
    """
    db: Session = SessionLocal()
    try:
        orphaned = (
            db.query(models.AnalysisResult)
            .filter(models.AnalysisResult.status == "processing")
            .all()
        )
        for row in orphaned:
            row.status = "failed"
            row.error_message = (
                "Processing was interrupted by a server restart before it "
                "could finish. Please re-upload this video."
            )
        if orphaned:
            db.commit()
    finally:
        db.close()
 
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
app.include_router(auth.router)
app.include_router(athlete.router)
app.include_router(upload.router)
app.include_router(analysis.router)
app.include_router(report.router)
app.include_router(access_request.router)
app.include_router(admin.router)
 
 
@app.get("/")
async def root():
    return {"message": "Sports Injury Risk Detection API"}
 
 
if __name__ == "__main__":
    import uvicorn
 
    uvicorn.run(app, host="127.0.0.1", port=8000)
 