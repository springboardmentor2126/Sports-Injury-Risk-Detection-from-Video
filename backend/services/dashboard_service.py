"""
Athlete Intelligence Dashboard - trend data.
 
Distinct from anomaly_detection_service.py: that module compares ONE new
session against a rolling baseline to flag deviations. This module builds
the full session-by-session HISTORY for an athlete - risk score and
movement quality over time - so a coach/physio can see whether an athlete
is trending better or worse across every video that's ever been analyzed
for them, not just the most recent one.
"""
import json
 
 
def _safe_load(raw):
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {}
 
 
def build_athlete_trend(analyses):
    """
    analyses: list of AnalysisResult ORM rows for one athlete, OLDEST FIRST
    (as returned by crud.get_all_completed_analyses_for_athlete).
    """
    sessions = []
    for a in analyses:
        risk = _safe_load(a.overall_risk_score)
        quality = _safe_load(a.movement_quality)
        sessions.append({
            "analysis_id": str(a.id),
            "date": a.created_at.isoformat() if a.created_at else None,
            "filename": a.video.original_filename if a.video else None,
            "overall_score": risk.get("overall_score"),
            "risk_level": risk.get("risk_level"),
            "movement_score": quality.get("movement_score"),
            "grade": quality.get("grade"),
        })
 
    if len(sessions) < 2:
        return {
            "session_count": len(sessions),
            "sessions": sessions,
            "trend": {
                "status": "insufficient_data",
                "message": "Need at least 2 completed sessions to show a trend for this athlete.",
            },
        }
 
    first_score = sessions[0]["overall_score"]
    latest_score = sessions[-1]["overall_score"]
 
    if first_score is None or latest_score is None:
        trend = {
            "status": "insufficient_data",
            "message": "Missing risk score data in some sessions.",
        }
    else:
        change = round(latest_score - first_score, 1)
        # Risk score going DOWN is improvement (less injury risk), going UP
        # is decline - the sign is inverted relative to most "trend up =
        # good" dashboards, worth being explicit about in the UI.
        if change <= -5:
            direction = "Improving"
        elif change >= 5:
            direction = "Declining"
        else:
            direction = "Stable"
 
        trend = {
            "status": "ok",
            "first_score": first_score,
            "latest_score": latest_score,
            "change": change,
            "direction": direction,
        }
 
    return {
        "session_count": len(sessions),
        "sessions": sessions,
        "trend": trend,
    }
 
 
# ============================================================
# Admin Analytics Dashboard
#
# All KPI/distribution/trend queries use SQL-level aggregation
# (func.count/func.avg/group_by) - the only place this deliberately steps
# outside pure SQL is Injury Type Distribution and Most Common Injuries,
# because injury_risks is stored as a JSON blob per analysis (six
# categories, each with its own probability/risk_level/reasons) rather than
# a normalized child table. Properly normalizing that is a legitimate
# future improvement (a real analysis_injury_risks table, one row per
# category per analysis) but a bigger schema change than justified right
# now. Instead: ONE query fetches every completed analysis's injury_risks
# column, then a single Python pass aggregates it - this is NOT the N+1
# pattern (one query per ROW), it's one query total, so it doesn't violate
# the "avoid N+1" requirement even though it isn't pure SQL GROUP BY.
# ============================================================
from sqlalchemy import func
from sqlalchemy.orm import Session
 
from database import models
 
INJURY_CATEGORIES = ["ACL", "Hamstring", "Ankle", "Shoulder", "LowerBack", "Overuse"]
ROLE_LIST = ["Athlete", "Coach", "Physiotherapist", "Sports Scientist", "Administrator"]
 
 
def _get_kpi_counts(db: Session) -> dict:
    total_users = db.query(func.count(models.User.id)).scalar() or 0
 
    role_counts = dict(
        db.query(models.User.role, func.count(models.User.id))
        .group_by(models.User.role)
        .all()
    )
 
    total_videos = db.query(func.count(models.Video.id)).scalar() or 0
 
    total_completed_analyses = (
        db.query(func.count(models.AnalysisResult.id))
        .filter(models.AnalysisResult.status == "completed")
        .scalar()
        or 0
    )
 
    total_reports = db.query(func.count(models.Report.id)).scalar() or 0
 
    # "Active" = has done SOMETHING beyond just registering: uploaded a
    # video, or has any access request (sent or received). Defined this way
    # because we don't currently track login timestamps - a genuine future
    # improvement would add User.last_login_at for a stricter definition
    # ("active in last N days"), which is a one-column addition when wanted.
    uploader_ids = db.query(models.Video.athlete_pk_id).distinct().subquery()
    active_owner_ids = (
        db.query(models.Athlete.user_id)
        .filter(models.Athlete.id.in_(db.query(uploader_ids.c.athlete_pk_id)))
        .distinct()
    )
    requester_ids = db.query(models.AthleteAccessRequest.requested_by_user_id).distinct()
    active_user_ids = {row[0] for row in active_owner_ids.all()} | {row[0] for row in requester_ids.all()}
    total_active_users = len(active_user_ids)
 
    return {
        "total_registered_users": total_users,
        "total_athletes": role_counts.get("Athlete", 0),
        "total_coaches": role_counts.get("Coach", 0),
        "total_physiotherapists": role_counts.get("Physiotherapist", 0),
        "total_sports_scientists": role_counts.get("Sports Scientist", 0),
        "total_videos_uploaded": total_videos,
        "total_completed_analyses": total_completed_analyses,
        "total_reports_generated": total_reports,
        "total_active_users": total_active_users,
    }
 
 
def _get_user_distribution(db: Session) -> list:
    counts = dict(
        db.query(models.User.role, func.count(models.User.id))
        .group_by(models.User.role)
        .all()
    )
    total = sum(counts.values()) or 1
    return [
        {
            "role": role,
            "count": counts.get(role, 0),
            "percentage": round((counts.get(role, 0) / total) * 100, 1),
        }
        for role in ROLE_LIST
        if counts.get(role, 0) > 0
    ]
 
 
def _get_sports_distribution(db: Session) -> list:
    rows = (
        db.query(models.Athlete.sport_type, func.count(models.Athlete.id))
        .filter(models.Athlete.sport_type != "")
        .group_by(models.Athlete.sport_type)
        .all()
    )
    total = sum(count for _, count in rows) or 1
    return sorted(
        [
            {"sport": sport, "count": count, "percentage": round((count / total) * 100, 1)}
            for sport, count in rows
        ],
        key=lambda x: -x["count"],
    )
 
 
def _get_injury_risk_by_sport(db: Session) -> list:
    """Average overall risk score per sport, joined through completed
    analyses -> their athlete's sport_type. Also backs the 'Highest Risk
    Sports' table (athlete + analysis counts included)."""
    rows = (
        db.query(
            models.Athlete.sport_type,
            func.avg(models.AnalysisResult.overall_risk_score_numeric),
            func.count(func.distinct(models.Athlete.id)),
            func.count(models.AnalysisResult.id),
        )
        .join(models.AnalysisResult, models.AnalysisResult.athlete_pk_id == models.Athlete.id)
        .filter(
            models.AnalysisResult.status == "completed",
            models.Athlete.sport_type != "",
            models.AnalysisResult.overall_risk_score_numeric.isnot(None),
        )
        .group_by(models.Athlete.sport_type)
        .all()
    )
    result = [
        {
            "sport": sport,
            "average_risk_score": round(avg_score, 1) if avg_score is not None else None,
            "athlete_count": athlete_count,
            "analysis_count": analysis_count,
        }
        for sport, avg_score, athlete_count, analysis_count in rows
    ]
    return sorted(result, key=lambda x: -(x["average_risk_score"] or 0))
 
 
def _get_risk_level_distribution(db: Session) -> list:
    rows = (
        db.query(models.AnalysisResult.risk_level, func.count(models.AnalysisResult.id))
        .filter(models.AnalysisResult.status == "completed", models.AnalysisResult.risk_level.isnot(None))
        .group_by(models.AnalysisResult.risk_level)
        .all()
    )
    total = sum(count for _, count in rows) or 1
    order = {"Low": 0, "Moderate": 1, "High": 2, "Critical": 3}
    result = [
        {"risk_level": level, "count": count, "percentage": round((count / total) * 100, 1)}
        for level, count in rows
    ]
    return sorted(result, key=lambda x: order.get(x["risk_level"], 99))
 
 
def _get_injury_type_distribution(db: Session) -> list:
    """
    See module-level note above: one query fetches every completed
    analysis's injury_risks JSON, then a single Python pass counts how many
    times each category was flagged High/Critical. Not pure SQL GROUP BY,
    but not N+1 either - exactly one query.
    """
    rows = (
        db.query(models.AnalysisResult.injury_risks)
        .filter(models.AnalysisResult.status == "completed", models.AnalysisResult.injury_risks.isnot(None))
        .all()
    )
 
    counts = {cat: 0 for cat in INJURY_CATEGORIES}
    for (raw,) in rows:
        parsed = _safe_load(raw)
        for cat in INJURY_CATEGORIES:
            level = parsed.get(cat, {}).get("risk_level")
            if level in ("High", "Critical"):
                counts[cat] += 1
 
    total = sum(counts.values()) or 1
    result = [
        {
            "injury_type": "Lower Back" if cat == "LowerBack" else cat,
            "count": count,
            "percentage": round((count / total) * 100, 1),
        }
        for cat, count in counts.items()
    ]
    return sorted(result, key=lambda x: -x["count"])
 
 
def _get_monthly_trend(db: Session, model, date_column, extra_filter=None) -> list:
    query = db.query(
        func.to_char(func.date_trunc("month", date_column), "YYYY-MM").label("month"),
        func.count(model.id),
    )
    if extra_filter is not None:
        query = query.filter(extra_filter)
    rows = query.group_by("month").order_by("month").all()
    return [{"month": month, "count": count} for month, count in rows]
 
 
def _get_recent_activity(db: Session, limit: int = 5) -> dict:
    recent_users = (
        db.query(models.User)
        .order_by(models.User.created_at.desc())
        .limit(limit)
        .all()
    )
    recent_videos = (
        db.query(models.Video)
        .order_by(models.Video.created_at.desc())
        .limit(limit)
        .all()
    )
    recent_analyses = (
        db.query(models.AnalysisResult)
        .filter(models.AnalysisResult.status == "completed")
        .order_by(models.AnalysisResult.created_at.desc())
        .limit(limit)
        .all()
    )
    recent_reports = (
        db.query(models.Report)
        .order_by(models.Report.created_at.desc())
        .limit(limit)
        .all()
    )
 
    return {
        "recent_users": [
            {"name": u.name, "email": u.email, "role": u.role, "created_at": u.created_at.isoformat() if u.created_at else None}
            for u in recent_users
        ],
        "recent_videos": [
            {"filename": v.original_filename, "created_at": v.created_at.isoformat() if v.created_at else None}
            for v in recent_videos
        ],
        "recent_analyses": [
            {
                "analysis_id": str(a.id),
                "risk_level": a.risk_level,
                "overall_risk_score": a.overall_risk_score_numeric,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_analyses
        ],
        "recent_reports": [
            {"report_name": r.report_name, "created_at": r.created_at.isoformat() if r.created_at else None}
            for r in recent_reports
        ],
    }
 
 
def build_admin_dashboard(db: Session) -> dict:
    """Single entry point - one call builds the entire Admin Analytics
    Dashboard payload. Everything above is SQL-aggregated except the
    injury-type breakdown (one query, Python aggregation - see note)."""
    injury_by_sport = _get_injury_risk_by_sport(db)
    injury_type_distribution = _get_injury_type_distribution(db)
 
    avg_risk_row = (
        db.query(func.avg(models.AnalysisResult.overall_risk_score_numeric))
        .filter(models.AnalysisResult.status == "completed")
        .scalar()
    )
 
    return {
        "kpis": _get_kpi_counts(db),
        "user_distribution": _get_user_distribution(db),
        "sports_distribution": _get_sports_distribution(db),
        "injury_risk_by_sport": injury_by_sport,
        "risk_level_distribution": _get_risk_level_distribution(db),
        "injury_type_distribution": injury_type_distribution,
        "most_common_injuries": injury_type_distribution[:5],
        "monthly_upload_trend": _get_monthly_trend(db, models.Video, models.Video.created_at),
        "monthly_analysis_trend": _get_monthly_trend(
            db, models.AnalysisResult, models.AnalysisResult.created_at,
            extra_filter=(models.AnalysisResult.status == "completed"),
        ),
        "average_risk_score": round(avg_risk_row, 1) if avg_risk_row is not None else None,
        "highest_risk_sports": injury_by_sport,
        "recent_activity": _get_recent_activity(db),
    }
 