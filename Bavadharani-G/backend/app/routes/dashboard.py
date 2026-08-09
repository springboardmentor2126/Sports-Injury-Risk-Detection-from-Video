"""
Athlete dashboard endpoint (Milestone 4) — aggregates across all of the
logged-in athlete's videos: how many analyzed, average movement quality,
average injury risk, and a risk trend over time (for a simple chart).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.video import Video
from app.models.report import BiomechanicsReport
from app.models.risk import InjuryRiskAssessment
from app.schemas.risk import AthleteDashboardOut
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])


@router.get("/me", response_model=AthleteDashboardOut)
def get_my_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    videos = (
        db.query(Video)
        .filter(Video.athlete_user_id == current_user.id)
        .order_by(Video.uploaded_at.asc())
        .all()
    )
    total_videos = len(videos)
    video_ids = [v.id for v in videos if v.status == "completed"]
    videos_analyzed = len(video_ids)

    reports = (
        db.query(BiomechanicsReport)
        .filter(BiomechanicsReport.video_id.in_(video_ids))
        .all()
        if video_ids else []
    )
    quality_scores = [r.movement_quality_score for r in reports if r.movement_quality_score is not None]
    avg_quality = round(sum(quality_scores) / len(quality_scores), 1) if quality_scores else None

    # Risk trend: assessments in the same order as videos were uploaded
    assessments = (
        db.query(InjuryRiskAssessment)
        .filter(InjuryRiskAssessment.video_id.in_(video_ids))
        .all()
        if video_ids else []
    )
    assessments_by_video = {a.video_id: a for a in assessments}
    risk_trend = [
        assessments_by_video[vid].overall_risk_score
        for vid in video_ids
        if vid in assessments_by_video
    ]

    avg_risk = round(sum(risk_trend) / len(risk_trend), 1) if risk_trend else None
    latest_category = assessments_by_video[video_ids[-1]].risk_category if video_ids and video_ids[-1] in assessments_by_video else None

    return AthleteDashboardOut(
        total_videos=total_videos,
        videos_analyzed=videos_analyzed,
        avg_movement_quality_score=avg_quality,
        avg_overall_risk_score=avg_risk,
        latest_risk_category=latest_category,
        risk_trend=risk_trend,
    )
