"""
analyzer.py — Full-Body Biomechanical Analyzer.

This class takes the raw JointCoordinates from the PoseEngine (Step 1)
and calculates all meaningful biomechanical metrics for that frame.

Architecture:
  PoseEngine.process_frame() → JointCoordinates → BiomechanicalAnalyzer.analyze() → BiomechanicsResult

The result is used by:
- service.py: to aggregate per-frame data into a video-level summary
- demo_pose.py: to display live angles on the screen
- video_router.py: to include biomechanics data in the HTTP JSON response
- XGBoost (Milestone 3): as input features for injury risk prediction
"""

from dataclasses import dataclass, field
from typing import Optional

from app.ml.biomechanics.math_utils import (
    calculate_angle_3d,
    calculate_symmetry,
    calculate_trunk_lean,
    calculate_rotation_deg,
    calculate_neck_angle,
    calculate_knee_valgus_deg,
    calculate_balance_offset,
    calculate_stance_width,
    midpoint,
)
from app.ml.pose_estimation.engine import JointCoordinates


# ─── Risk Thresholds ──────────────────────────────────────────────────────────
# These are clinically-informed thresholds. Angles crossing these values
# are flagged as potential injury risk signals.
# They will be passed to XGBoost in Milestone 3 as binary risk features.

RISK_THRESHOLDS = {
    # Knee: full extension is ~180°. Hyperextension (>185°) or sharp flexion
    # in a load-bearing position (<90°) are both ACL/meniscus risk signals.
    "knee_angle_min": 90.0,   # Below this under load → ACL stress
    "knee_angle_max": 175.0,  # Above this → hyperextension risk

    # Hip: very low hip angle during activity indicates poor mechanics
    "hip_angle_min": 70.0,

    # Elbow: hyperextension risk for throwing athletes
    "elbow_angle_max": 175.0,

    # Trunk lean: >25° forward lean is a lower-back stress indicator
    "trunk_lean_max": 25.0,

    # Wrist angle: used as risk threshold upper bound (boxing/wrestling)
    "wrist_angle_min": 140.0,   # Below this = excessive wrist flexion/impact risk
    # Torso rotation: >30° twist during movement = lower-back stress
    "torso_rotation_max": 30.0,
    # Neck angle: >20° head tilt = neck loading risk (boxing, wrestling)
    "neck_angle_max": 20.0,

    # Symmetry: below 0.75 (75%) means one side is compensating for the other
    "symmetry_min": 0.75,

    # Knee Valgus (Frontal Plane Projection Angle)
    # Healthy knee ≈ 180° in frontal plane.
    # < 165° = mild valgus (inward knee collapse) — ACL risk
    # < 150° = severe valgus — high ACL tear risk
    "knee_valgus_mild": 165.0,
    "knee_valgus_severe": 150.0,

    # Balance: lateral offset of CoM from BoS center
    # > 0.07 = significant instability / poor hip stability
    "balance_offset_max": 0.07,
}


@dataclass
class JointAngles:
    """All calculated joint angles for one video frame."""
    # Lower Body
    left_knee:  Optional[float] = None   # Hip → Knee → Ankle
    right_knee: Optional[float] = None
    left_hip:   Optional[float] = None   # Shoulder → Hip → Knee
    right_hip:  Optional[float] = None
    left_ankle: Optional[float] = None   # Knee → Ankle → Foot Index
    right_ankle: Optional[float] = None

    # Upper Body
    left_elbow:    Optional[float] = None   # Shoulder → Elbow → Wrist
    right_elbow:   Optional[float] = None
    left_shoulder: Optional[float] = None   # Hip → Shoulder → Elbow
    right_shoulder: Optional[float] = None

    # Wrist angles (boxing, baseball, tennis, wrestling)
    left_wrist:  Optional[float] = None    # Elbow → Wrist → Index finger
    right_wrist: Optional[float] = None

    # Rotations (boxing punch mechanics, wrestling torque)
    torso_rotation: Optional[float] = None  # Twist angle of shoulder plane
    hip_rotation:   Optional[float] = None  # Twist angle of hip plane

    # Neck angle (boxing head position, wrestling holds)
    neck_angle: Optional[float] = None

    # ── PDF Milestone 2 Metrics ──────────────────────────────────────────
    # Knee Valgus: Frontal Plane Projection Angle (FPPA)
    # Different from knee flexion — measures inward/outward collapse, not bend
    left_knee_valgus:  Optional[float] = None   # FPPA < 165° = valgus risk
    right_knee_valgus: Optional[float] = None

    # Balance: lateral displacement of center of mass from base of support
    balance_offset: Optional[float] = None      # > 0.07 = instability risk

    # Stride / Stance Width: horizontal distance between ankles
    stance_width: Optional[float] = None        # Normalized (0-1 of frame width)


@dataclass
class SymmetryScores:
    """Left-vs-Right symmetry for each pair of joints. 1.0 = perfect symmetry."""
    knee:     Optional[float] = None   # Compares left vs right knee angle
    hip:      Optional[float] = None
    ankle:    Optional[float] = None
    elbow:    Optional[float] = None
    shoulder: Optional[float] = None
    overall:  Optional[float] = None   # Average of all symmetry scores


@dataclass
class RiskFlags:
    """
    Boolean flags raised when a measurement crosses a clinical risk threshold.
    These will be used as binary features for XGBoost in Milestone 3.
    """
    knee_hyperextension:  bool = False
    knee_acute_flexion:   bool = False
    hip_angle_low:        bool = False
    elbow_hyperextension: bool = False
    trunk_lean_excessive: bool = False
    low_symmetry:         bool = False
    # New — boxing / wrestling specific
    wrist_acute_flexion:    bool = False  # Wrist bent too sharply on impact
    torso_rotation_excess:  bool = False  # Dangerous rotational torque
    neck_tilt_excessive:    bool = False  # Head position risk
    # PDF Milestone 2 risk flags
    knee_valgus_mild:       bool = False  # FPPA < 165° — inward knee collapse
    knee_valgus_severe:     bool = False  # FPPA < 150° — high ACL risk
    balance_unstable:       bool = False  # CoM too far from BoS

    @property
    def any_risk(self) -> bool:
        """True if any risk flag is raised."""
        return any([
            self.knee_hyperextension,
            self.knee_acute_flexion,
            self.hip_angle_low,
            self.elbow_hyperextension,
            self.trunk_lean_excessive,
            self.low_symmetry,
            self.wrist_acute_flexion,
            self.torso_rotation_excess,
            self.neck_tilt_excessive,
            self.knee_valgus_mild,
            self.knee_valgus_severe,
            self.balance_unstable,
        ])


@dataclass
class BiomechanicsResult:
    """
    The complete biomechanical analysis of a single video frame.
    This is passed from the analyzer to the service layer, the demo overlay,
    and eventually to XGBoost as a structured feature vector.
    """
    frame_index:    int
    angles:         JointAngles = field(default_factory=JointAngles)
    symmetry:       SymmetryScores = field(default_factory=SymmetryScores)
    trunk_lean_deg: Optional[float] = None
    risk_flags:     RiskFlags = field(default_factory=RiskFlags)


class BiomechanicalAnalyzer:
    """
    Full-Body Biomechanical Analyzer.

    Usage:
        analyzer = BiomechanicalAnalyzer()
        result = analyzer.analyze(joints, frame_index=42)
    """

    def analyze(
        self,
        joints: JointCoordinates,
        frame_index: int = 0,
    ) -> Optional[BiomechanicsResult]:
        """
        Run the full biomechanical analysis on one frame's joint coordinates.

        Calculates whatever angles are possible based on visible joints.
        Returns a BiomechanicsResult with all available angles, symmetry, and risk flags.
        """
        result = BiomechanicsResult(frame_index=frame_index)

        # ── Lower Body Angles ─────────────────────────────────────────────
        if joints.left_hip and joints.left_knee and joints.left_ankle:
            result.angles.left_knee = calculate_angle_3d(
                joints.left_hip, joints.left_knee, joints.left_ankle
            )
        if joints.right_hip and joints.right_knee and joints.right_ankle:
            result.angles.right_knee = calculate_angle_3d(
                joints.right_hip, joints.right_knee, joints.right_ankle
            )
        if joints.left_shoulder and joints.left_hip and joints.left_knee:
            result.angles.left_hip = calculate_angle_3d(
                joints.left_shoulder, joints.left_hip, joints.left_knee
            )
        if joints.right_shoulder and joints.right_hip and joints.right_knee:
            result.angles.right_hip = calculate_angle_3d(
                joints.right_shoulder, joints.right_hip, joints.right_knee
            )
        if joints.left_knee and joints.left_ankle and joints.left_foot_index:
            result.angles.left_ankle = calculate_angle_3d(
                joints.left_knee, joints.left_ankle, joints.left_foot_index
            )
        if joints.right_knee and joints.right_ankle and joints.right_foot_index:
            result.angles.right_ankle = calculate_angle_3d(
                joints.right_knee, joints.right_ankle, joints.right_foot_index
            )

        # ── Upper Body Angles ─────────────────────────────────────────────
        if joints.left_shoulder and joints.left_elbow and joints.left_wrist:
            result.angles.left_elbow = calculate_angle_3d(
                joints.left_shoulder, joints.left_elbow, joints.left_wrist
            )
            result.angles.left_shoulder = calculate_angle_3d(
                joints.left_hip, joints.left_shoulder, joints.left_elbow
            ) if joints.left_hip else None

        if joints.right_shoulder and joints.right_elbow and joints.right_wrist:
            result.angles.right_elbow = calculate_angle_3d(
                joints.right_shoulder, joints.right_elbow, joints.right_wrist
            )
            result.angles.right_shoulder = calculate_angle_3d(
                joints.right_hip, joints.right_shoulder, joints.right_elbow
            ) if joints.right_hip else None

        # ── Trunk / Spine Lean ────────────────────────────────────────────
        if all([joints.left_shoulder, joints.right_shoulder, joints.left_hip, joints.right_hip]):
            shoulder_mid = midpoint(joints.left_shoulder, joints.right_shoulder)
            hip_mid = midpoint(joints.left_hip, joints.right_hip)
            result.trunk_lean_deg = calculate_trunk_lean(shoulder_mid, hip_mid)

        # ── Symmetry Scores ───────────────────────────────────────────────
        if result.angles.left_knee and result.angles.right_knee:
            result.symmetry.knee = calculate_symmetry(
                result.angles.left_knee, result.angles.right_knee
            )
        if result.angles.left_hip and result.angles.right_hip:
            result.symmetry.hip = calculate_symmetry(
                result.angles.left_hip, result.angles.right_hip
            )
        if result.angles.left_ankle and result.angles.right_ankle:
            result.symmetry.ankle = calculate_symmetry(
                result.angles.left_ankle, result.angles.right_ankle
            )
        if result.angles.left_elbow and result.angles.right_elbow:
            result.symmetry.elbow = calculate_symmetry(
                result.angles.left_elbow, result.angles.right_elbow
            )
        if result.angles.left_shoulder and result.angles.right_shoulder:
            result.symmetry.shoulder = calculate_symmetry(
                result.angles.left_shoulder, result.angles.right_shoulder
            )

        # Overall symmetry = average of all available scores
        available = [s for s in [
            result.symmetry.knee, result.symmetry.hip, result.symmetry.ankle,
            result.symmetry.elbow, result.symmetry.shoulder,
        ] if s is not None]
        result.symmetry.overall = round(sum(available) / len(available), 4) if available else None

        # ── Wrist Angles (boxing, throwing, wrestling) ────────────────────
        if joints.left_wrist and joints.left_elbow and joints.left_index:
            result.angles.left_wrist = calculate_angle_3d(
                joints.left_elbow, joints.left_wrist, joints.left_index
            )
        if joints.right_wrist and joints.right_elbow and joints.right_index:
            result.angles.right_wrist = calculate_angle_3d(
                joints.right_elbow, joints.right_wrist, joints.right_index
            )

        # ── Torso & Hip Rotation (boxing punch mechanics, wrestling torque) ──
        if joints.left_shoulder and joints.right_shoulder:
            result.angles.torso_rotation = calculate_rotation_deg(
                joints.left_shoulder, joints.right_shoulder
            )
        if joints.left_hip and joints.right_hip:
            result.angles.hip_rotation = calculate_rotation_deg(
                joints.left_hip, joints.right_hip
            )

        # ── Neck Angle (boxing head position, wrestling holds) ────────────
        if joints.nose and joints.left_shoulder and joints.right_shoulder:
            result.angles.neck_angle = calculate_neck_angle(
                joints.nose, joints.left_shoulder, joints.right_shoulder
            )

        # ── Risk Flags ────────────────────────────────────────────────────
        t = RISK_THRESHOLDS

        if result.angles.left_knee and result.angles.right_knee:
            min_knee = min(result.angles.left_knee, result.angles.right_knee)
            max_knee = max(result.angles.left_knee, result.angles.right_knee)
            result.risk_flags.knee_acute_flexion = min_knee < t["knee_angle_min"]
            result.risk_flags.knee_hyperextension = max_knee > t["knee_angle_max"]

        if result.angles.left_hip and result.angles.right_hip:
            result.risk_flags.hip_angle_low = (
                min(result.angles.left_hip, result.angles.right_hip) < t["hip_angle_min"]
            )

        if result.angles.left_elbow and result.angles.right_elbow:
            result.risk_flags.elbow_hyperextension = (
                max(result.angles.left_elbow, result.angles.right_elbow) > t["elbow_angle_max"]
            )

        if result.trunk_lean_deg is not None:
            result.risk_flags.trunk_lean_excessive = result.trunk_lean_deg > t["trunk_lean_max"]

        if result.symmetry.overall is not None:
            result.risk_flags.low_symmetry = result.symmetry.overall < t["symmetry_min"]

        # New risk flags — boxing / wrestling
        if result.angles.left_wrist and result.angles.right_wrist:
            result.risk_flags.wrist_acute_flexion = (
                min(result.angles.left_wrist, result.angles.right_wrist) < t["wrist_angle_min"]
            )

        if result.angles.torso_rotation is not None:
            result.risk_flags.torso_rotation_excess = (
                abs(result.angles.torso_rotation) > t["torso_rotation_max"]
            )

        if result.angles.neck_angle is not None:
            result.risk_flags.neck_tilt_excessive = (
                result.angles.neck_angle > t["neck_angle_max"]
            )

        # ── Knee Valgus / FPPA (PDF Milestone 2 Metric) ──────────────────
        # Uses frontal plane (X, Y only) — completely different from knee flexion
        if joints.left_hip and joints.left_knee and joints.left_ankle:
            result.angles.left_knee_valgus = calculate_knee_valgus_deg(
                joints.left_hip, joints.left_knee, joints.left_ankle
            )
        if joints.right_hip and joints.right_knee and joints.right_ankle:
            result.angles.right_knee_valgus = calculate_knee_valgus_deg(
                joints.right_hip, joints.right_knee, joints.right_ankle
            )

        # Valgus risk flags — evaluate once both sides are calculated
        for valgus_val in [result.angles.left_knee_valgus, result.angles.right_knee_valgus]:
            if valgus_val is not None:
                if valgus_val < t["knee_valgus_severe"]:
                    result.risk_flags.knee_valgus_severe = True
                    result.risk_flags.knee_valgus_mild = True
                elif valgus_val < t["knee_valgus_mild"]:
                    result.risk_flags.knee_valgus_mild = True

        # ── Balance Offset / Hip Stability (PDF Milestone 2 Metric) ──────
        if all([joints.left_hip, joints.right_hip, joints.left_ankle, joints.right_ankle]):
            result.angles.balance_offset = calculate_balance_offset(
                joints.left_hip, joints.right_hip,
                joints.left_ankle, joints.right_ankle
            )
            result.risk_flags.balance_unstable = (
                result.angles.balance_offset > t["balance_offset_max"]
            )

        # ── Stance Width / Stride Length (PDF Milestone 2 Metric) ────────
        if joints.left_ankle and joints.right_ankle:
            result.angles.stance_width = calculate_stance_width(
                joints.left_ankle, joints.right_ankle
            )

        return result
