"""
Chat Router — Ephemeral role-aware AI assistant endpoint.

POST /api/chat/{session_id}
  - Fetches the session's analysis context from the DB
  - Calls Gemini with a role-specific system prompt
  - Returns the AI text response
  - Does NOT save anything to the database (fully ephemeral)
"""

import json
import logging

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.video_analysis import VideoAnalysis
from app.models.athlete import AthleteProfile
from app.models.user import User, Role
from app.ml.ai_service import generate_chat_response, generate_dashboard_chat_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["AI Chat"])


class ChatRequest(BaseModel):
    message: str
    role: str = "athlete"   # Passed by the frontend from the logged-in user's role



@router.post("/dashboard", summary="Global chat across team or athlete history")
def chat_dashboard_ai(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Ask the AI assistant a question on the main dashboard.
    If coach/physio/scientist: Context is the team roster and risk levels.
    If athlete: Context is their own overall progress and history.
    """
    role_name = current_user.role.name if current_user.role else "athlete"
    dashboard_context = {}

    if role_name in ["coach", "physiotherapist", "scientist"]:
        # Fetch team roster
        athletes = db.query(AthleteProfile).all()
        active_athletes = []
        high_risk_count = 0
        for a in athletes:
            # get their last session
            last_session = db.query(VideoAnalysis).filter(VideoAnalysis.user_id == str(a.user_id)).order_by(VideoAnalysis.created_at.desc()).first()
            if not last_session:
                continue
            
            risk = last_session.risk_level or "unknown"
            if risk in ["high", "critical"]:
                high_risk_count += 1
                
            sym = round((last_session.avg_overall_symmetry or 0) * 100)
            injuries = ", ".join([f"{i.injury_name} ({i.affected_body_part})" for i in a.injury_histories]) if a.injury_histories else "None"
            
            u = db.query(User).filter(User.id == a.user_id).first()
            active_athletes.append({
                "name": u.first_name if u else "Athlete",
                "sport": a.sport_type or "Unknown",
                "risk": risk,
                "sym": sym,
                "injuries": injuries
            })
            
        dashboard_context = {
            "total_athletes": len(active_athletes),
            "high_risk_count": high_risk_count,
            "athletes": active_athletes
        }
    else:
        # Athlete view
        sessions = db.query(VideoAnalysis).filter(VideoAnalysis.user_id == str(current_user.id)).order_by(VideoAnalysis.created_at.desc()).all()
        profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == current_user.id).first()
        
        avg_sym = 0
        if sessions:
            syms = [s.avg_overall_symmetry for s in sessions if s.avg_overall_symmetry is not None]
            if syms:
                avg_sym = round(sum(syms) / len(syms) * 100)
                
        injuries = []
        if profile and profile.injury_histories:
            injuries = [f"{i.injury_name} ({i.affected_body_part})" for i in profile.injury_histories]
            
        dashboard_context = {
            "total_sessions": len(sessions),
            "latest_risk": sessions[0].risk_level if sessions else "Unknown",
            "avg_symmetry": avg_sym,
            "injuries": injuries
        }

    response_text = generate_dashboard_chat_response(
        dashboard_context=dashboard_context,
        user_role=role_name,
        user_message=body.message,
    )

    return {"response": response_text}

@router.post("/{session_id}", summary="Send a message to the role-aware AI assistant")
def chat_with_ai(
    session_id: str,
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Ask the AI assistant a question about a specific analysis session.
    The assistant's response is tailored to the requesting user's role.
    Nothing is saved to the database.
    """
    # Fetch the session to build context
    analysis = (
        db.query(VideoAnalysis)
        .filter(VideoAnalysis.session_id == session_id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Build the context dict from DB fields
    active_flags = []
    if (analysis.frames_knee_hyperextension or 0) > 0:
        active_flags.append("Knee Hyperextension")
    if (analysis.frames_knee_valgus or 0) > 0:
        active_flags.append("Knee Valgus")
    if (analysis.frames_excessive_trunk_lean or 0) > 0:
        active_flags.append("Excessive Trunk Lean")
    if (analysis.frames_low_symmetry or 0) > 0:
        active_flags.append("Low Movement Symmetry")
    if (analysis.frames_elbow_hyperextension or 0) > 0:
        active_flags.append("Elbow Hyperextension")
    if (analysis.frames_knee_acute_flexion or 0) > 0:
        active_flags.append("Acute Knee Flexion")
    # Fetch user injury history
    injury_history = []
    profile = db.query(AthleteProfile).filter(AthleteProfile.user_id == analysis.user_id).first()
    if profile and profile.injury_histories:
        injury_history = [f"{inj.injury_name} ({inj.affected_body_part})" for inj in profile.injury_histories]

    session_context = {
        "sport_type":    analysis.sport_type_used or "Unknown",
        "risk_level":    analysis.risk_level or "unknown",
        "confidence":    analysis.xgboost_confidence,
        "symmetry":      analysis.avg_overall_symmetry,
        "trunk_lean":    round(analysis.avg_trunk_lean, 1) if analysis.avg_trunk_lean else "N/A",
        "knee_valgus":   round(analysis.avg_knee_valgus_angle, 1) if analysis.avg_knee_valgus_angle else "N/A",
        "active_flags":  active_flags,
        "injury_history": injury_history,
    }

    # Generate the ephemeral response (not saved to DB)
    response_text = generate_chat_response(
        session_context=session_context,
        user_role=body.role,
        user_message=body.message,
    )

    return {"response": response_text}

