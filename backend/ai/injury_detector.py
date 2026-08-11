class InjuryDetector:

    @staticmethod
    def detect(left_knee, right_knee,
               left_elbow, right_elbow):

        warnings = []
        risk_score = 0

        # -----------------------------
        # Knee Injury Detection
        # -----------------------------

        if left_knee < 120:
            warnings.append("Left Knee Excessive Flexion")
            risk_score += 2

        if right_knee < 120:
            warnings.append("Right Knee Excessive Flexion")
            risk_score += 2

        if left_knee > 175:
            warnings.append("Left Knee Hyperextension")
            risk_score += 2

        if right_knee > 175:
            warnings.append("Right Knee Hyperextension")
            risk_score += 2

        # -----------------------------
        # Elbow Injury Detection
        # -----------------------------

        if left_elbow > 175:
            warnings.append("Left Elbow Hyperextension")
            risk_score += 1

        if right_elbow > 175:
            warnings.append("Right Elbow Hyperextension")
            risk_score += 1

        # -----------------------------
        # Final Risk Level
        # -----------------------------

        if risk_score <= 2:
            level = "Low"

        elif risk_score <= 5:
            level = "Medium"

        else:
            level = "High"

        return {
            "risk_score": risk_score,
            "risk_level": level,
            "warnings": warnings
        }