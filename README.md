# 🏃 Sports Injury Risk Detection from Video

An AI-powered web application that analyzes athlete movement from uploaded sports videos to detect injury risks using computer vision, pose estimation, biomechanics analysis, and machine learning techniques.

---

# 📌 Project Overview

Sports injuries are one of the major challenges faced by athletes across different sports. This project assists athletes, coaches, physiotherapists, and sports scientists by providing an AI-based platform that analyzes body posture and movement patterns from uploaded videos to identify potential injury risks before they become severe.

The application combines **React**, **FastAPI**, **OpenCV**, and **MediaPipe Pose Estimation** to provide automated biomechanics analysis, pose tracking, injury risk prediction, processed skeleton videos, and downloadable injury assessment reports.

---

# 🎯 Objectives

- Detect athlete body posture from uploaded videos.
- Perform AI-based human pose estimation.
- Track body joint movements.
- Analyze biomechanics and movement quality.
- Predict potential injury risks.
- Generate injury analysis reports.
- Provide athlete profile management.
- Build a scalable sports analytics platform.

---

# 🚀 Milestone 1 Features

## ✅ Project Initialization

- Project setup
- Frontend and backend configuration
- GitHub repository management

## ✅ Authentication System

- User Registration
- User Login
- Role-based user interface

## ✅ Athlete Profile Management

- Athlete Information
- Sport Type
- Playing Position
- Age
- Height
- Weight
- Injury History
- Training Load

## ✅ Video Upload System

- Video Upload API
- Video Validation
- Video Processing
- Frame Extraction

## ✅ Pose Estimation

- MediaPipe Pose Integration
- Human Landmark Detection
- Joint Tracking

## ✅ Dataset Preparation

- Human3.6M
- MPII Human Pose
- COCO Keypoints
- SportsPose
- FIFA Injury Dataset (Reference)

---

# 🚀 Milestone 2 Features

## ✅ Skeleton Tracking

- Frame-by-frame pose landmark extraction
- Skeleton overlay generation
- Browser-compatible processed video generation

## ✅ Biomechanics Analysis

- Joint angle calculation
- Movement quality assessment
- Biomechanical deviation analysis

## ✅ Injury Risk Prediction

- Overall injury risk scoring
- Risk categorization
- Weighted injury risk factors
- Movement asymmetry detection

## ✅ Video Analysis

- Process uploaded sports videos
- Generate processed skeleton videos
- Detection rate calculation

## ✅ Injury Report Generation

- Athlete injury assessment
- Injury probability calculation
- Risk recommendations
- Downloadable PDF report generation

## ✅ Frontend Enhancements

- Updated Dashboard
- Enhanced Athlete Profile
- Improved Upload Workflow
- Results Visualization
- Processed Video Playback

---

# 🛠 Technology Stack

## Frontend

- React.js
- React Router
- Axios
- React Icons
- CSS3

## Backend

- FastAPI
- Python
- OpenCV
- MediaPipe
- Pydantic

## AI & Computer Vision

- MediaPipe Pose
- OpenCV
- Pose Estimation
- Biomechanics Analysis
- Injury Risk Engine

## Tools

- Git
- GitHub
- VS Code

---

# 📁 Project Structure

```text
sports-injury-risk-detection
│
├── frontend
│   ├── src
│   ├── public
│   └── package.json
│
├── backend
│   ├── utils
│   │   ├── biomechanics.py
│   │   ├── injury_risk_engine.py
│   │   ├── movement_quality.py
│   │   ├── pose_estimation.py
│   │   ├── report_generator.py
│   │   └── skeleton_tracking.py
│   ├── uploads
│   ├── processed_videos
│   ├── reports
│   ├── main.py
│   └── requirements.txt
│
├── database
├── datasets
├── docs
├── wireframes
└── README.md
```

---

# 🚀 How to Run

## Clone Repository

```bash
git clone https://github.com/VeeraNagaDurga/sports-injury-risk-detection.git
```

## Backend

```bash
cd backend

python -m venv .venv

.venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend runs at:

```
http://127.0.0.1:8000
```

---

## Frontend

```bash
cd frontend

npm install

npm start
```

Frontend runs at:

```
http://localhost:3000
```

---

# 📊 Current Progress

| Module | Status |
|---------|--------|
| Project Initialization | ✅ Completed |
| Authentication | ✅ Completed |
| Athlete Profile Management | ✅ Completed |
| Video Upload System | ✅ Completed |
| Pose Estimation | ✅ Completed |
| Skeleton Tracking | ✅ Completed |
| Biomechanics Analysis | ✅ Completed |
| Injury Risk Prediction | ✅ Completed |
| Processed Video Generation | ✅ Completed |
| PDF Report Generation | ✅ Completed |
| Results Dashboard | ✅ Completed |

---

# 🚀 Future Enhancements

- Real-time pose estimation
- Deep learning injury prediction models
- AI-powered recommendation system
- Performance analytics dashboard
- Coach dashboard
- Physiotherapist dashboard
- Sports scientist dashboard
- Multi-athlete comparison
- Cloud deployment
- Advanced biomechanics analytics

---

# 👩‍💻 Developed By

**Veera Naga Durga Garlanka**

**B.Tech – Computer Science and Engineering (AI & ML)**

**CMR College of Engineering & Technology**

---

# ⭐ Project Status

## ✅ Milestone 2 – Completed

This repository contains the implementation of **Milestone 1** and **Milestone 2** of the **Sports Injury Risk Detection from Video** project.

Implemented features include:

- Athlete Authentication
- Athlete Profile Management
- Video Upload & Processing
- AI-Based Pose Estimation
- Skeleton Tracking
- Biomechanics Analysis
- Injury Risk Prediction
- Processed Skeleton Video Generation
- Downloadable PDF Injury Report
- Interactive Results Dashboard

Future milestones will focus on advanced AI models, real-time pose estimation, cloud deployment, and sports performance analytics.

---

## 📄 License

This project was developed as part of the **Infosys Springboard Internship Program** for educational and research purposes.
