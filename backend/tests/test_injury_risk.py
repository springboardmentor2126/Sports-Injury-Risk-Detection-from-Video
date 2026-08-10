"""
test_injury_risk.py — verifies the Milestone 3 rule-based risk engine:
scoring, level thresholds, injury_type selection, training-load/
injury-history modifiers, the posture/exercise/recovery recommendation
split (matches models.Recommendation's 3 Text columns), and within-clip
anomaly detection.

Run from the project root:
    python backend/tests/test_injury_risk.py
"""

import sys
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.services.biomechanics import FrameMetrics
from backend.app.services.injury_risk import (
    assess_risk,
    detect_anomalous_frames,
    RISK_LEVEL_BOUNDARIES,
)


def clean_summary(**overrides):
    """A biomechanics summary with no flagged risk factors, as a baseline."""
    base = {
        "frames_analyzed": 30,
        "frames_with_detection": 30,
        "avg_left_knee_angle": 165.0,
        "avg_right_knee_angle": 164.0,
        "avg_trunk_lean_deg": 8.0,
        "left_knee_rom": 40.0,
        "right_knee_rom": 42.0,
        "knee_rom_asymmetry": 2.0,
        "peak_knee_valgus_proxy": 2.5,
    }
    base.update(overrides)
    return base


def main():
    # --- Clean clip, no profile flags -> Low risk, no factors, all-default plan ---
    assessment = assess_risk(clean_summary())
    print("clean clip:", assessment.score, assessment.level, assessment.injury_type)
    assert assessment.score == 0.0
    assert assessment.level == "Low"
    assert assessment.factors == []
    assert assessment.injury_type == "No significant risk factors detected"
    assert "maintain the current training routine" in assessment.recommendation.exercise_plan.lower()
    assert "no specific posture" in assessment.recommendation.posture_correction.lower()
    assert "no recovery" in assessment.recommendation.recovery_plan.lower()
    print("clean clip scores Low, no factors, all-default recommendation plan: OK")

    # --- High knee ROM asymmetry alone -> flagged, Moderate, injury_type set ---
    asym_summary = clean_summary(knee_rom_asymmetry=30.0)
    assessment = assess_risk(asym_summary)
    print("asymmetric clip:", assessment.score, assessment.level, assessment.injury_type)
    assert assessment.score == 28.0
    assert assessment.level == "Moderate"
    assert assessment.injury_type == "Knee ROM asymmetry"
    assert any(f.key == "knee_rom_asymmetry" for f in assessment.factors)
    assert "unilateral" in assessment.recommendation.exercise_plan.lower()
    # ROM asymmetry has no posture-correction cue in the map -> stays default
    assert "no specific posture" in assessment.recommendation.posture_correction.lower()
    print("knee ROM asymmetry correctly flagged, scored, and recommended: OK")

    # --- Normal running gait's asymmetry number (<15, per test_biomechanics.py)
    # must NOT get flagged here either -- consistent with the Milestone 2 fix ---
    running_like_summary = clean_summary(knee_rom_asymmetry=10.0)
    assessment = assess_risk(running_like_summary)
    assert not any(f.key == "knee_rom_asymmetry" for f in assessment.factors)
    print("normal-gait-level asymmetry NOT flagged (consistent with M2 fix): OK")

    # --- High knee valgus proxy -> flagged, correct bucket placement ---
    valgus_summary = clean_summary(peak_knee_valgus_proxy=18.0)
    assessment = assess_risk(valgus_summary)
    print("high valgus clip:", assessment.score, assessment.level, assessment.injury_type)
    assert assessment.score == 28.0
    assert assessment.level == "Moderate"
    assert assessment.injury_type == "Left knee valgus proxy"
    factor = next(f for f in assessment.factors if f.key == "knee_valgus")
    assert "left knee" in factor.label.lower()  # must not overstate as bilateral
    assert "knees over toes" in assessment.recommendation.posture_correction.lower()
    assert "glute" in assessment.recommendation.exercise_plan.lower()
    print("high knee valgus correctly flagged, left-knee-labeled, right buckets filled: OK")

    # --- Excess trunk lean -> flagged, both posture + exercise buckets filled ---
    trunk_summary = clean_summary(avg_trunk_lean_deg=40.0)
    assessment = assess_risk(trunk_summary)
    assert any(f.key == "trunk_lean" for f in assessment.factors)
    assert "upright" in assessment.recommendation.posture_correction.lower()
    assert "core" in assessment.recommendation.exercise_plan.lower() or "anti-flexion" in assessment.recommendation.exercise_plan.lower()
    print("excess trunk lean correctly flagged in both posture + exercise buckets: OK")

    # --- Combined biomechanics factors + training load + injury history ---
    combined_summary = clean_summary(knee_rom_asymmetry=30.0, peak_knee_valgus_proxy=18.0)
    assessment = assess_risk(
        combined_summary,
        injury_history="ACL reconstruction 2 years ago",
        training_load="high intensity block this month",
    )
    print("combined worst-case:", assessment.score, assessment.level, assessment.injury_type)
    # 28 (asymmetry) + 28 (valgus) + 18 (relevant history) + 12 (high load) = 86
    assert assessment.score == 86.0
    assert assessment.level == "Critical"
    # asymmetry and valgus tie at 28 pts each -- first one added (asymmetry) wins the tie
    assert assessment.injury_type == "Knee ROM asymmetry"
    factor_keys = {f.key for f in assessment.factors}
    assert {"knee_rom_asymmetry", "knee_valgus", "injury_history_relevant", "training_load_high"} <= factor_keys
    assert "physiotherapist" in assessment.recommendation.recovery_plan.lower()
    assert "deload" in assessment.recommendation.recovery_plan.lower()
    print("combined factors sum correctly, hit the expected level, recovery plan has both flags: OK")

    # --- Score must clamp at 100 even if factors would sum higher ---
    extreme_summary = clean_summary(knee_rom_asymmetry=50.0, peak_knee_valgus_proxy=40.0, avg_trunk_lean_deg=50.0)
    assessment = assess_risk(
        extreme_summary,
        injury_history="repeated ACL and hamstring tears",
        training_load="very heavy overload phase",
    )
    print("extreme clip (should clamp at 100):", assessment.score, assessment.level)
    # 28 (asymmetry) + 28 (valgus) + 18 (trunk) + 18 (history) + 12 (load) = 104 -> clamps to 100
    assert assessment.score == 100.0
    assert assessment.level == "Critical"
    print("score clamps at 100 / maps to Critical: OK")

    # --- Non-specific injury history still nudges score, but less than a
    # lower-body-relevant one, and doesn't get the physio-review line ---
    generic_history_summary = clean_summary()
    assessment = assess_risk(generic_history_summary, injury_history="mild concussion last season")
    assert assessment.score == 6.0
    assert assessment.injury_type == "Prior injury history (non-specific)"
    assert "physiotherapist" not in assessment.recommendation.recovery_plan.lower()
    print("non-specific injury history scored lower, no physio-review line, still becomes injury_type: OK")

    # --- Low/recovery training load is a small negative (protective) modifier,
    # and score still clamps at 0, never negative ---
    assessment = assess_risk(clean_summary(), training_load="light recovery week")
    assert assessment.score == 0.0
    assert assessment.injury_type == "No significant risk factors detected"
    print("low/recovery training load doesn't push score below 0, no false injury_type: OK")

    # --- Low pose-detection coverage is informational only (0 points) --
    # surfaced as a factor but must NOT become the injury_type headline ---
    low_confidence_summary = clean_summary(frames_analyzed=20, frames_with_detection=5)
    assessment = assess_risk(low_confidence_summary)
    assert assessment.score == 0.0
    assert any(f.key == "low_detection_confidence" for f in assessment.factors)
    assert assessment.injury_type == "No significant risk factors detected"
    print("low detection coverage surfaced as a factor but doesn't hijack injury_type: OK")

    # --- Risk level boundaries are monotonic; Critical is the catch-all
    # above the last listed boundary (not itself a tuple in the list) ---
    prev = -1.0
    for boundary, _level in RISK_LEVEL_BOUNDARIES:
        assert boundary > prev
        prev = boundary
    assert RISK_LEVEL_BOUNDARIES[-1][1] == "High"
    print("risk level boundaries are monotonic, Critical is the catch-all above them: OK")

    # --- RiskFactor must survive dataclasses.asdict() cleanly -- this is
    # EXACTLY how the router serializes it into injury_predictions'
    # contributing_factors JSON column, so if this breaks, DB writes break ---
    combined_dicts = [asdict(f) for f in assessment.factors]
    assert all(set(d.keys()) == {"key", "label", "points", "detail"} for d in combined_dicts)
    print("RiskFactor.asdict() produces clean, JSON-column-ready dicts: OK")

    # --- Anomaly detection: a single spiking frame among steady ones gets
    # flagged; a perfectly steady clip flags nothing ---
    steady_frames = [
        FrameMetrics(
            frame_number=i, left_knee_angle=160.0, right_knee_angle=160.0,
            left_elbow_angle=None, right_elbow_angle=None,
            left_hip_angle=None, right_hip_angle=None,
            trunk_lean_deg=5.0, knee_valgus_proxy=2.0, knee_symmetry_diff=0.0,
        )
        for i in range(10)
    ]
    anomalous = detect_anomalous_frames(steady_frames)
    assert anomalous == []
    print("perfectly steady clip flags no anomalous frames: OK")

    spiking_frames = list(steady_frames)
    spiking_frames[4] = FrameMetrics(
        frame_number=4, left_knee_angle=160.0, right_knee_angle=160.0,
        left_elbow_angle=None, right_elbow_angle=None,
        left_hip_angle=None, right_hip_angle=None,
        trunk_lean_deg=5.0, knee_valgus_proxy=45.0, knee_symmetry_diff=0.0,
    )
    anomalous = detect_anomalous_frames(spiking_frames)
    print("frame numbers flagged as anomalous:", anomalous)
    assert anomalous == [4]
    print("single spiking frame correctly flagged as within-clip anomaly: OK")

    # --- Too few frames with valgus data -> no false confidence, empty list ---
    assert detect_anomalous_frames(steady_frames[:3]) == []
    assert detect_anomalous_frames(None) == []
    assert detect_anomalous_frames([]) == []
    print("too little data for a z-score correctly returns no anomalies: OK")

    # --- assess_risk still works end-to-end when frames aren't passed at all
    # (e.g. a caller that only has the stored summary, not raw frame rows) ---
    assessment = assess_risk(clean_summary(), frames=None)
    assert assessment.anomalous_frames == []
    print("assess_risk works without raw frames (summary-only callers): OK")

    print("\nALL INJURY RISK TESTS PASSED")


if __name__ == "__main__":
    main()

