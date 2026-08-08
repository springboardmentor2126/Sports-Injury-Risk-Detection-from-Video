from datetime import datetime


def generate_report(
    athlete_name: str,
    biomechanics_data: dict,
    assessment_data: dict
):
    """
    Generate final sports injury risk report.
    """

    report = {

        "athlete_name": athlete_name,

        "generated_date": datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        ),

        "biomechanical_analysis": biomechanics_data,

        "movement_assessment": assessment_data,

        "recommendation": get_recommendation(
            assessment_data["risk_level"]
        )
    }

    return report



def get_recommendation(risk_level):

    if risk_level == "High":

        return (
            "High injury risk detected. "
            "Improve movement technique and consult a trainer."
        )

    elif risk_level == "Medium":

        return (
            "Moderate risk detected. "
            "Focus on posture correction and controlled movements."
        )

    else:

        return (
            "Movement quality is good. "
            "Continue maintaining proper technique."
        )