# Sports Injury Risk Detection from Video

## Project Description

Sports Injury Risk Detection from Video is an AI-based web application that analyzes athlete movements from videos to identify potential injury risks.

The system uses computer vision techniques and pose estimation to detect human body landmarks, analyze biomechanics, evaluate movement quality, and generate an injury risk assessment report.

---

# Milestone 2: Pose Estimation & Biomechanical Analysis

## Objectives

The main objective of Milestone 2 is to implement an AI-based movement analysis pipeline.

Completed tasks:

- Implement pose estimation engine
- Build skeleton tracking workflow
- Extract body landmarks from videos
- Develop biomechanical analysis modules
- Calculate joint angles
- Analyze movement quality
- Generate biomechanics reports

---

# Implemented Features

## 1. Video Upload System

The system accepts athlete movement videos through FastAPI API.

Workflow:

```
Athlete Video
       |
       ↓
Video Upload API
```

---

## 2. Pose Estimation Engine

Implemented using:

- MediaPipe Pose
- OpenCV

The system processes video frames and detects human body landmarks.

Detected landmarks include:

- Shoulder
- Hip
- Knee
- Ankle
- Other body key points

Workflow:

```
Video Frame
       |
       ↓
Pose Detection
       |
       ↓
Landmark Extraction
```

---

## 3. Skeleton Tracking

The system tracks athlete movement frame-by-frame.

Implemented:

- Human pose tracking
- Landmark extraction
- Movement data collection

---

## 4. Biomechanical Analysis

The system performs biomechanical calculations using extracted landmarks.

Implemented calculations:

### Knee Angle Analysis

- Left knee angle
- Right knee angle

### Hip Angle Analysis

- Hip joint angle

These values are used to understand athlete posture and movement patterns.

---

## 5. Movement Quality Assessment

The system evaluates movement quality and assigns an injury risk score.

Risk classification:

| Risk Score | Risk Level |
|------------|------------|
| 0 - 30 | Low Risk |
| 30 - 70 | Medium Risk |
| 70+ | High Risk |

The assessment provides:

- Risk score
- Risk level
- Training recommendation

---

## 6. Biomechanics Report Generation

The complete analysis pipeline:

```
Video Upload
       |
       ↓
Pose Detection
       |
       ↓
Landmark Extraction
       |
       ↓
Angle Calculation
       |
       ↓
Movement Assessment
       |
       ↓
Risk Evaluation
       |
       ↓
Final Biomechanics Report
```

---

# Technology Stack

## Backend

- Python
- FastAPI
- Uvicorn

## Computer Vision

- OpenCV
- MediaPipe Pose

## Database

- PostgreSQL

## Data Validation

- Pydantic

## Development Tools

- Git
- GitHub
- Visual Studio Code

---

# Project Structure

```
Sports_injury_risk_detection

│
├── backend
│   │
│   ├── app
│   │   │
│   │   ├── database
│   │   │
│   │   ├── routes
│   │   │     ├── user_routes.py
│   │   │     └── video_routes.py
│   │   │
│   │   ├── schemas
│   │   │
│   │   ├── services
│   │   │     ├── pose.py
│   │   │     ├── tracker.py
│   │   │     ├── biomechanics.py
│   │   │     ├── assessment.py
│   │   │     └── report.py
│   │   │
│   │   └── utils
│   │
│   ├── main.py
│   └── requirements.txt
│
├── frontend
│
├── datasets
│
├── diagrams
│
└── README.md
```

---

# API Documentation

## Upload Athlete Video

### Endpoint

```
POST /video/upload
```

### Request Format

```
multipart/form-data
```

Parameter:

```
file : video file (.mp4)
```

---

# Sample Response

Example:

```json
{
  "athlete": "Athlete",
  "biomechanics": {
    "left_knee_angle": 144.92,
    "right_knee_angle": 152.28,
    "hip_angle": 151.70
  },
  "assessment": {
    "risk_score": 0,
    "risk_level": "Low Risk"
  },
  "recommendation": "Movement quality is good. Continue normal training."
}
```

---

# Running the Project

## Backend Setup

Navigate to backend:

```bash
cd backend
```

Activate virtual environment:

Windows PowerShell:

```powershell
.\venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run FastAPI server:

```bash
python -m uvicorn main:app --reload
```

Server URL:

```
http://127.0.0.1:8000
```

Swagger API Documentation:

```
http://127.0.0.1:8000/docs
```

---

# Milestone 2 Outcome

Completed successfully:

✅ Pose estimation engine operational  
✅ Skeleton tracking workflow implemented  
✅ Landmark extraction completed  
✅ Biomechanical analysis module developed  
✅ Knee and hip angle calculation implemented  
✅ Movement quality assessment completed  
✅ Injury risk scoring implemented  
✅ Biomechanics report generation completed  

---

# Future Enhancements

- Real-time webcam based injury detection
- Machine learning injury prediction model
- Athlete performance dashboard
- More biomechanical parameters
- Historical injury analysis
- Frontend visualization dashboard

---

# Author

**Payal Jadhav**

Project: Sports Injury Risk Detection from Video