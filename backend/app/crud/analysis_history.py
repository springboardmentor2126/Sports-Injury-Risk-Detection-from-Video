from sqlalchemy.orm import Session

from app.models.analysis_history import AnalysisHistory
from app.models.video import Video
from app.schemas.analysis_history import AnalysisHistoryCreate


def save_analysis_history(db: Session, payload: AnalysisHistoryCreate) -> AnalysisHistory:
    existing = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.user_id == payload.user_id)
        .filter(AnalysisHistory.video_id == payload.video_id)
        .order_by(AnalysisHistory.created_at.desc())
        .first()
    )

    if existing:
        updated = False
        for field in [
            'risk_score',
            'risk_level',
            'balance_score',
            'stability_score',
            'pose_quality_score',
            'total_issues',
            'total_issues_detected',
            'detected_issues',
            'recommendations',
            'frames_processed',
            'duration',
            'processing_status',
            'analysis_time',
        ]:
            value = getattr(payload, field, None)
            if value is not None and getattr(existing, field, None) != value:
                setattr(existing, field, value)
                updated = True

        if updated:
            db.commit()
            db.refresh(existing)
        return existing

    if payload.video_id:
        db.query(Video).filter(Video.video_id == payload.video_id).first() or db.add(Video(video_id=payload.video_id, filename=payload.video_name))

    entry = AnalysisHistory(
        user_id=payload.user_id,
        video_id=payload.video_id,
        video_name=payload.video_name,
        risk_score=payload.risk_score,
        risk_level=payload.risk_level,
        balance_score=payload.balance_score,
        stability_score=payload.stability_score,
        pose_quality_score=payload.pose_quality_score,
        total_issues=payload.total_issues,
        total_issues_detected=payload.total_issues_detected,
        detected_issues=payload.detected_issues,
        recommendations=payload.recommendations,
        frames_processed=payload.frames_processed,
        duration=payload.duration,
        processing_status=payload.processing_status,
        analysis_time=payload.analysis_time,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_analysis_history_by_user(db: Session, user_id: int) -> list[AnalysisHistory]:
    return (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.user_id == user_id)
        .order_by(AnalysisHistory.created_at.desc(), AnalysisHistory.history_id.desc())
        .all()
    )
