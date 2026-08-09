# Sports Injury Risk Detection from Video

An AI-powered platform that analyzes athlete movement videos to identify
biomechanical risk patterns and predict potential injuries — built as a
solo student project, scoped down from a full enterprise spec into
achievable milestones.

## Milestone Status

- [x] **Milestone 1 (Week 1-2): Project Initialization & Core Setup**
- [x] **Milestone 2 (Week 3-4): Pose Estimation & Biomechanical Analysis**
- [x] **Milestone 3 (Week 5-6): Injury Prediction & Recommendations**
- [x] **Milestone 4 (Week 7-8): Analytics, Testing & Deployment**

See `docs/` for full details on each milestone.

## What's implemented

- **Auth & profiles**: JWT login, Athlete/Coach roles, athlete profile CRUD
- **Pose estimation**: MediaPipe-based skeleton detection on uploaded videos, with joint angle & symmetry analysis
- **Injury risk prediction**: Rule-based, explainable risk scoring across 5 injury categories (ACL, hamstring, ankle sprain, lower back, overuse), with corrective recommendations
- **Dashboard**: Aggregate stats and a risk trend chart across all of an athlete's videos
- **Deployment**: Dockerized backend

## Project Structure

```
sports-injury-app/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── models/       users, athlete_profiles, videos, biomechanics_reports, injury_risk_assessments
│       ├── schemas/      Pydantic request/response models
│       ├── routes/       auth, athlete, video, risk, dashboard
│       ├── services/     biomechanics math, pose engine, risk engine, model downloader
│       └── utils/        password hashing, JWT, auth dependencies
├── frontend/
│   └── src/
│       ├── pages/         Login, Register, Profile, Videos, Dashboard
│       └── context/       Auth state
└── docs/                  Full documentation per milestone
```

## Running Locally

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
# If uvicorn.exe is blocked by a security policy, use:
# python -m uvicorn app.main:app --reload
```
API docs at `http://localhost:8000/docs`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App at `http://localhost:5173`.

### Docker (backend only)
```bash
cd backend
docker build -t sports-injury-backend .
docker run -p 8000:8000 sports-injury-backend
```

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React, React Router |
| Backend | FastAPI, SQLAlchemy |
| Database | SQLite (dev) |
| Auth | JWT (python-jose), bcrypt |
| Computer Vision | MediaPipe (Tasks API), OpenCV |
| Deployment | Docker |

## Author

Bavadharani G — B.Tech CSBS, R.M.D Engineering College
