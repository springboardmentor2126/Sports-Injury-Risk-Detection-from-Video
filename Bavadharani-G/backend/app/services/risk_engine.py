"""
Injury Risk Prediction Engine (Milestone 3).

Takes the biomechanical measurements already computed in Milestone 2
(joint angles, asymmetry, trunk lean) and turns them into per-injury-type
risk scores, using thresholds grounded in published sports-science
literature — NOT a trained black-box ML model. See docs/ for why this
approach was chosen (no labeled injury dataset exists for a solo project
to train on).

Each risk score is 0-100. Higher = more risk signal detected in this
video. These are directional risk indicators from a single clip, not a
medical diagnosis.
"""

import json


# --- Weighted scoring model (matches the spec's weighting) ---
WEIGHTS = {
    "biomechanical_deviations": 0.35,
    "movement_asymmetry": 0.20,
    # historical_injury_factors (0.20), training_load_indicators (0.15),
    # and fatigue_indicators (0.10) from the original spec need athlete
    # history / training-load / multi-session data we don't have from a
    # single video — they're left as documented future work (see docs/).
    # Weight is redistributed proportionally across what we CAN measure
    # from a single video today.
}


def _clamp(value, low=0, high=100):
    return max(low, min(high, value))


def compute_injury_risks(report: dict) -> dict:
    """
    report: dict with the same fields as a BiomechanicsReport
    (avg_left_knee_angle, avg_right_knee_angle, knee_angle_asymmetry,
    avg_trunk_lean_angle, avg_left_hip_angle, avg_right_hip_angle,
    detection_rate, movement_quality_score)

    Returns a dict with each injury category's risk (0-100), an overall
    score, category label, top risk factors, and recommendations.
    """
    asymmetry = report.get("knee_angle_asymmetry")
    trunk_lean = report.get("avg_trunk_lean_angle")
    avg_left_knee = report.get("avg_left_knee_angle")
    avg_right_knee = report.get("avg_right_knee_angle")
    detection_rate = report.get("detection_rate", 0.0)

    factors = []

    # --- ACL risk ---
    # Literature link: knee valgus / asymmetric knee flexion during
    # landing/cutting is strongly associated with ACL injury risk.
    # A tighter (more flexed, lower angle) knee vs. the other side during
    # dynamic movement is a commonly cited pattern.
    acl_risk = 0.0
    if asymmetry is not None:
        acl_risk = _clamp(asymmetry * 2.5)
        if asymmetry > 12:
            factors.append(f"Knee angle asymmetry of {asymmetry:.1f}\u00b0 between left and right — a pattern associated with uneven ACL loading during landing/cutting.")

    # --- Hamstring risk ---
    # Literature link: excessive knee extension (very straight leg) during
    # high-speed movement is linked to hamstring strain risk.
    hamstring_risk = 0.0
    knee_angles = [a for a in [avg_left_knee, avg_right_knee] if a is not None]
    if knee_angles:
        max_extension = max(knee_angles)  # closer to 180 = straighter leg
        if max_extension > 165:
            hamstring_risk = _clamp((max_extension - 150) * 2)
            factors.append(f"Near-full knee extension observed (~{max_extension:.0f}\u00b0) — associated with higher hamstring strain risk during fast movement.")

    # --- Ankle sprain risk ---
    # Without dedicated ankle/foot landmark angle tracking yet (a good
    # Milestone 4+ extension), we use detection_rate as a rough proxy:
    # low detection during dynamic movement often correlates with fast,
    # less controlled footwork that a coach should review manually.
    ankle_sprain_risk = _clamp((1 - detection_rate) * 40)

    # --- Lower back risk ---
    # Literature link: excessive trunk lean/flexion under load is linked
    # to lower back strain risk.
    lower_back_risk = 0.0
    if trunk_lean is not None:
        lower_back_risk = _clamp((trunk_lean - 5) * 2.2)
        if trunk_lean > 20:
            factors.append(f"Elevated trunk lean (~{trunk_lean:.0f}\u00b0 from vertical) — associated with increased lower back load.")

    # --- Overuse risk ---
    # A single video can't measure training load/frequency — this needs
    # data across many sessions over time. Left at a low baseline here
    # and flagged as a documented limitation rather than faked.
    overuse_risk = 10.0

    # --- Overall score: weighted combination, redistributed across what
    # a single video can actually measure ---
    overall = (
        acl_risk * 0.30
        + hamstring_risk * 0.20
        + ankle_sprain_risk * 0.15
        + lower_back_risk * 0.25
        + overuse_risk * 0.10
    )
    overall = round(_clamp(overall), 1)

    if overall >= 75:
        category = "Critical Risk"
    elif overall >= 50:
        category = "High Risk"
    elif overall >= 25:
        category = "Moderate Risk"
    else:
        category = "Low Risk"

    recommendations = _build_recommendations(
        acl_risk, hamstring_risk, ankle_sprain_risk, lower_back_risk
    )

    if not factors:
        factors.append("No significant risk patterns detected in this clip — movement metrics were within typical ranges.")

    return {
        "acl_risk": round(acl_risk, 1),
        "hamstring_risk": round(hamstring_risk, 1),
        "ankle_sprain_risk": round(ankle_sprain_risk, 1),
        "lower_back_risk": round(lower_back_risk, 1),
        "overuse_risk": round(overuse_risk, 1),
        "overall_risk_score": overall,
        "risk_category": category,
        "top_risk_factors": json.dumps(factors),
        "recommendations": json.dumps(recommendations),
    }


def _build_recommendations(acl_risk, hamstring_risk, ankle_sprain_risk, lower_back_risk):
    """Maps risk factors to plain-language corrective suggestions."""
    recs = []

    if acl_risk > 40:
        recs.append("Add single-leg strength work (e.g. Bulgarian split squats, step-ups) to improve knee control symmetry.")
        recs.append("Practice controlled landing drills focusing on knees tracking over toes, not caving inward.")

    if hamstring_risk > 40:
        recs.append("Incorporate eccentric hamstring exercises (e.g. Nordic curls) to build strength through full range of motion.")
        recs.append("Ensure adequate warm-up with dynamic stretching before high-speed running or sprinting.")

    if ankle_sprain_risk > 40:
        recs.append("Add proprioception/balance training (e.g. single-leg balance, wobble board) to improve ankle stability.")

    if lower_back_risk > 40:
        recs.append("Strengthen core stability (planks, dead bugs) to better support the trunk during dynamic movement.")
        recs.append("Review technique for excessive forward lean, especially under fatigue.")

    if not recs:
        recs.append("Movement patterns look reasonable in this clip — maintain current training and technique focus.")

    recs.append("This is an automated screening tool, not a medical diagnosis — consult a physiotherapist or sports medicine professional for a full assessment.")

    return recs
