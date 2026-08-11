def detect_anomalies(analysis):

    anomalies = []

    if analysis["posture_symmetry"] < 80:
        anomalies.append(
            "Body asymmetry detected."
        )

    if abs(
        analysis["left_knee_angle"] -
        analysis["right_knee_angle"]
    ) > 15:

        anomalies.append(
            "Knee imbalance detected."
        )

    if abs(
        analysis["left_hip_angle"] -
        analysis["right_hip_angle"]
    ) > 15:

        anomalies.append(
            "Hip asymmetry detected."
        )

    if abs(
        analysis["left_shoulder_angle"] -
        analysis["right_shoulder_angle"]
    ) > 15:

        anomalies.append(
            "Shoulder imbalance detected."
        )

    if abs(
        analysis["left_elbow_angle"] -
        analysis["right_elbow_angle"]
    ) > 15:

        anomalies.append(
            "Elbow movement asymmetry detected."
        )

    if len(anomalies) == 0:

        anomalies.append(
            "No significant movement anomalies detected."
        )

    return anomalies