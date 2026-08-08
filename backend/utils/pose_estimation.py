import cv2
import mediapipe as mp

# ---------------------------------------------------------
# MediaPipe Pose Initialization
# ---------------------------------------------------------

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    smooth_landmarks=True,
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)


# ---------------------------------------------------------
# Detect Pose
# ---------------------------------------------------------

def detect_pose(frame):
    """
    Detect pose landmarks from a frame.

    Parameters
    ----------
    frame : ndarray

    Returns
    -------
    results
    """

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = pose.process(rgb)

    return results


# ---------------------------------------------------------
# Draw Pose Skeleton
# ---------------------------------------------------------

def draw_pose(frame, results):
    """
    Draw skeleton on frame.
    """

    if results.pose_landmarks:

        mp_drawing.draw_landmarks(
            frame,
            results.pose_landmarks,
            mp_pose.POSE_CONNECTIONS,
            landmark_drawing_spec=mp_drawing.DrawingSpec(
                color=(0,255,0),
                thickness=2,
                circle_radius=2
            ),
            connection_drawing_spec=mp_drawing.DrawingSpec(
                color=(255,0,0),
                thickness=2
            )
        )

    return frame


# ---------------------------------------------------------
# Extract All Landmarks
# ---------------------------------------------------------

def extract_landmarks(results):
    """
    Returns all 33 landmarks.
    """

    if results.pose_landmarks is None:
        return []

    landmarks = []

    for landmark in results.pose_landmarks.landmark:

        landmarks.append({

            "x": landmark.x,

            "y": landmark.y,

            "z": landmark.z,

            "visibility": landmark.visibility

        })

    return landmarks


# ---------------------------------------------------------
# Important Joint Coordinates
# ---------------------------------------------------------

class JointPoint:
    def __init__(self, x, y, z, visibility):
        self.x = x
        self.y = y
        self.z = z
        self.visibility = visibility

    def to_dict(self):
        return {
            "x": self.x,
            "y": self.y,
            "z": self.z,
            "visibility": self.visibility
        }

def ensure_joint_objects(joints):
    if not joints:
        return {}
    obj_joints = {}
    for name, data in joints.items():
        if hasattr(data, "x") and hasattr(data, "y"):
            obj_joints[name] = data
        elif isinstance(data, dict):
            obj_joints[name] = JointPoint(
                x=data.get("x", 0.0),
                y=data.get("y", 0.0),
                z=data.get("z", 0.0),
                visibility=data.get("visibility", 0.0)
            )
    return obj_joints

# ---------------------------------------------------------
# Important Joint Coordinates
# ---------------------------------------------------------

def extract_joint_coordinates(results):
    """
    Extract important joints for biomechanics.
    """

    if results.pose_landmarks is None:
        return {}

    lm = results.pose_landmarks.landmark

    joints = {
        "NOSE": JointPoint(lm[0].x, lm[0].y, lm[0].z, lm[0].visibility),
        "LEFT_SHOULDER": JointPoint(lm[11].x, lm[11].y, lm[11].z, lm[11].visibility),
        "RIGHT_SHOULDER": JointPoint(lm[12].x, lm[12].y, lm[12].z, lm[12].visibility),
        "LEFT_ELBOW": JointPoint(lm[13].x, lm[13].y, lm[13].z, lm[13].visibility),
        "RIGHT_ELBOW": JointPoint(lm[14].x, lm[14].y, lm[14].z, lm[14].visibility),
        "LEFT_WRIST": JointPoint(lm[15].x, lm[15].y, lm[15].z, lm[15].visibility),
        "RIGHT_WRIST": JointPoint(lm[16].x, lm[16].y, lm[16].z, lm[16].visibility),
        "LEFT_HIP": JointPoint(lm[23].x, lm[23].y, lm[23].z, lm[23].visibility),
        "RIGHT_HIP": JointPoint(lm[24].x, lm[24].y, lm[24].z, lm[24].visibility),
        "LEFT_KNEE": JointPoint(lm[25].x, lm[25].y, lm[25].z, lm[25].visibility),
        "RIGHT_KNEE": JointPoint(lm[26].x, lm[26].y, lm[26].z, lm[26].visibility),
        "LEFT_ANKLE": JointPoint(lm[27].x, lm[27].y, lm[27].z, lm[27].visibility),
        "RIGHT_ANKLE": JointPoint(lm[28].x, lm[28].y, lm[28].z, lm[28].visibility)
    }

    return joints


# ---------------------------------------------------------
# Landmark Visibility
# ---------------------------------------------------------

def calculate_visibility(results):
    """
    Average landmark visibility score.
    """

    if results.pose_landmarks is None:
        return 0

    visibility = [

        landmark.visibility

        for landmark in results.pose_landmarks.landmark

    ]

    return round(sum(visibility)/len(visibility),2)