# Sports Biomechanics Datasets — Research Notes

| Dataset | Purpose | Link |
|---|---|---|
| **Human3.6M** | 3.6M pose images/videos with 3D joint annotations | http://vision.imar.ro/human3.6m/ |
| **MPII Human Pose** | 25K images, 40K annotated people, keypoints | http://human-pose.mpi-inf.mpg.de/ |
| **COCO Keypoints** | 250K+ people, 17 keypoints each — the format MediaPipe/YOLO-Pose are trained on | https://cocodataset.org/#keypoints-2020 |
| **SportsPose** | Sport-specific 3D movement capture | Published via research paper |
| **FIFA Injury Report** | Aggregate professional football injury trend data | Search "FIFA football injury report" for current edition |

## How these inform the actual implementation

- MediaPipe (used in Milestone 2) is a pre-trained model built on
  datasets like COCO — we don't train a pose model from scratch
  (that needs GPU clusters this project doesn't have)
- SportsPose and FIFA injury data inform the rule-based risk
  thresholds used in Milestone 3's risk engine (e.g. knee asymmetry
  and trunk lean thresholds are grounded in published sports-science
  patterns, not arbitrary numbers)
