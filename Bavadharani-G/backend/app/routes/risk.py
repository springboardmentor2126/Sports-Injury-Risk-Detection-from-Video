"""
Injury risk prediction endpoints (Milestone 3).

  POST /videos/{id}/risk-assessment  -> runs the risk engine on an
                                          already-processed video's report
  GET  /videos/{id}/risk-assessment  -> fetch a previously computed assessment
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.video import Video
from app.models.report import BiomechanicsReport
from app.models.risk import InjuryRiskAssessment
from app.schemas.risk import InjuryRiskAssessmentOut
from app.utils.dependencies import get_current_user
from app.services.risk_engine import compute_injury_risks

router = APIRouter(prefix="/videos", tags=["Injury Risk Prediction"])


@router.post("/{video_id}/risk-assessment", response_model=InjuryRiskAssessmentOut)
def create_risk_assessment(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.athlete_user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    report = db.query(BiomechanicsReport).filter(BiomechanicsReport.video_id == video_id).first()
    if not report:
        raise HTTPException(status_code=422, detail="This video hasn't been analyzed yet — run POST /videos/{id}/process first.")

    report_dict = {
        "avg_left_knee_angle": report.avg_left_knee_angle,
        "avg_right_knee_angle": report.avg_right_knee_angle,
        "knee_angle_asymmetry": report.knee_angle_asymmetry,
        "avg_trunk_lean_angle": report.avg_trunk_lean_angle,
        "detection_rate": report.detection_rate,
    }
    result = compute_injury_risks(report_dict)

    existing = db.query(InjuryRiskAssessment).filter(InjuryRiskAssessment.video_id == video_id).first()
    if existing:
        for field, value in result.items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    assessment = InjuryRiskAssessment(video_id=video_id, **result)
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/{video_id}/risk-assessment", response_model=InjuryRiskAssessmentOut)
def get_risk_assessment(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.athlete_user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    assessment = db.query(InjuryRiskAssessment).filter(InjuryRiskAssessment.video_id == video_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="No risk assessment yet — run POST /videos/{id}/risk-assessment first.")
    return assessment
