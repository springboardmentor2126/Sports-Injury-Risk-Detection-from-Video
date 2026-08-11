def predict_injury_risk(analysis):
    """
    Rule-based biomechanical injury risk assessment.
    """

    score = 0
    recommendations = []

    # =====================================================
    # Knee Analysis
    # =====================================================

    left_knee = analysis["left_knee_angle"]
    right_knee = analysis["right_knee_angle"]

    average_knee = (left_knee + right_knee) / 2

    if average_knee < 120:
        score += 3
        recommendations.append(
            "Excessive knee flexion detected. Improve squat and landing mechanics."
        )

    elif average_knee < 140:
        score += 2
        recommendations.append(
            "Moderate knee flexion observed. Strengthen quadriceps and hamstrings."
        )

    else:
        recommendations.append(
            "Knee movement is within a healthy range."
        )

    # =====================================================
    # Hip Analysis
    # =====================================================

    left_hip = analysis["left_hip_angle"]
    right_hip = analysis["right_hip_angle"]

    average_hip = (left_hip + right_hip) / 2

    if average_hip < 150:
        score += 2
        recommendations.append(
            "Hip mobility appears restricted. Include hip mobility exercises."
        )

    else:
        recommendations.append(
            "Hip alignment is good."
        )

    # =====================================================
    # Shoulder Analysis
    # =====================================================

    left_shoulder = analysis["left_shoulder_angle"]
    right_shoulder = analysis["right_shoulder_angle"]

    shoulder_difference = abs(
        left_shoulder - right_shoulder
    )

    if shoulder_difference > 20:
        score += 2
        recommendations.append(
            "Significant shoulder imbalance detected."
        )

    elif shoulder_difference > 10:
        score += 1
        recommendations.append(
            "Minor shoulder imbalance observed."
        )

    else:
        recommendations.append(
            "Shoulder posture is balanced."
        )

    # =====================================================
    # Elbow Analysis
    # =====================================================

    left_elbow = analysis["left_elbow_angle"]
    right_elbow = analysis["right_elbow_angle"]

    elbow_difference = abs(
        left_elbow - right_elbow
    )

    if elbow_difference > 20:
        score += 2
        recommendations.append(
            "Large elbow movement asymmetry detected."
        )

    elif elbow_difference > 10:
        score += 1
        recommendations.append(
            "Minor elbow imbalance detected."
        )

    else:
        recommendations.append(
            "Elbow movement is symmetrical."
        )

    # =====================================================
    # Posture Symmetry
    # =====================================================

    symmetry = analysis["posture_symmetry"]

    if symmetry < 60:
        score += 3
        recommendations.append(
            "Poor body symmetry detected. High imbalance during movement."
        )

    elif symmetry < 80:
        score += 2
        recommendations.append(
            "Moderate body asymmetry detected."
        )

    elif symmetry < 90:
        score += 1
        recommendations.append(
            "Small posture imbalance observed."
        )

    else:
        recommendations.append(
            "Excellent posture symmetry."
        )

    # =====================================================
    # Movement Quality
    # =====================================================

    movement = analysis["movement_quality"]

    if movement == "Poor":
        score += 3
        recommendations.append(
            "Movement quality is poor. Technique correction is recommended."
        )

    elif movement == "Fair":
        score += 2
        recommendations.append(
            "Movement quality is acceptable but can be improved."
        )

    elif movement == "Good":
        recommendations.append(
            "Movement quality is good."
        )

    elif movement == "Excellent":
        recommendations.append(
            "Movement quality is excellent."
        )

    # =====================================================
    # Overall Risk Level
    # =====================================================

    if score <= 3:

        risk = "LOW"

        summary = (
            "Overall biomechanics appear healthy with a low probability "
            "of injury. Continue maintaining proper technique."
        )

    elif score <= 7:

        risk = "MEDIUM"

        summary = (
            "Some biomechanical deviations were identified. Corrective "
            "training is recommended to reduce injury risk."
        )

    else:

        risk = "HIGH"

        summary = (
            "Multiple biomechanical abnormalities were detected. Injury "
            "risk is high and professional assessment is recommended."
        )

    return {

        "risk": risk,

        "score": score,

        "summary": summary,

        "recommendation": " ".join(recommendations)

    }

