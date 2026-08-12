def score_biomechanical_deviations(summary: dict) -> float:
    score = 0
    knee_valgus_avg = summary.get("knee_valgus_ratio", {}).get("average", 1.0)
    trunk_lean_avg = summary.get("trunk_lean", {}).get("average", 0)

    if knee_valgus_avg < 0.8:
        score += 40
    elif knee_valgus_avg < 1.0:
        score += 20

    if trunk_lean_avg > 0.08:
        score += 30
    elif trunk_lean_avg > 0.05:
        score += 15

    return min(score, 100)


def score_movement_asymmetry(summary: dict) -> float:
    knee_diff = summary.get("knee_symmetry_diff", {}).get("average", 0)
    hip_diff = summary.get("hip_symmetry_diff", {}).get("average", 0)
    score = 0

    if knee_diff > 15:
        score += 50
    elif knee_diff > 8:
        score += 25

    if hip_diff > 15:
        score += 50
    elif hip_diff > 8:
        score += 25

    return min(score, 100)


def score_historical_injury_factors(injury_history: str) -> float:
    if not injury_history or injury_history.strip().lower() in ("none", "n/a", ""):
        return 0
    history_lower = injury_history.lower()
    high_risk_keywords = ["acl", "mcl", "fracture", "surgery", "rupture", "tear"]
    if any(kw in history_lower for kw in high_risk_keywords):
        return 80
    return 50


def score_training_load(training_load: str) -> float:
    if not training_load:
        return 20
    load = training_load.strip().lower()
    if load in ("high", "very high", "heavy"):
        return 70
    if load in ("moderate", "medium"):
        return 35
    return 10


def score_fatigue_indicators(summary: dict) -> float:
    balance_max = summary.get("balance_offset", {}).get("max", 0)
    balance_avg = summary.get("balance_offset", {}).get("average", 0)
    variability = balance_max - balance_avg

    if variability > 0.05:
        return 70
    elif variability > 0.02:
        return 35
    return 10


def predict_injury_categories(summary: dict, risk_score: float) -> list:
    categories = []

    knee_valgus = summary.get("knee_valgus_ratio", {}).get("average", 1.0)
    knee_sym = summary.get("knee_symmetry_diff", {}).get("average", 0)
    left_knee = summary.get("left_knee_angle", {}).get("average", 160)
    right_knee = summary.get("right_knee_angle", {}).get("average", 160)
    avg_knee = (left_knee + right_knee) / 2

    acl_risk = 0
    if knee_valgus < 0.85:
        acl_risk += 40
    if knee_sym > 12:
        acl_risk += 25
    if avg_knee < 110:
        acl_risk += 20
    if acl_risk > 30:
        categories.append({
            "injury": "ACL Injury",
            "probability": min(acl_risk, 95),
            "level": "High" if acl_risk > 50 else "Moderate"
        })

    hip_sym = summary.get("hip_symmetry_diff", {}).get("average", 0)
    trunk_lean = summary.get("trunk_lean", {}).get("average", 0)
    hamstring_risk = 0
    if hip_sym > 10:
        hamstring_risk += 30
    if trunk_lean > 0.07:
        hamstring_risk += 25
    if risk_score > 50:
        hamstring_risk += 20
    if hamstring_risk > 25:
        categories.append({
            "injury": "Hamstring Strain",
            "probability": min(hamstring_risk, 90),
            "level": "High" if hamstring_risk > 50 else "Moderate"
        })

    balance = summary.get("balance_offset", {}).get("average", 0)
    ankle_risk = 0
    if balance > 0.07:
        ankle_risk += 35
    if knee_sym > 8:
        ankle_risk += 20
    if ankle_risk > 20:
        categories.append({
            "injury": "Ankle Sprain",
            "probability": min(ankle_risk, 85),
            "level": "Moderate" if ankle_risk > 30 else "Low"
        })

    back_risk = 0
    if trunk_lean > 0.08:
        back_risk += 40
    hip_stability = summary.get("hip_stability_ratio", {}).get("average", 1.0)
    if hip_stability < 0.7:
        back_risk += 25
    if back_risk > 25:
        categories.append({
            "injury": "Lower Back Strain",
            "probability": min(back_risk, 85),
            "level": "Moderate" if back_risk > 40 else "Low"
        })

    categories.sort(key=lambda x: x["probability"], reverse=True)
    return categories


def calculate_injury_risk(
    summary: dict,
    injury_history: str = "",
    training_load: str = ""
) -> dict:
    biomechanical = score_biomechanical_deviations(summary)
    historical = score_historical_injury_factors(injury_history)
    asymmetry = score_movement_asymmetry(summary)
    training = score_training_load(training_load)
    fatigue = score_fatigue_indicators(summary)

    total_score = (
        biomechanical * 0.35 +
        historical * 0.20 +
        asymmetry * 0.20 +
        training * 0.15 +
        fatigue * 0.10
    )
    total_score = round(total_score, 2)

    if total_score < 25:
        category = "Low Risk"
    elif total_score < 50:
        category = "Moderate Risk"
    elif total_score < 75:
        category = "High Risk"
    else:
        category = "Critical Risk"

    injury_probability = round(min(total_score * 0.8, 95), 1)
    injury_categories = predict_injury_categories(summary, total_score)

    return {
        "injury_risk_score": total_score,
        "risk_category": category,
        "injury_probability": injury_probability,
        "injury_categories": injury_categories,
        "breakdown": {
            "biomechanical_deviations": biomechanical,
            "historical_injury_factors": historical,
            "movement_asymmetry": asymmetry,
            "training_load_indicators": training,
            "fatigue_indicators": fatigue,
        }
    }