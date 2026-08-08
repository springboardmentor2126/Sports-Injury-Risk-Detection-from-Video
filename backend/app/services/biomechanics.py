from app.utils.angle import calculate_angle



# -----------------------------------
# Get landmark point
# -----------------------------------

def get_point(landmarks, index):

    return [
        landmarks[index]["x"],
        landmarks[index]["y"]
    ]



# -----------------------------------
# Knee Angle
# -----------------------------------

def calculate_knee_angle(landmarks):

    # Left leg
    left_hip = get_point(landmarks, 23)
    left_knee = get_point(landmarks, 25)
    left_ankle = get_point(landmarks, 27)


    # Right leg
    right_hip = get_point(landmarks, 24)
    right_knee = get_point(landmarks, 26)
    right_ankle = get_point(landmarks, 28)



    left_angle = calculate_angle(
        left_hip,
        left_knee,
        left_ankle
    )


    right_angle = calculate_angle(
        right_hip,
        right_knee,
        right_ankle
    )



    return {

        "left_knee_angle": left_angle,

        "right_knee_angle": right_angle

    }



# -----------------------------------
# Hip Angle
# -----------------------------------

def calculate_hip_angle(landmarks):

    shoulder = get_point(
        landmarks,
        11
    )

    hip = get_point(
        landmarks,
        23
    )

    knee = get_point(
        landmarks,
        25
    )


    angle = calculate_angle(
        shoulder,
        hip,
        knee
    )


    return {

        "hip_angle": angle

    }



# -----------------------------------
# Ankle Angle
# -----------------------------------

def calculate_ankle_angle(landmarks):

    knee = get_point(
        landmarks,
        25
    )


    ankle = get_point(
        landmarks,
        27
    )


    foot = get_point(
        landmarks,
        31
    )


    angle = calculate_angle(
        knee,
        ankle,
        foot
    )


    return {

        "ankle_angle": angle

    }



# -----------------------------------
# Shoulder Angle
# -----------------------------------

def calculate_shoulder_angle(landmarks):

    shoulder = get_point(
        landmarks,
        11
    )


    elbow = get_point(
        landmarks,
        13
    )


    wrist = get_point(
        landmarks,
        15
    )


    angle = calculate_angle(
        shoulder,
        elbow,
        wrist
    )


    return {

        "shoulder_angle": angle

    }



# -----------------------------------
# Complete Posture Analysis
# -----------------------------------

def analyze_posture(landmarks):

    result = {}


    result.update(
        calculate_knee_angle(
            landmarks
        )
    )


    result.update(
        calculate_hip_angle(
            landmarks
        )
    )


    result.update(
        calculate_ankle_angle(
            landmarks
        )
    )


    result.update(
        calculate_shoulder_angle(
            landmarks
        )
    )


    return result



# -----------------------------------
# Movement Risk Assessment
# -----------------------------------

def assess_movement_quality(analysis):

    risk_level = "Low"

    issues = []



    left_knee = analysis.get(
        "left_knee_angle",
        0
    )


    right_knee = analysis.get(
        "right_knee_angle",
        0
    )


    hip_angle = analysis.get(
        "hip_angle",
        0
    )



    # Knee analysis

    if left_knee < 90 or right_knee < 90:

        risk_level = "High"

        issues.append(
            "Poor knee alignment detected"
        )


    elif left_knee < 110 or right_knee < 110:

        risk_level = "Medium"

        issues.append(
            "Monitor knee posture"
        )



    # Hip analysis

    if hip_angle < 60:

        risk_level = "High"

        issues.append(
            "Improper hip posture"
        )



    return {


        "movement_quality":
            "Poor"
            if risk_level == "High"
            else "Average"
            if risk_level == "Medium"
            else "Good",


        "risk_level":
            risk_level,


        "issues":
            issues

    }



# -----------------------------------
# Generate Final Report
# -----------------------------------

def generate_biomechanics_report(
        analysis,
        movement_result
):


    return {


        "joint_analysis":
            analysis,


        "movement_quality":
            movement_result["movement_quality"],


        "risk_level":
            movement_result["risk_level"],


        "identified_issues":
            movement_result["issues"]

    }