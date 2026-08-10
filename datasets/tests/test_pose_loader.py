"""
Quick smoke test for pose_dataset_loader.py against the synthetic sample.
Run: python tests/test_pose_loader.py   (from the datasets/ directory)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pose_dataset_loader import load_coco_keypoints, knee_angle, elbow_angle

SAMPLE = Path(__file__).resolve().parent.parent / "sample" / "sample_pose_annotations.json"


def main():
    people = load_coco_keypoints(SAMPLE)
    assert len(people) == 2, f"expected 2 annotated people, got {len(people)}"
    print(f"Loaded {len(people)} annotated people from {SAMPLE.name}")

    squat, standing = people

    squat_knee = knee_angle(squat["keypoints"], side="left")
    stand_knee = knee_angle(standing["keypoints"], side="left")

    print(f"  squat left knee angle:    {squat_knee:.1f} degrees")
    print(f"  standing left knee angle: {stand_knee:.1f} degrees")

    assert squat_knee < stand_knee, (
        "expected the squat pose to have a more bent (smaller angle) knee "
        "than the standing pose"
    )
    assert stand_knee > 150, "standing knee should be close to straight (~180)"
    assert squat_knee < 150, "squat knee should be clearly bent"

    elbow = elbow_angle(squat["keypoints"], side="left")
    print(f"  squat left elbow angle:   {elbow:.1f} degrees")

    print("\nAll checks passed -- loader + joint angle calculation work end-to-end.")


if __name__ == "__main__":
    main()
