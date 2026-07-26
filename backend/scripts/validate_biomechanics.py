"""
Quick validation script — verifies all Milestone 2 biomechanical metrics
produce real output from mock joint coordinates (no video needed).
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.ml.biomechanics.analyzer import BiomechanicalAnalyzer
from app.ml.pose_estimation.engine import JointCoordinates

joints = JointCoordinates(
    left_shoulder=(0.35, 0.35, -0.05), right_shoulder=(0.65, 0.35, 0.05),
    left_elbow=(0.28, 0.55, -0.04),    right_elbow=(0.72, 0.55, 0.04),
    left_wrist=(0.22, 0.72, -0.02),    right_wrist=(0.78, 0.72, 0.02),
    left_index=(0.20, 0.78, -0.01),    right_index=(0.80, 0.78, 0.01),
    left_hip=(0.40, 0.60, -0.03),      right_hip=(0.60, 0.60, 0.03),
    left_knee=(0.38, 0.78, -0.02),     right_knee=(0.62, 0.78, 0.02),
    left_ankle=(0.36, 0.92, -0.01),    right_ankle=(0.64, 0.92, 0.01),
    left_foot_index=(0.34, 0.96, 0.0), right_foot_index=(0.66, 0.96, 0.0),
    nose=(0.50, 0.18, 0.0),
)

result = BiomechanicalAnalyzer().analyze(joints, frame_index=0)
a = result.angles
r = result.risk_flags

print("=" * 55)
print("  MILESTONE 2 — FULL BIOMECHANICS VALIDATION")
print("=" * 55)

checks = [
    ("L-Knee flexion",       a.left_knee),
    ("R-Knee flexion",       a.right_knee),
    ("L-Knee Valgus (FPPA)", a.left_knee_valgus),
    ("R-Knee Valgus (FPPA)", a.right_knee_valgus),
    ("L-Hip angle",          a.left_hip),
    ("R-Hip angle",          a.right_hip),
    ("L-Ankle angle",        a.left_ankle),
    ("R-Ankle angle",        a.right_ankle),
    ("L-Elbow angle",        a.left_elbow),
    ("R-Elbow angle",        a.right_elbow),
    ("L-Shoulder angle",     a.left_shoulder),
    ("R-Shoulder angle",     a.right_shoulder),
    ("L-Wrist angle",        a.left_wrist),
    ("R-Wrist angle",        a.right_wrist),
    ("Torso Rotation",       a.torso_rotation),
    ("Hip Rotation",         a.hip_rotation),
    ("Neck Angle",           a.neck_angle),
    ("Trunk Lean",           result.trunk_lean_deg),
    ("Balance Offset",       a.balance_offset),
    ("Stance Width",         a.stance_width),
    ("Knee Symmetry",        result.symmetry.knee),
    ("Overall Symmetry",     result.symmetry.overall),
]

all_pass = True
for name, val in checks:
    status = "OK" if val is not None else "MISSING"
    if val is None:
        all_pass = False
    unit = "" if name in ("Balance Offset", "Stance Width", "Knee Symmetry", "Overall Symmetry") else " deg"
    val_str = f"{val:.4f}{unit}" if val is not None else "None"
    print(f"  {'[OK]' if val is not None else '[!!]'}  {name:<28} {val_str}")

print()
print(f"  Risk Flags Active: {r.any_risk}")
flag_names = [k for k, v in vars(r).items() if not k.startswith("_") and v is True]
if flag_names:
    for f in flag_names:
        print(f"       - {f}")
print()
print("=" * 55)
if all_pass:
    print("  MILESTONE 2 COMPLETE - All metrics producing output!")
else:
    print("  WARNING: Some metrics returned None")
print("=" * 55)
