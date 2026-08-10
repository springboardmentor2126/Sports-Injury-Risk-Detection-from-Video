# Database Schema

## Overview

The AI Sports Injury Risk Detection System uses a PostgreSQL database to store user information, athlete profiles, uploaded videos, injury prediction results, recommendations, and reports.

---

# Database Tables

## 1. Users

| Field | Data Type |
|--------|-----------|
| id | UUID |
| full_name | VARCHAR |
| email | VARCHAR |
| password_hash | VARCHAR |
| role | VARCHAR |
| created_at | TIMESTAMP |

---

## 2. Athlete_Profile

| Field | Data Type |
|--------|-----------|
| athlete_id | UUID |
| user_id | UUID |
| age | INTEGER |
| gender | VARCHAR |
| sport | VARCHAR |
| height | FLOAT |
| weight | FLOAT |
| injury_history | TEXT |
| training_load | VARCHAR |

---

## 3. Uploaded_Videos

| Field | Data Type |
|--------|-----------|
| video_id | UUID |
| athlete_id | UUID |
| file_name | VARCHAR |
| upload_date | TIMESTAMP |
| video_path | TEXT |

---

## 4. Pose_Data

| Field | Data Type |
|--------|-----------|
| pose_id | UUID |
| video_id | UUID |
| frame_number | INTEGER |
| joint_coordinates | JSON |
| joint_angles | JSON |

---

## 5. Injury_Predictions

| Field | Data Type |
|--------|-----------|
| prediction_id | UUID |
| athlete_id | UUID |
| injury_type | VARCHAR |
| risk_score | FLOAT |
| risk_level | VARCHAR |
| prediction_date | TIMESTAMP |

---

## 6. Recommendations

| Field | Data Type |
|--------|-----------|
| recommendation_id | UUID |
| prediction_id | UUID |
| posture_correction | TEXT |
| exercise_plan | TEXT |
| recovery_plan | TEXT |

---

## 7. Reports

| Field | Data Type |
|--------|-----------|
| report_id | UUID |
| athlete_id | UUID |
| prediction_id | UUID |
| report_file | TEXT |
| generated_date | TIMESTAMP |

---

# Database Relationships

Users

↓

Athlete_Profile

↓

Uploaded_Videos

↓

Pose_Data

↓

Injury_Predictions

↓

Recommendations

↓

Reports

---

# Database Technology

- PostgreSQL
- JSON data type for storing pose landmarks
- UUID as Primary Key
- Foreign Key relationships between tables

---

# Future Enhancements

- Session History
- Coach Feedback
- Physiotherapist Notes
- Injury Recovery Tracking
- Performance Analytics
