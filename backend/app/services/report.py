def generate_report(
    athlete_name,
    biomechanics,
    assessment
):
    """
    Generate final sports injury analysis report.
    """

    recommendations = []

    # ----------------------------
    # Left Knee
    # ----------------------------
    if biomechanics["left_knee_angle"] < 150:
        recommendations.append(
            "Improve left knee stability with strengthening exercises."
        )

    # ----------------------------
    # Right Knee
    # ----------------------------
    if biomechanics["right_knee_angle"] < 150:
        recommendations.append(
            "Improve right knee stability with strengthening exercises."
        )

    # ----------------------------
    # Hip
    # ----------------------------
    if biomechanics["hip_angle"] < 150:
        recommendations.append(
            "Perform hip mobility and flexibility exercises."
        )

    # ----------------------------
    # Shoulder
    # ----------------------------
    if biomechanics["shoulder_angle"] < 140:
        recommendations.append(
            "Improve shoulder posture and mobility."
        )

    # ----------------------------
    # Ankle
    # ----------------------------
    if biomechanics["ankle_angle"] < 140:
        recommendations.append(
            "Improve ankle balance and stability."
        )

    if len(recommendations) == 0:

        recommendations.append(
            "Movement quality is good. Continue normal training."
        )

    return {

        "athlete": athlete_name,

        "movement_quality":
            assessment["movement_quality"],

        "risk_level":
            assessment["risk_level"],

        "risk_score":
            assessment["risk_score"],

        "identified_issues":
            assessment["identified_issues"],

        "joint_analysis": {

            "Left Knee":
                round(
                    biomechanics["left_knee_angle"],
                    2
                ),

            "Right Knee":
                round(
                    biomechanics["right_knee_angle"],
                    2
                ),

            "Hip":
                round(
                    biomechanics["hip_angle"],
                    2
                ),

            "Shoulder":
                round(
                    biomechanics["shoulder_angle"],
                    2
                ),

            "Ankle":
                round(
                    biomechanics["ankle_angle"],
                    2
                )

        },

        "recommendation":
            recommendations

    }