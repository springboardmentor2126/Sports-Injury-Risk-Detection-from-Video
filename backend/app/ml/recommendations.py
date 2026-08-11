def generate_recommendations(analysis, anomalies):

    recommendations = []

    if "Knee imbalance detected." in anomalies:

        recommendations.append(
            "Strengthen quadriceps and hamstrings."
        )

    if "Hip asymmetry detected." in anomalies:

        recommendations.append(
            "Perform hip mobility and glute strengthening exercises."
        )

    if "Shoulder imbalance detected." in anomalies:

        recommendations.append(
            "Improve upper-body posture and shoulder stability."
        )

    if "Elbow movement asymmetry detected." in anomalies:

        recommendations.append(
            "Improve arm coordination during movement."
        )

    if analysis["posture_symmetry"] < 80:

        recommendations.append(
            "Practice balance and posture correction drills."
        )

    if len(recommendations) == 0:

        recommendations.append(
            "Continue current training and maintain proper movement technique."
        )

    return recommendations