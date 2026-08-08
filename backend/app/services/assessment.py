def calculate_risk_score(biomechanics):
    """
    Calculate injury risk score based on joint angles.
    """

    score = 0
    issues = []

    left_knee = biomechanics.get("left_knee_angle", 180)
    right_knee = biomechanics.get("right_knee_angle", 180)
    hip = biomechanics.get("hip_angle", 180)
    ankle = biomechanics.get("ankle_angle", 180)
    shoulder = biomechanics.get("shoulder_angle", 180)

    # ----------------------------
    # Left Knee
    # ----------------------------
    if left_knee < 130:
        score += 25
        issues.append("Left knee excessive flexion")
    elif left_knee < 150:
        score += 10
        issues.append("Left knee needs attention")

    # ----------------------------
    # Right Knee
    # ----------------------------
    if right_knee < 130:
        score += 25
        issues.append("Right knee excessive flexion")
    elif right_knee < 150:
        score += 10
        issues.append("Right knee needs attention")

    # ----------------------------
    # Hip
    # ----------------------------
    if hip < 150:
        score += 20
        issues.append("Hip instability")

    # ----------------------------
    # Shoulder
    # ----------------------------
    if shoulder < 140:
        score += 15
        issues.append("Shoulder imbalance")

    # ----------------------------
    # Ankle
    # ----------------------------
    if ankle < 140:
        score += 15
        issues.append("Poor ankle stability")

    score = min(score, 100)

    return score, issues


def classify_risk(score):
    """
    Convert score into risk category.
    """

    if score <= 25:
        return "Low Risk"

    elif score <= 60:
        return "Medium Risk"

    else:
        return "High Risk"


def analyze_movement(biomechanics):
    """
    Final movement assessment.
    """

    score, issues = calculate_risk_score(biomechanics)

    risk = classify_risk(score)

    if score <= 25:
        quality = "Good"

    elif score <= 60:
        quality = "Average"

    else:
        quality = "Poor"

    return {
        "risk_score": score,
        "risk_level": risk,
        "movement_quality": quality,
        "identified_issues": issues
    }