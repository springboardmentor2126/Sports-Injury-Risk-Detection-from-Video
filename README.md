# 🏃 AI Sports Injury Risk Detection

AI-powered platform that analyzes athlete movement videos to estimate pose,
compute biomechanical metrics, and (eventually) predict injury risk.

---

## ✅ Milestone 1 — Project Initialization & Core Setup (COMPLETE)

- ✅ System architecture & database schema (7 tables: `users`, `athlete_profiles`,
  `uploaded_videos`, `pose_data`, `injury_predictions`, `recommendations`, `reports`)
- ✅ Authentication — JWT + bcrypt password hashing, register/login/`/auth/me`
- ✅ Role-Based Access Control — `athlete`, `coach`, `physiotherapist`,
  `sports_scientist`, `admin`, enforced on every protected route
- ✅ Athlete Profile Management — full CRUD, self-service `/athletes/me`,
  staff roster view at `/athletes/`
- ✅ Frontend — React + TypeScript + Vite + Tailwind CSS v4, connected to the
  real backend (not mocked)
- ✅ Datasets — COCO Keypoints & MPII Human Pose scripted (open, no
  registration); Human3.6M & SportsPose flagged as registration-gated with
  clear steps; working COCO-format pose loader + joint-angle calculator,
  tested against a synthetic sample

## ✅ Milestone 2 — Pose Estimation & Biomechanical Analysis (COMPLETE)

- ✅ Pose Estimation Engine — MediaPipe `PoseLandmarker` (Tasks API), 33
  landmarks mapped down to the 17-point COCO layout used throughout the DB
  schema and datasets loader
- ✅ Video Upload & Processing — validated upload, evenly-sampled frame
  extraction (bounded per-video for synchronous processing), stored per-video
  status (`uploaded` → `processing` → `completed`/`failed`)
- ✅ Biomechanical Analysis — knee/elbow/hip joint angles, trunk lean, knee
  valgus proxy (explicitly labeled as a 2D single-camera estimate, not a
  clinical measurement)
- ✅ Movement symmetry — compares each leg's range of motion (ROM) over the
  whole clip, not a same-instant left/right snapshot. (Earlier version
  compared legs frame-by-frame, which flagged normal running gait as
  falsely "asymmetric" since legs are supposed to be out of phase mid-stride;
  fixed and pinned with a regression test.)
- ✅ Annotated video — skeleton overlay + knee-angle readouts burned into a
  real, browser-playable H.264 video (re-encoded via ffmpeg; OpenCV's native
  `mp4v` output isn't reliably browser-playable)
- ✅ Video management — upload, list, view detail/frames, view annotated
  video, delete (with ownership checks — a coach can view any athlete's
  video but only the owning athlete or an admin can delete one)

**Known limitations (by design, not oversights):**
- Processing is synchronous (blocks the upload request) — fine for short
  test clips, but real production use should move this to a background job
  (the architecture doc's Redis/queue component exists for this reason)
- Annotated video is built from the sampled frames pose estimation already
  analyzed (up to 60, evenly spaced), not a frame-exact replay of the
  original upload
- Knee valgus proxy needs a frontal-view camera or 3D pose for a real
  clinical reading — from a single arbitrary-angle 2D video it's directional
  only

## ⏳ Milestone 3 — Injury Risk Prediction & Recommendations (NOT STARTED)

- ⬜ Injury risk prediction engine (combine biomechanics + training load +
  injury history into an actual risk score)
- ⬜ Risk scoring (Low / Moderate / High / Critical)
- ⬜ Movement anomaly detection
- ⬜ Corrective recommendation engine
- ⬜ Athlete intelligence dashboards — the Dashboard's "Injury risk score"
  widget currently shows "no data yet" on purpose; it's wired up and ready,
  just waiting on this engine

## ⏳ Milestone 4 — Analytics, Testing & Deployment (NOT STARTED)

- ⬜ Executive dashboards, reports & PDF/Excel export ("Reports History" is
  currently a placeholder for this)
- ⬜ Docker containerization & cloud deployment (AWS/Azure)
- ⬜ Final documentation & user guides

---

## Tech Stack

**Backend:** Python, FastAPI, PostgreSQL, SQLAlchemy, JWT (`python-jose`),
`passlib`/`bcrypt`
**Computer Vision:** MediaPipe (Tasks API), OpenCV
**Frontend:** React, TypeScript, Vite, Tailwind CSS v4
**Video:** ffmpeg (required — see setup below)

## Setup

```bash
# Backend
python3.11 -m venv .venv   # or 3.12 -- NOT 3.14, mediapipe doesn't support it yet
source .venv/bin/activate
pip install -r requirements.txt
python models/download_pose_model.py   # one-time, ~9MB pose model
brew install ffmpeg                     # required for browser-playable annotated video
uvicorn backend.app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Running the tests

```bash
python backend/tests/test_pose_mapping.py
python backend/tests/test_video_processing.py
python backend/tests/test_biomechanics.py
python backend/tests/test_annotation.py
pip install httpx   # test-only dependency
python backend/tests/test_upload_flow.py
python backend/tests/test_annotated_upload_flow.py
python backend/tests/test_delete_video.py
cd datasets && python tests/test_pose_loader.py
```

All of the above should print "ALL ... TESTS PASSED".

## Project Structure

```
AI-Sports-Injury-Risk-Detection/
├── backend/
│   ├── app/
│   │   ├── routers/       # auth, athlete, video
│   │   ├── services/      # pose_estimation, biomechanics, video_processing, annotation
│   │   ├── models.py      # SQLAlchemy models (7 tables)
│   │   ├── schemas.py     # Pydantic request/response models
│   │   ├── crud.py
│   │   ├── auth.py        # JWT + password hashing
│   │   ├── database.py
│   │   └── main.py
│   ├── tests/
│   └── uploads/            # uploaded + annotated videos, per-athlete subfolders
├── datasets/                # COCO/MPII download scripts, pose loader, synthetic sample
├── frontend/
│   └── src/
│       ├── pages/           # Login, Register, Dashboard, AthleteProfile, VideoUpload, Reports
│       ├── components/      # Sidebar, Layout, RiskGauge, ProtectedRoute
│       ├── context/         # AuthContext
│       └── lib/             # api client
├── models/                  # downloaded pose_landmarker_lite.task lives here
└── docs/                    # original planning docs
```
