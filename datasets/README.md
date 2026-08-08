# 📦 Datasets — Sports Injury Risk Detection

This directory holds all biomechanics and pose estimation datasets used for training and evaluation.
Dataset files are **gitignored** (too large for GitHub). Use the download links below to set them up locally.

---

## 🗂️ Folder Structure

```
datasets/
├── human3.6m/          ← Human pose estimation & joint tracking
├── mpii/               ← Body keypoint detection & activity recognition
├── coco_keypoints/     ← Pose estimation training & motion analysis
├── sportspose/         ← Sports-specific movement & athlete posture
├── fifa_injury/        ← Injury trend analysis & risk factors (reference)
└── README.md           ← This file
```

---

## 📚 Dataset Details

### 1. Human3.6M Dataset
| Field | Info |
|-------|------|
| **Folder** | `datasets/human3.6m/` |
| **Purpose** | Human pose estimation, joint tracking, movement analysis |
| **Size** | ~30 GB |
| **Format** | Video + 3D joint annotations |
| **Download** | [http://vision.imar.ro/human3.6m](http://vision.imar.ro/human3.6m) |
| **Used In** | Milestone 2 — Pose Estimation Engine |

**What it contains:**
- 3.6 million video frames of 11 professional actors
- 17 different movement scenarios (walking, sitting, eating, etc.)
- 3D joint position annotations for 32 body joints
- Used to train pose estimation models from scratch or for fine-tuning

---

### 2. MPII Human Pose Dataset
| Field | Info |
|-------|------|
| **Folder** | `datasets/mpii/` |
| **Purpose** | Body keypoint detection, activity recognition |
| **Size** | ~12 GB |
| **Format** | Images + JSON annotations |
| **Download** | [http://human-pose.mpi-inf.mpg.de](http://human-pose.mpi-inf.mpg.de) |
| **Used In** | Milestone 2 — Skeleton tracking |

**What it contains:**
- 25,000 images with 40,000+ annotated people
- 16 body joint keypoints per person
- 410 different human activity categories
- Good for fine-tuning MediaPipe / MoveNet on sports activities

---

### 3. COCO Keypoints Dataset
| Field | Info |
|-------|------|
| **Folder** | `datasets/coco_keypoints/` |
| **Purpose** | Pose estimation training, human motion analysis |
| **Size** | ~20 GB |
| **Format** | Images + JSON annotations (COCO format) |
| **Download** | [https://cocodataset.org/#keypoints-2017](https://cocodataset.org/#keypoints-2017) |
| **Used In** | Milestone 2 — Multi-person pose detection |

**What it contains:**
- 200,000+ images with 250,000+ person instances
- 17 keypoints per person (nose, shoulders, elbows, wrists, hips, knees, ankles)
- Used as the base training set for most pose estimation models (YOLOv8-pose, MediaPipe)

---

### 4. SportsPose Dataset
| Field | Info |
|-------|------|
| **Folder** | `datasets/sportspose/` |
| **Purpose** | Sports-specific movement analysis, athlete posture assessment |
| **Size** | ~5 GB |
| **Format** | Video + 3D pose annotations |
| **Download** | [https://github.com/ChristianIngwersen/SportsPose](https://github.com/ChristianIngwersen/SportsPose) |
| **Used In** | Milestone 2 & 3 — Sports-specific biomechanical analysis |

**What it contains:**
- Multi-view sports footage with 3D pose ground truth
- Covers 8 sports disciplines
- Most relevant dataset for this project — athletes in real sports scenarios
- Includes jumping, running, throwing, and sport-specific movements

---

### 5. FIFA Injury Dataset *(Reference Only)*
| Field | Info |
|-------|------|
| **Folder** | `datasets/fifa_injury/` |
| **Purpose** | Injury trend analysis, risk factor modeling |
| **Size** | Small (CSV/Excel) |
| **Format** | Tabular data (CSV) |
| **Download** | [https://www.kaggle.com/datasets/search?q=football+injury](https://www.kaggle.com/datasets/search?q=football+injury) |
| **Used In** | Milestone 3 — Injury Risk Prediction Engine |

**What it contains:**
- Historical football injury records
- Injury type, body part, recovery time
- Player position and training load data
- Used to model injury risk factors alongside biomechanical data

---

## ⚙️ Setup Instructions (Milestone 2 onwards)

```bash
# 1. Download datasets manually from the links above

# 2. Place them in the correct subfolders:
#    datasets/human3.6m/
#    datasets/mpii/
#    datasets/coco_keypoints/
#    datasets/sportspose/
#    datasets/fifa_injury/

# 3. Verify structure
ls datasets/

# 4. Run preprocessing scripts (to be added in Milestone 2)
# python datasets/preprocess/prepare_human36m.py
# python datasets/preprocess/prepare_coco.py
```

> **Note:** All dataset folders are gitignored (`*.zip`, raw video/image files).
> Only this README and preprocessing scripts are tracked in git.

---

## 📊 Dataset Usage by Milestone

| Dataset | Milestone 1 | Milestone 2 | Milestone 3 | Milestone 4 |
|---------|-------------|-------------|-------------|-------------|
| Human3.6M | Documented ✅ | Training | Evaluation | — |
| MPII | Documented ✅ | Training | Evaluation | — |
| COCO Keypoints | Documented ✅ | Training | — | — |
| SportsPose | Documented ✅ | Primary Use | Risk Analysis | Demo |
| FIFA Injury | Documented ✅ | — | Primary Use | Reports |
