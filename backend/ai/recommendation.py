class RecommendationEngine:

    @staticmethod
    def recommend(risk_level):

        if risk_level == "Low":
            return [
                "Continue Training",
                "Maintain Proper Form"
            ]

        elif risk_level == "Medium":
            return [
                "Reduce Training Intensity",
                "Stretch Before Exercise"
            ]

        elif risk_level == "High":
            return [
                "Consult Physiotherapist",
                "Avoid High Impact Activities"
            ]

        return [
            "Immediate Medical Assessment",
            "Stop Intensive Training"
        ]