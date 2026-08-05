# -*- coding: utf-8 -*-
"""
inference.py
============
XGBoost inference module for injury risk prediction.

Loads the trained model once at server startup, then exposes a single
predict_injury_risk() function that is called from the video API route.

The model expects exactly 12 features in this order (from feature_names.txt):
  sport_encoded, knee_flexion, hip_angle, elbow_angle, shoulder_rotation,
  trunk_lean, knee_valgus_angle, symmetry,
  flag_knee_hyperext, flag_knee_valgus, flag_trunk_lean, flag_low_symmetry
"""

import os
import pickle
import logging
from typing import Optional
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_MODEL_DIR   = os.path.join(os.path.dirname(__file__), "models")
_MODEL_PATH  = os.path.join(_MODEL_DIR, "xgboost_model.pkl")
_ENCODER_PATH = os.path.join(_MODEL_DIR, "label_encoder.pkl")

# ── Lazy-loaded singletons (loaded once on first call) ────────────────────────
_model   = None
_encoder = None

# ── Risk label mapping ────────────────────────────────────────────────────────
_RISK_LABELS = {0: "low", 1: "moderate", 2: "high", 3: "critical"}
_VALID_SPORTS = {
    "BASKETBALL", "SOCCER", "TENNIS", "BASEBALL", "AMERICAN_FOOTBALL",
    "VOLLEYBALL", "TRACK", "SWIMMING", "BOXING", "WRESTLING",
    "RUGBY", "HOCKEY", "BADMINTON", "GYMNASTICS", "CYCLING", "CRICKET", "OTHER"
}


def _load_model():
    """Load model and encoder from disk (once). Thread-safe via module-level check."""
    global _model, _encoder
    if _model is None:
        if not os.path.exists(_MODEL_PATH):
            raise FileNotFoundError(
                f"XGBoost model not found at {_MODEL_PATH}. "
                "Run backend/scripts/train_xgboost.py first."
            )
        with open(_MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
        with open(_ENCODER_PATH, "rb") as f:
            _encoder = pickle.load(f)
        logger.info("XGBoost injury risk model loaded successfully.")


@dataclass
class RiskPrediction:
    """Full prediction result from XGBoost."""
    risk_level: str                    # "low" | "moderate" | "high" | "critical"
    risk_score: int                    # 0=low, 1=moderate, 2=high, 3=critical
    confidence: float                  # Probability of the predicted class (0.0-1.0)
    probabilities: dict                # Full breakdown: {"low": 0.05, "moderate": 0.15, ...}
    sport_type: str                    # Sport used for prediction
    model_version: str = "xgboost-v1"


def predict_injury_risk(
    sport_type: str,
    knee_flexion: Optional[float],
    hip_angle: Optional[float],
    elbow_angle: Optional[float],
    shoulder_rotation: Optional[float],
    trunk_lean: Optional[float],
    knee_valgus_angle: Optional[float],
    symmetry: Optional[float],
    flag_knee_hyperext: int,
    flag_knee_valgus: int,
    flag_trunk_lean: int,
    flag_low_symmetry: int,
) -> RiskPrediction:
    """
    Run XGBoost injury risk prediction for one analysis session.

    Args:
        sport_type:         Athlete's sport (e.g., "SOCCER"). Must match SPORT_PROFILES keys.
        knee_flexion:       Average knee bend angle across the video (degrees).
        hip_angle:          Average hip angle across the video (degrees).
        elbow_angle:        Average elbow angle across the video (degrees).
        shoulder_rotation:  Average shoulder rotation across the video (degrees).
        trunk_lean:         Average trunk lean across the video (degrees).
        knee_valgus_angle:  Average knee valgus (FPPA) angle across the video (degrees).
        symmetry:           Average bilateral symmetry score (0-100%).
        flag_knee_hyperext: 1 if knee hyperextension detected in any frame, else 0.
        flag_knee_valgus:   1 if knee valgus detected in any frame, else 0.
        flag_trunk_lean:    1 if excessive trunk lean detected in any frame, else 0.
        flag_low_symmetry:  1 if low symmetry detected in any frame, else 0.

    Returns:
        RiskPrediction dataclass with label, score, confidence, and probability breakdown.
    """
    _load_model()

    # Normalise sport key: uppercase, strip spaces, fallback to OTHER
    sport_key = sport_type.upper().replace(" ", "_").replace("&", "AND")
    if sport_key not in _VALID_SPORTS:
        logger.warning(f"Unknown sport '{sport_type}' — using 'OTHER' profile.")
        sport_key = "OTHER"

    # Encode sport to integer (same encoder used during training)
    # If the sport was not seen during training, default to 'OTHER'
    known_classes = list(_encoder.classes_)
    if sport_key not in known_classes:
        sport_key = "OTHER"
    sport_encoded = int(_encoder.transform([sport_key])[0])

    # Safely replace None with sport-appropriate defaults (median of normal range)
    def safe(val: Optional[float], default: float) -> float:
        return float(val) if val is not None else default

    features = np.array([[
        sport_encoded,
        safe(knee_flexion,       140.0),
        safe(hip_angle,          155.0),
        safe(elbow_angle,        120.0),
        safe(shoulder_rotation,   95.0),
        safe(trunk_lean,          12.0),
        safe(knee_valgus_angle,  172.0),
        safe(symmetry,            88.0),
        float(flag_knee_hyperext),
        float(flag_knee_valgus),
        float(flag_trunk_lean),
        float(flag_low_symmetry),
    ]])

    # Predict class and probabilities
    predicted_class  = int(_model.predict(features)[0])
    proba            = _model.predict_proba(features)[0]   # shape: (4,)

    risk_label = _RISK_LABELS.get(predicted_class, "low")
    confidence = round(float(proba[predicted_class]), 4)

    probabilities = {
        _RISK_LABELS[i]: round(float(p), 4)
        for i, p in enumerate(proba)
    }

    return RiskPrediction(
        risk_level=risk_label,
        risk_score=predicted_class,
        confidence=confidence,
        probabilities=probabilities,
        sport_type=sport_key,
    )