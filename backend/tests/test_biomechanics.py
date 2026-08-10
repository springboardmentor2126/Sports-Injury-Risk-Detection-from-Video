"""
test_biomechanics.py — verifies joint angle, trunk lean, symmetry, and
knee valgus proxy calculations against hand-built synthetic poses.

Run from the project root:
    python backend/tests/test_biomechanics.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.services.pose_utils import Point
from backend.app.services.biomechanics import analyze_frame, summarize, knee_valgus_proxy


def kp(overrides):
    base = {
        "left_shoulder": Point(150, 120, 2), "right_shoulder": Point(190, 120, 2),
        "left_hip": Point(155, 250, 2), "right_hip": Point(185, 250, 2),
        "left_knee": Point(156, 330, 2), "right_knee": Point(184, 330, 2),
        "left_ankle": Point(157, 420, 2), "right_ankle": Point(183, 420, 2),
        "left_elbow": Point(130, 180, 2), "right_elbow": Point(210, 180, 2),
        "left_wrist": Point(125, 240, 2), "right_wrist": Point(215, 240, 2),
    }
    base.update(overrides)
    return base


def main():
    # Frame 1: upright standing, symmetric
    standing = kp({})
    m1 = analyze_frame(1, standing)
    print("standing:", m1)
    assert m1.trunk_lean_deg < 5, "should be near-upright"
    assert m1.knee_symmetry_diff < 5, "standing should be near-symmetric"

    # Frame 2: squat with knee pushed forward (bent)
    squat = kp({
        "left_hip": Point(155, 250, 2),
        "left_knee": Point(200, 300, 2),
        "left_ankle": Point(160, 380, 2),
    })
    m2 = analyze_frame(2, squat)
    print("squat:", m2)
    assert m2.left_knee_angle < 150, "squat knee should be bent"
    assert m2.left_knee_angle < m1.left_knee_angle

    # Frame 3: forward trunk lean
    leaning = kp({
        "left_shoulder": Point(220, 130, 2), "right_shoulder": Point(260, 130, 2),
    })
    m3 = analyze_frame(3, leaning)
    print("leaning trunk_lean_deg:", m3.trunk_lean_deg)
    assert m3.trunk_lean_deg > m1.trunk_lean_deg

    # Frame 4: occluded knee -> should degrade gracefully, not crash
    occluded = kp({"left_knee": Point(0, 0, 0)})
    m4 = analyze_frame(4, occluded)
    print("occluded left_knee_angle (should be None):", m4.left_knee_angle)
    assert m4.left_knee_angle is None
    assert m4.right_knee_angle is not None, "right leg data should be unaffected"

    summary = summarize([m1, m2, m3, m4])
    print("\nsummary:", summary)
    assert summary["frames_analyzed"] == 4
    assert summary["frames_with_detection"] == 3  # frame 4 has no left knee angle
    assert "knee_rom_asymmetry" in summary
    assert "left_knee_rom" in summary and "right_knee_rom" in summary

    # --- Regression test: cyclical gait (running) must NOT be flagged as
    # falsely asymmetric just because the legs are out of phase at any
    # single instant. This is the bug that was fixed -- pin it here. ---
    import math

    def gait_kp(left_offset, right_offset):
        return kp({
            "left_knee": Point(156 + left_offset, 330, 2),
            "right_knee": Point(184 + right_offset, 330, 2),
        })

    running_frames = []
    for i in range(20):
        phase = i / 20 * 2 * math.pi
        left_offset = 40 * math.sin(phase)
        right_offset = 40 * math.sin(phase + math.pi)  # opposite phase, like real running
        running_frames.append(analyze_frame(i, gait_kp(left_offset, right_offset)))

    running_summary = summarize(running_frames)
    print("\nrunning gait summary:", running_summary)
    assert running_summary["knee_rom_asymmetry"] < 15, (
        "normal running gait (legs out of phase but equal ROM) must not be "
        "flagged as asymmetric -- this is the exact bug that was fixed"
    )
    print("running gait correctly NOT flagged as asymmetric: OK")

    limping_frames = []
    for i in range(20):
        phase = i / 20 * 2 * math.pi
        left_offset = 8 * math.sin(phase)   # restricted ROM (e.g. guarding an injury)
        right_offset = 40 * math.sin(phase + math.pi)
        limping_frames.append(analyze_frame(i, gait_kp(left_offset, right_offset)))

    limping_summary = summarize(limping_frames)
    print("limping summary:", limping_summary)
    assert limping_summary["knee_rom_asymmetry"] > 20, (
        "genuine ROM restriction on one side must still be correctly flagged"
    )
    print("genuine asymmetry (restricted ROM) still correctly detected: OK")

    # --- Regression test: knee_valgus_proxy must NOT report an
    # anatomically-impossible percentage (>100% of leg length) on a
    # bent-knee frame -- this is the bug a real running upload hit,
    # producing a "-129.5%" reading that inflated an athlete's injury
    # risk score off a math artifact, not a real movement signal.
    # Bending the knee brings hip and ankle physically closer together
    # in the 2D projection (foreshortening), which shrinks the
    # hip-to-ankle `leg_length` denominator even though the leg's
    # actual reach hasn't changed -- so the same offset that would be a
    # sane ~30% on a mostly-straight leg inflates past 100% once the
    # knee bends enough, exactly like running's swing phase does on
    # nearly every stride. ---
    bent_knee_kp = {
        "left_hip": Point(100, 100, 2),
        "left_knee": Point(160, 120, 2),
        "left_ankle": Point(110, 140, 2),
    }
    bent_knee_valgus = knee_valgus_proxy(bent_knee_kp, "left")
    print("bent-knee (foreshortened) valgus proxy:", bent_knee_valgus)
    assert bent_knee_valgus is None, (
        "a foreshortened bent-knee frame must return None (not measurable) "
        "instead of an inflated, anatomically-impossible percentage -- "
        "this is the exact bug that produced -129.5% on a real upload"
    )
    print("foreshortened bent-knee frame correctly returns None instead of a bogus percentage: OK")

    # A normal, mostly-vertical leg (squat/standing-like -- same shape as
    # the `squat` fixture earlier in this file) must be completely
    # unaffected by the fix and still return a sane, bounded percentage.
    normal_leg_kp = {
        "left_hip": Point(155, 250, 2),
        "left_knee": Point(200, 300, 2),
        "left_ankle": Point(160, 380, 2),
    }
    normal_valgus = knee_valgus_proxy(normal_leg_kp, "left")
    print("normal squat-like leg valgus proxy (should be unaffected):", normal_valgus)
    assert normal_valgus is not None and abs(normal_valgus) <= 100
    assert normal_valgus == 33.11, "unaffected case's exact value must not have shifted"
    print("normal squat-like pose is unaffected by the fix: OK")

    print("\nALL BIOMECHANICS TESTS PASSED")


if __name__ == "__main__":
    main()

