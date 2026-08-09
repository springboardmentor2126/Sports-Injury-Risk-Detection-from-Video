# System Architecture & Database Schema

## Architecture (modular monolith)

```
React Frontend
      |
      | HTTP + JWT
      v
FastAPI Backend (single service, modular)
  - routes/auth.py        (Milestone 1)
  - routes/athlete.py     (Milestone 1)
  - routes/video.py       (Milestone 2)
  - routes/risk.py        (Milestone 3)
  - routes/dashboard.py   (Milestone 4)
      |
      v
SQLite (dev) — swappable to PostgreSQL via one line in database.py
```

One FastAPI backend organized into clean modules gives the same
separation of concerns as "services" in the original enterprise spec,
without the overhead of deploying/managing many separate containers —
a legitimate, common pattern known as a modular monolith.

## Database Schema

```
users
  id, email, hashed_password, full_name, role

athlete_profiles
  id, user_id (FK -> users), sport_type, position, age,
  height_cm, weight_kg, injury_history, training_load

videos
  id, athlete_user_id (FK -> users), original_filename,
  stored_filename, activity_type, status, error_message,
  uploaded_at, processed_at

biomechanics_reports
  id, video_id (FK -> videos, unique), frames_analyzed,
  frames_with_person_detected, detection_rate,
  avg_left_knee_angle, avg_right_knee_angle, knee_angle_asymmetry,
  avg_trunk_lean_angle, avg_left_hip_angle, avg_right_hip_angle,
  movement_quality_score, notes, overlay_video_filename, created_at

injury_risk_assessments
  id, video_id (FK -> videos, unique), acl_risk, hamstring_risk,
  ankle_sprain_risk, lower_back_risk, overuse_risk,
  overall_risk_score, risk_category, top_risk_factors,
  recommendations, created_at
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router |
| Backend | FastAPI, SQLAlchemy |
| Database | SQLite (dev) |
| Auth | JWT (python-jose), bcrypt |
| Computer Vision | MediaPipe (Tasks API), OpenCV |
| Deployment | Docker |
