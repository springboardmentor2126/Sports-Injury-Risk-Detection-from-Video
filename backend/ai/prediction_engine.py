class PredictionEngine:

    @staticmethod
    def predict(warnings):

        injuries = []

        for warning in warnings:

            if "Knee" in warning:
                injuries.append("Possible ACL Injury")

            if "Elbow" in warning:
                injuries.append("Possible Elbow Ligament Injury")

            if "Shoulder" in warning:
                injuries.append("Possible Shoulder Injury")

        if not injuries:
            injuries.append("No Major Injury Detected")

        return injuries