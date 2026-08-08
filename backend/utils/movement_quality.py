# ---------------------------------------------------------
# Movement Quality Assessment
# ---------------------------------------------------------

def calculate_movement_quality(joint_angles):

    """
    Calculates movement quality score
    based on joint angles.
    """

    if not joint_angles:

        return {

            "score": 0,
            "grade": "Unknown",
            "feedback": [
                "No pose detected."
            ]

        }

    score = 100

    feedback = []

    # ---------------------------------------------
    # Knee Angles
    # ---------------------------------------------

    for knee in ["left_knee", "right_knee"]:

        angle = joint_angles.get(knee, 0)

        if angle < 90:

            score -= 15

            feedback.append(
                f"{knee.replace('_',' ').title()} excessively bent."
            )

        elif angle > 175:

            score -= 10

            feedback.append(
                f"{knee.replace('_',' ').title()} overextended."
            )

    # ---------------------------------------------
    # Hip Angles
    # ---------------------------------------------

    for hip in ["left_hip", "right_hip"]:

        angle = joint_angles.get(hip, 0)

        if angle < 70:

            score -= 10

            feedback.append(
                f"{hip.replace('_',' ').title()} mobility is limited."
            )

    # ---------------------------------------------
    # Elbows
    # ---------------------------------------------

    for elbow in ["left_elbow", "right_elbow"]:

        angle = joint_angles.get(elbow, 0)

        if angle < 40:

            score -= 5

            feedback.append(
                f"{elbow.replace('_',' ').title()} is too flexed."
            )

    # ---------------------------------------------
    # Prevent Negative Score
    # ---------------------------------------------

    score = max(score, 0)

    # ---------------------------------------------
    # Grade
    # ---------------------------------------------

    if score >= 90:

        grade = "Excellent"

    elif score >= 75:

        grade = "Good"

    elif score >= 60:

        grade = "Average"

    else:

        grade = "Poor"

    # ---------------------------------------------
    # Default Feedback
    # ---------------------------------------------

    if not feedback:

        feedback.append(
            "Movement pattern appears normal."
        )

    return {

        "score": score,

        "grade": grade,

        "feedback": feedback

    }


# ---------------------------------------------------------
# Stability Score
# ---------------------------------------------------------

def calculate_stability(symmetry):

    if not symmetry:

        return 0

    stable = 0

    total = len(symmetry)

    for joint in symmetry.values():

        if joint["status"] == "Symmetrical":

            stable += 1

    return round((stable / total) * 100, 2)


# ---------------------------------------------------------
# Balance Score
# ---------------------------------------------------------

def calculate_balance(trunk_lean):

    if trunk_lean < 5:

        return 100

    elif trunk_lean < 10:

        return 85

    elif trunk_lean < 15:

        return 70

    return 50


# ---------------------------------------------------------
# Overall Assessment
# ---------------------------------------------------------

def generate_quality_report(biomechanics):

    movement = calculate_movement_quality(

        biomechanics["joint_angles"]

    )

    stability = calculate_stability(

        biomechanics["symmetry"]

    )

    balance = calculate_balance(

        biomechanics["trunk_lean"]

    )

    return {

        "movement_score": movement["score"],

        "grade": movement["grade"],

        "feedback": movement["feedback"],

        "stability_score": stability,

        "balance_score": balance

    }