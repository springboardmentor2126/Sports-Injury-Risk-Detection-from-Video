def generate_recommendations(
    summary: dict,
    anomalies: list,
    risk_result: dict,
    injury_history: str = "",
    training_load: str = ""
) -> dict:
    corrective_exercises = []
    mobility = []
    strengthening = []
    recovery = []
    training_modifications = []

    risk_score = risk_result.get("injury_risk_score", 0)
    risk_category = risk_result.get("risk_category", "Low Risk")
    anomaly_findings = [a["finding"] for a in anomalies]

    knee_valgus = summary.get("knee_valgus_ratio", {}).get("average", 1.0)
    if knee_valgus < 1.0:
        corrective_exercises.extend([
            "Single-leg squat with knee alignment cues (3×12 each leg)",
            "Lateral band walks to activate hip abductors (3×20 steps)",
            "Clamshells with resistance band (3×15 each side)"
        ])
        strengthening.extend([
            "Hip abductor machine: 3×15 at moderate load",
            "Glute bridges with resistance band: 3×20",
            "Step-ups with knee tracking emphasis: 3×12 each leg"
        ])

    trunk_lean = summary.get("trunk_lean", {}).get("average", 0)
    if trunk_lean > 0.06:
        corrective_exercises.extend([
            "Plank progressions for core stability (3×30-60 seconds)",
            "Dead bugs for anterior core control (3×10 each side)",
            "Pallof press for rotational core stability (3×12 each side)"
        ])
        strengthening.extend([
            "Cable anti-rotation holds: 3×30 seconds each side",
            "Farmer carries for trunk stability: 3×30m",
        ])

    balance_offset = summary.get("balance_offset", {}).get("average", 0)
    if balance_offset > 0.05:
        corrective_exercises.extend([
            "Single-leg balance with eyes closed (3×30 seconds each)",
            "Balance board training: 3×60 seconds",
            "Single-leg RDL for balance and posterior chain (3×10 each)"
        ])

    knee_sym = summary.get("knee_symmetry_diff", {}).get("average", 0)
    hip_sym = summary.get("hip_symmetry_diff", {}).get("average", 0)
    if knee_sym > 8 or hip_sym > 8:
        corrective_exercises.extend([
            "Unilateral leg press to address side-to-side strength deficit (3×12 each)",
            "Split squat with focus on weaker side (3×10 each)",
        ])
        strengthening.append(
            "Bulgarian split squat: address the weaker limb first in each set (3×8 each)"
        )

    mobility.extend([
        "Hip flexor stretch: 3×45 seconds each side — tight hip flexors alter pelvic position",
        "Thoracic spine mobility: cat-cow and thoracic rotations (2×10 each)",
        "Ankle dorsiflexion mobility: wall ankle stretches (3×30 seconds each)"
    ])

    left_knee = summary.get("left_knee_angle", {}).get("average", 160)
    right_knee = summary.get("right_knee_angle", {}).get("average", 160)
    avg_knee = (left_knee + right_knee) / 2
    if avg_knee < 120:
        mobility.append(
            "Quadriceps and rectus femoris stretching: 3×45 seconds each — reduced flexibility "
            "may be restricting knee extension"
        )

    if risk_score >= 50:
        recovery.extend([
            "Reduce high-intensity training volume by 20-30% for 1-2 weeks",
            "Prioritise 8+ hours of sleep for tissue repair and neuromuscular recovery",
            "Ice/compression on knees post-training if any swelling or discomfort",
            "Schedule a physiotherapy assessment within 2 weeks",
            "Avoid maximal-intensity plyometric work until risk factors are addressed"
        ])
    elif risk_score >= 25:
        recovery.extend([
            "Incorporate active recovery sessions (swimming, cycling) 2× per week",
            "Foam roll lower limbs and thoracic spine daily (10-15 minutes)",
            "Ensure adequate protein intake for tissue recovery (1.6-2.0g/kg body weight)"
        ])
    else:
        recovery.extend([
            "Current recovery load appears appropriate — maintain current routine",
            "Continue post-training stretching and cool-down protocols"
        ])

    load = (training_load or "").strip().lower()
    if load in ("high", "very high", "heavy"):
        training_modifications.extend([
            "Implement a de-load week every 4th week (50% volume reduction)",
            "Limit high-impact plyometric volume to prevent overuse",
            "Monitor Rate of Perceived Exertion (RPE) and stay below 8/10 on consecutive days",
            "Avoid back-to-back high-intensity sessions — insert recovery day between"
        ])
    elif load in ("moderate", "medium"):
        training_modifications.extend([
            "Training load is manageable — progress gradually (max 10% increase per week)",
            "Add one technical refinement session per week focusing on movement quality"
        ])
    else:
        training_modifications.append(
            "Consider progressive load increase with movement quality monitoring"
        )

    injury_lower = (injury_history or "").lower()
    if any(kw in injury_lower for kw in ["acl", "knee", "mcl"]):
        training_modifications.append(
            "Previous knee injury on record — avoid aggressive change-of-direction drills "
            "until cleared by physiotherapist"
        )
    if any(kw in injury_lower for kw in ["hamstring", "hip"]):
        training_modifications.append(
            "Previous hamstring/hip injury — prioritise eccentric hamstring work "
            "(Nordic curls) before returning to sprint-based training"
        )

    def dedupe(lst):
        seen = set()
        return [x for x in lst if not (x in seen or seen.add(x))]

    return {
        "corrective_exercises": dedupe(corrective_exercises),
        "mobility_improvements": dedupe(mobility),
        "strengthening_recommendations": dedupe(strengthening),
        "recovery_planning": dedupe(recovery),
        "training_modifications": dedupe(training_modifications)
    }