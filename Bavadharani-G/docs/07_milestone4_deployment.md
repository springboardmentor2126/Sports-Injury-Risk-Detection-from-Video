# Milestone 4 — Analytics, Testing & Deployment

## What was built

| Task (from spec) | Implementation |
|---|---|
| Executive/athlete dashboards | `GET /dashboard/me` + React Dashboard page |
| Reports and visualization | Stat cards + a simple risk-trend bar chart across videos |
| Testing | Unit tests (biomechanics math, risk engine) + integration tests (full pipeline via FastAPI TestClient) |
| Docker containerization | `backend/Dockerfile` + `.dockerignore` |
| Documentation | This `docs/` folder |

## Dashboard endpoint

`GET /dashboard/me` returns, for the logged-in athlete:
- Total videos uploaded / videos successfully analyzed
- Average movement quality score across all analyzed videos
- Average overall injury risk score
- Latest risk category (Low / Moderate / High / Critical)
- Risk trend: overall risk score per video, oldest to newest (powers
  the bar chart on the Dashboard page)

## Deployment (Docker)

```bash
cd backend
docker build -t sports-injury-backend .
docker run -p 8000:8000 sports-injury-backend
```

The container installs the system libraries OpenCV needs (`libgl1`,
`libglib2.0-0`) since the `opencv-python-headless` package still needs
these present in a minimal Linux image.

**Note:** the pose detection model auto-downloads on first video
processing (see Milestone 2 docs) — the container needs outbound
internet access the first time a video is processed, same as running
locally.

## Scope note: what's simplified vs. the original spec

The original spec called for role-specific dashboards for Athlete,
Coach, Physiotherapist, Sports Scientist, and Admin, plus AWS/Azure
cloud deployment with CI/CD. This implementation provides:
- One dashboard (works for the Athlete role; Coach can already view
  any athlete's profile via the existing `/athletes/{user_id}`
  endpoint from Milestone 1 — extending that into a full team-overview
  dashboard is a clear, documented next step)
- Docker containerization (the actual portable deployment artifact)
  rather than a live cloud deployment, since that requires an AWS/Azure
  account and ongoing hosting costs not expected of a student project

This scoping mirrors the same reasoning applied in Milestone 1: same
architectural direction as the full spec, sized appropriately for a
solo 8-week project.

## Testing summary across all milestones

| Milestone | Test type | Result |
|---|---|---|
| 1 | Full API integration test (register/login/profile) | Passed |
| 2 | Unit tests on angle math (known geometric values) | Passed |
| 2 | API structure verification (Tasks API signatures) | Verified against installed package |
| 3 | Unit tests (clean/risky/missing-data scenarios) | Passed |
| 3+4 | Full integration test (report → risk → dashboard) | Passed |
