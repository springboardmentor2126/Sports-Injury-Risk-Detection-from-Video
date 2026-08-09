# Project Objectives & Full Workflow

## Objective

Build a system that analyzes athlete movement videos to detect body
posture, identify biomechanical risk patterns, estimate injury risk,
and recommend corrective actions.

## End-to-End Workflow

```
1. UPLOAD        Athlete uploads an mp4 video
2. VALIDATE      Backend checks file type, size
3. PROCESS       Extract frames, run pose estimation
4. POSE ESTIMATE MediaPipe -> 33 body keypoints per frame
5. ANALYZE       Calculate joint angles, symmetry, trunk lean
6. RISK SCORE    Rule-based injury risk scoring per category
7. REPORT        Skeleton overlay + risk scores + recommendations
8. DASHBOARD     Trends across all of an athlete's videos
```

## Milestone Breakdown

| Milestone | Weeks | What it covers |
|---|---|---|
| 1 | 1-2 | Auth, athlete profiles, architecture, docs |
| 2 | 3-4 | Pose estimation, biomechanical analysis |
| 3 | 5-6 | Injury risk prediction, recommendations |
| 4 | 7-8 | Dashboard, analytics, Docker deployment |

## Roles

| Role | Can do |
|---|---|
| Athlete | Register, log in, manage profile, upload/analyze videos |
| Coach | Register, log in, view any athlete's profile |

## Scope note

The original spec described an enterprise system (microservices, 5
dashboards, OAuth2, multi-database, AWS/Azure). This implementation is
scaled to a single modular FastAPI backend + React frontend — same
architectural principles, sized for one student across 8 weeks.
