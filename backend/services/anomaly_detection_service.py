"""
Movement Anomaly Detection Engine.
 
Distinct from injury_risk_engine.py: that module checks ABSOLUTE thresholds
(e.g. "is valgus > 15%?") on a single session. This module instead compares
a session against THIS SPECIFIC ATHLETE'S OWN recent history - so it can
flag things like "your left knee ROM just dropped 25% vs your last 4
sessions", which could be perfectly "normal" in absolute terms but still be
a meaningful change worth a coach/physio's attention (fatigue, returning
from injury, declining technique, etc).
 
Computed fresh on demand (not persisted) - always compares against
whatever history currently exists at view time.
"""
 
 
def _pct_change(current, baseline):
    if not baseline:
        return 0.0
    return round(((current - baseline) / baseline) * 100, 1)
 
 
def _avg(values):
    values = [v for v in values if v is not None]
    return sum(values) / len(values) if values else None
 
 
def detect_movement_anomalies(current_biomechanics, historical_biomechanics_list, max_history=5):
    """
    current_biomechanics: the biomechanics dict for the session being viewed.
    historical_biomechanics_list: list of biomechanics dicts from this
        athlete's OTHER past sessions, newest first (current one excluded
        by the caller).
    """
    history = historical_biomechanics_list[:max_history]
 
    if len(history) < 2:
        return {
            "status": "insufficient_history",
            "sessions_compared": len(history),
            "message": (
                "Need at least 2 previous sessions for this athlete to "
                "establish a movement baseline. Upload more videos for this "
                "athlete to enable anomaly detection."
            ),
            "anomalies": [],
            "overall_flag": "Not enough data yet",
        }
 
    anomalies = []
 
    # --- Range of Motion per joint (average angle) ---
    current_rom = current_biomechanics.get("range_of_motion", {}) or {}
    for joint, stats in current_rom.items():
        baseline_avg = _avg([h.get("range_of_motion", {}).get(joint, {}).get("avg") for h in history])
        if baseline_avg is None:
            continue
        current_avg = stats.get("avg", 0)
        change_pct = _pct_change(current_avg, baseline_avg)
        if abs(change_pct) >= 20:
            severity = "High" if abs(change_pct) >= 35 else "Moderate"
            direction = "decreased" if change_pct < 0 else "increased"
            label = joint.replace("_", " ").title()
            anomalies.append({
                "metric": f"{label} - Average Angle",
                "baseline": round(baseline_avg, 1),
                "current": round(current_avg, 1),
                "change_pct": change_pct,
                "severity": severity,
                "note": (
                    f"{label} average angle {direction} {abs(change_pct)}% "
                    f"compared to this athlete's recent baseline."
                ),
            })
 
    # --- Symmetry (left/right difference per joint pair) ---
    current_symmetry = current_biomechanics.get("symmetry", {}) or {}
    for joint, stats in current_symmetry.items():
        baseline_diff = _avg([h.get("symmetry", {}).get(joint, {}).get("difference") for h in history])
        if baseline_diff is None:
            continue
        current_diff = stats.get("difference", 0)
        delta = round(current_diff - baseline_diff, 1)
        # Absolute-degree threshold here (not %) since baseline symmetry
        # differences can be near zero, making % change unstable/misleading.
        if abs(delta) >= 8:
            severity = "High" if abs(delta) >= 15 else "Moderate"
            direction = "worse (more asymmetrical)" if delta > 0 else "improved"
            label = joint.title()
            anomalies.append({
                "metric": f"{label} Symmetry",
                "baseline": round(baseline_diff, 1),
                "current": round(current_diff, 1),
                "change_pct": _pct_change(current_diff, baseline_diff),
                "severity": severity,
                "note": f"{label} left/right asymmetry {direction} by {abs(delta)}\u00b0 vs baseline.",
            })
 
    # --- Trunk lean ---
    baseline_trunk = _avg([h.get("trunk_lean") for h in history])
    if baseline_trunk is not None:
        current_trunk = current_biomechanics.get("trunk_lean", 0)
        delta = round(current_trunk - baseline_trunk, 1)
        if abs(delta) >= 3:
            severity = "High" if abs(delta) >= 6 else "Moderate"
            direction = "increased" if delta > 0 else "decreased"
            anomalies.append({
                "metric": "Trunk Lean",
                "baseline": round(baseline_trunk, 1),
                "current": round(current_trunk, 1),
                "change_pct": _pct_change(current_trunk, baseline_trunk),
                "severity": severity,
                "note": (
                    f"Trunk lean {direction} by {abs(delta)}\u00b0 vs baseline - "
                    f"may indicate fatigue or reduced core stability."
                ),
            })
 
    # --- Knee valgus rate (both sides) ---
    valgus_details = current_biomechanics.get("valgus_details", {}) or {}
    for side_key, label in [("left_valgus_percentage", "Left"), ("right_valgus_percentage", "Right")]:
        baseline_val = _avg([h.get("valgus_details", {}).get(side_key) for h in history])
        if baseline_val is None:
            continue
        current_val = valgus_details.get(side_key, 0)
        delta = round(current_val - baseline_val, 1)
        if abs(delta) >= 10:
            severity = "High" if abs(delta) >= 20 else "Moderate"
            direction = "worsened" if delta > 0 else "improved"
            anomalies.append({
                "metric": f"{label} Knee Valgus Rate",
                "baseline": round(baseline_val, 1),
                "current": round(current_val, 1),
                "change_pct": _pct_change(current_val, baseline_val),
                "severity": severity,
                "note": (
                    f"{label} knee valgus (inward collapse) rate {direction} by "
                    f"{abs(delta)} percentage points vs baseline."
                ),
            })
 
    overall_flag = "Deviation Detected" if anomalies else "Normal - Consistent With Baseline"
 
    return {
        "status": "ok",
        "sessions_compared": len(history),
        "anomalies": anomalies,
        "overall_flag": overall_flag,
    }
 