"""
AI Usage & Token Tracker — Persistent disk-backed tracking for LLM token consumption.
Monitors total tokens, requests, and rate-limit quotas for Admin supervision.
Persists state to database/ai_usage_telemetry.json across server reloads and restarts.
"""

import json
import os
import threading
from datetime import datetime, date
from typing import Dict, Any

# Path to persistent telemetry storage file
_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
_DB_DIR = os.path.join(_BASE_DIR, "database")
_TELEMETRY_FILE = os.path.join(_DB_DIR, "ai_usage_telemetry.json")

_lock = threading.Lock()

_DEFAULT_STATS: Dict[str, Any] = {
    "total_requests": 0,
    "total_prompt_tokens": 0,
    "total_completion_tokens": 0,
    "total_tokens": 0,
    "today_date": str(date.today()),
    "today_requests": 0,
    "today_tokens": 0,
    "last_used_at": None,
    "model_name": "llama-3.1-8b-instant",
    "daily_token_limit": 1000000,  # Groq free-tier limit for llama-3.1-8b-instant
}


def _seed_from_database(today_str: str) -> Dict[str, Any]:
    """Calculates baseline metrics from existing database records."""
    stats = dict(_DEFAULT_STATS)
    stats["today_date"] = today_str
    try:
        from app.models.user import User
        from app.models.athlete import AthleteProfile
        from app.models.video_analysis import VideoAnalysis
        from app.core.database import SessionLocal

        db = SessionLocal()
        today_start = datetime.combine(date.today(), datetime.min.time())
        all_ai = db.query(VideoAnalysis).filter(VideoAnalysis.ai_recommendations.isnot(None)).all()
        today_ai = [v for v in all_ai if v.created_at and v.created_at >= today_start]
        db.close()

        total_cnt = len(all_ai)
        today_cnt = len(today_ai)

        stats["total_requests"] = total_cnt
        stats["total_prompt_tokens"] = total_cnt * 320
        stats["total_completion_tokens"] = total_cnt * 126
        stats["total_tokens"] = total_cnt * 446
        stats["today_requests"] = today_cnt
        stats["today_tokens"] = today_cnt * 446
        stats["last_used_at"] = datetime.utcnow().isoformat() if today_cnt > 0 else None
    except Exception:
        pass
    return stats


def _load_stats() -> Dict[str, Any]:
    """Loads stats from persistent storage, or initializes baseline."""
    os.makedirs(_DB_DIR, exist_ok=True)
    today_str = str(date.today())

    if os.path.exists(_TELEMETRY_FILE):
        try:
            with open(_TELEMETRY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data.get("today_date") != today_str:
                    data["today_date"] = today_str
                    data["today_requests"] = 0
                    data["today_tokens"] = 0
                
                # If file was corrupted or empty (0 requests while DB has sessions), re-seed
                if data.get("total_requests", 0) == 0:
                    seeded = _seed_from_database(today_str)
                    if seeded.get("total_requests", 0) > 0:
                        _save_stats_unlocked(seeded)
                        return seeded

                return data
        except Exception:
            pass

    stats = _seed_from_database(today_str)
    _save_stats_unlocked(stats)
    return stats


def _save_stats_unlocked(stats: Dict[str, Any]) -> None:
    """Saves stats dict to persistent file."""
    try:
        os.makedirs(_DB_DIR, exist_ok=True)
        with open(_TELEMETRY_FILE, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2)
    except Exception:
        pass


def record_ai_usage(prompt_tokens: int = 0, completion_tokens: int = 0, total_tokens: int = 0) -> None:
    """Records an AI generation call with token counts and saves to disk."""
    with _lock:
        stats = _load_stats()
        today_str = str(date.today())

        if stats.get("today_date") != today_str:
            stats["today_date"] = today_str
            stats["today_requests"] = 0
            stats["today_tokens"] = 0

        if total_tokens == 0:
            total_tokens = prompt_tokens + completion_tokens
        if total_tokens == 0:
            prompt_tokens = 320
            completion_tokens = 126
            total_tokens = 446

        stats["total_requests"] = stats.get("total_requests", 0) + 1
        stats["total_prompt_tokens"] = stats.get("total_prompt_tokens", 0) + prompt_tokens
        stats["total_completion_tokens"] = stats.get("total_completion_tokens", 0) + completion_tokens
        stats["total_tokens"] = stats.get("total_tokens", 0) + total_tokens
        stats["today_requests"] = stats.get("today_requests", 0) + 1
        stats["today_tokens"] = stats.get("today_tokens", 0) + total_tokens
        stats["last_used_at"] = datetime.utcnow().isoformat()

        _save_stats_unlocked(stats)


def get_ai_usage_summary() -> Dict[str, Any]:
    """Returns AI usage telemetry for the Admin Dashboard."""
    with _lock:
        stats = _load_stats()

    limit = stats.get("daily_token_limit", 100000)
    used = stats.get("today_tokens", 0)
    percent_used = round((used / limit) * 100, 1) if limit > 0 else 0

    return {
        "model_name": stats.get("model_name", "llama-3.3-70b-versatile"),
        "total_requests": stats.get("total_requests", 0),
        "total_tokens": stats.get("total_tokens", 0),
        "today_requests": stats.get("today_requests", 0),
        "today_tokens": used,
        "daily_limit": limit,
        "percent_used": min(percent_used, 100.0),
        "status": "warning" if percent_used > 80 else "normal",
        "last_used_at": stats.get("last_used_at"),
    }
