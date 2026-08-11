class RiskEngine:

    @staticmethod
    def calculate(injury):

        warnings = injury["warnings"]
        score = 0

        for warning in warnings:

            if "Knee" in warning:
                score += 30

            elif "Elbow" in warning:
                score += 20

            elif "Shoulder" in warning:
                score += 25

        score = min(score, 100)

        if score <= 25:
            level = "Low"
        elif score <= 50:
            level = "Medium"
        elif score <= 75:
            level = "High"
        else:
            level = "Critical"

        return {
            "risk_score": score,
            "risk_level": level
        }