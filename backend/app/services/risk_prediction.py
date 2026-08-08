# backend/app/services/risk_prediction.py


def predict_injury_risk(metrics):

    """
    Injury risk prediction logic
    Input: biomechanical metrics
    Output: risk score and recommendations
    """


    risk_score = 0
    issues = []


    # Knee valgus analysis
    knee_angle = metrics.get("knee_angle", 0)

    if knee_angle > 15:

        risk_score += 30

        issues.append(
            "Excessive knee valgus detected"
        )


    # Trunk lean analysis
    trunk_lean = metrics.get("trunk_lean", 0)

    if trunk_lean > 20:

        risk_score += 20

        issues.append(
            "High trunk lean detected"
        )


    # Hip stability
    hip_angle = metrics.get("hip_angle", 180)

    if hip_angle < 150:

        risk_score += 20

        issues.append(
            "Poor hip stability detected"
        )


    # Training load
    training_load = metrics.get(
        "training_load",
        "medium"
    )


    if training_load == "high":

        risk_score += 20

        issues.append(
            "High training load"
        )



    # Limit score

    if risk_score > 100:

        risk_score = 100



    # Risk category

    if risk_score >= 70:

        risk_level = "HIGH"

    elif risk_score >= 40:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"



    # Recommendations

    recommendations = {

        "posture_correction":
        "Improve landing posture and maintain knee alignment.",


        "exercise_plan":
        "Perform strength training, mobility exercises and hip stabilization drills.",


        "recovery_plan":
        "Monitor fatigue and maintain proper recovery between sessions."

    }



    return {

        "risk_score": risk_score,

        "risk_level": risk_level,

        "issues": issues,

        "metrics": metrics,

        "recommendations": recommendations

    }