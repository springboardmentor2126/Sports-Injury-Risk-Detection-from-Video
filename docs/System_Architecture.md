# System Architecture

## Overview

The AI Sports Injury Risk Detection System is designed as a modular web application that uses Computer Vision and Machine Learning to analyze sports videos and predict injury risk. The system consists of a React frontend, a FastAPI backend, PostgreSQL database, OpenCV and MediaPipe for pose estimation, and Machine Learning models for injury prediction.

---

## System Components

### 1. Frontend (React.js)

- User Registration & Login
- Athlete Dashboard
- Video Upload
- Injury Risk Report
- Recommendations Dashboard

---

### 2. Backend (FastAPI)

- REST API
- Authentication (JWT)
- Video Processing
- Pose Detection API
- Injury Prediction API
- Recommendation API

---

### 3. Database (PostgreSQL)

Stores:

- User Information
- Athlete Profile
- Uploaded Videos
- Injury Prediction Results
- Reports
- Activity Logs

---

### 4. Computer Vision Module

Technologies:

- OpenCV
- MediaPipe Pose

Functions:

- Video Frame Extraction
- Human Pose Detection
- Joint Landmark Detection

---

### 5. Biomechanical Analysis

Calculates:

- Joint Angles
- Knee Alignment
- Hip Stability
- Trunk Lean
- Balance
- Movement Quality

---

### 6. Machine Learning Module

Input:

- Extracted Biomechanical Features

Output:

- Injury Risk Prediction
- Risk Score

Algorithms (Planned):

- Random Forest
- XGBoost
- Support Vector Machine (SVM)

---

### 7. Recommendation Engine

Provides:

- Correct Posture Suggestions
- Mobility Exercises
- Strength Exercises
- Recovery Plan

---

### 8. Dashboard & Reports

Displays:

- Risk Score
- Injury Type
- Recommendation
- Previous Analysis History
- PDF Reports

---

## Architecture Flow

User

↓

React Frontend

↓

FastAPI Backend

↓

OpenCV + MediaPipe

↓

Feature Extraction

↓

Machine Learning Model

↓

Risk Prediction

↓

Recommendation Engine

↓

PostgreSQL Database

↓

Dashboard & Reports
