def evaluate_movement_quality(analysis):

    score = 100

    average_knee = (
        analysis["left_knee_angle"] +
        analysis["right_knee_angle"]
    ) / 2

    average_hip = (
        analysis["left_hip_angle"] +
        analysis["right_hip_angle"]
    ) / 2

    symmetry = analysis["posture_symmetry"]

    if average_knee < 120:
        score -= 30

    elif average_knee < 140:
        score -= 15

    if average_hip < 150:
        score -= 20

    if symmetry < 60:
        score -= 30

    elif symmetry < 80:
        score -= 15

    if score >= 90:

        quality = "Excellent"

        description = (
            "Movement execution is highly efficient with excellent posture and coordination."
        )

    elif score >= 75:

        quality = "Good"

        description = (
            "Movement execution is good with only minor biomechanical deviations."
        )

    elif score >= 60:

        quality = "Fair"

        description = (
            "Movement quality is acceptable but requires improvement."
        )

    else:

        quality = "Poor"

        description = (
            "Movement quality is poor. Corrective training is recommended."
        )

    return quality, description