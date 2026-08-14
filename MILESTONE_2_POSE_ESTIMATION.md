# Milestone 2: Week 3 & 4 — Pose Estimation & Biomechanical Analysis

This document provides a comprehensive overview of the pose estimation engine, skeleton tracking workflows, biomechanical analysis modules, movement quality assessment, and report generation implemented for **KinetIQ** (Sport Sentinel) in Milestone 2.

---

## 📋 Table of Contents

1. [Milestone Overview & Objectives](#1-milestone-overview--objectives)
2. [Pose Estimation Engine](#2-pose-estimation-engine)
3. [Skeleton Tracking Workflows](#3-skeleton-tracking-workflows)
4. [Biomechanical Analysis Modules](#4-biomechanical-analysis-modules)
5. [Movement Quality Assessment](#5-movement-quality-assessment)
6. [Biomechanics Reports](#6-biomechanics-reports)
7. [File Map & Reference Links](#7-file-map--reference-links)

---

## 1. Milestone Overview & Objectives

Milestone 2 delivers the core analytical intelligence of KinetIQ — the AI-driven engine that converts raw video frames into structured biomechanical insights, injury risk signals, and movement quality scores.

### ✅ Tasks Completed

| Task                                   | Status  |
| :------------------------------------- | :-----: |
| Implement pose estimation engine       | ✅ Done |
| Build skeleton tracking workflows      | ✅ Done |
| Develop biomechanical analysis modules | ✅ Done |
| Create movement quality assessment     | ✅ Done |
| Generate biomechanics reports          | ✅ Done |

### 🎯 Outcomes Achieved

- **Pose estimation engine operational** — Multimodal AI vision model (Gemini) extracts 14 anatomical joint coordinates (normalized x/y) and per-joint mechanical stress scores per keyframe.
- **Biomechanical analysis workflows functional** — Full pipeline from video → frame extraction → AI pose inference → structured schema output is live and tested.
- **Movement assessment system completed** — Five biomechanical sub-scores (movement stability, joint alignment, landing technique, balance, fatigue indicator) are computed per session and rendered as an interactive radar chart.

---

## 2. Pose Estimation Engine

### Overview

The pose estimation engine is implemented as a TanStack Start server function (`analyzePose`) in [`src/lib/analyze.functions.ts`](./src/lib/analyze.functions.ts). It ingests extracted keyframes (as base64 data URLs) alongside contextual metadata and returns a fully structured biomechanical analysis.

### Joint Tracking Schema

The engine tracks **14 standard anatomical joint landmarks**, consistent with the COCO Keypoints and Human3.6M dataset conventions:

```
head · neck · leftShoulder · rightShoulder
leftElbow · rightElbow · leftWrist · rightWrist
leftHip · rightHip · leftKnee · rightKnee
leftAnkle · rightAnkle
```

Each joint per frame returns:

- **`x`, `y`** — Normalized coordinates in [0, 1] from the top-left of the frame image.
- **`stress`** — Mechanical stress score in [0, 1]; 0 = safe/neutral, 1 = high-risk load.

### AI Model Integration

The engine uses `@ai-sdk/google` with structured output (`Output.object`) to enforce a strict Zod schema on model responses, ensuring all downstream rendering and analytics are type-safe.

```
Video Frames (JPEG/base64)
       │
       ▼
 Gemini Vision Model (gemini-3.5-flash)
       │
       ▼
 AnalysisSchema (Zod-validated)
       │
       ▼
 AnalysisResult (typed output)
```

### Contextual Enrichment

The prompt is enriched with:

- **Athlete biometric profile** — height, weight, dominant side, injury history, goals.
- **Historical session data** — up to 5 past analyses are injected to enable longitudinal trend detection and regression/improvement commentary.

---

## 3. Skeleton Tracking Workflows

### Frame Extraction Pipeline

Video processing is handled entirely client-side for privacy and performance. The workflow:

1. **Video Upload** — User uploads MP4, MOV, AVI, or WebM (≤ 80 MB).
2. **Frame Extraction** — The `extractFrames()` function seeks the video to evenly distributed timestamps at three granularity levels:
   - **Quick** — 6 frames (fastest, lightweight analysis)
   - **Standard** — 10 frames (balanced; default)
   - **Deep** — 16 frames (most thorough analysis)
3. **Canvas Rendering** — Each frame is drawn to an offscreen canvas (max 720px wide), then encoded as a JPEG data URL at 70% quality.
4. **Temporal Tagging** — Every captured frame is stored with its exact `timeSec` timestamp for timeline correlation.

### Joint Coordinate Mapping

The AI model outputs per-frame `frameStress` entries. Each entry maps `frameIndex → joints[]` where coordinates are normalized to the extracted image dimensions. This normalised representation is resolution-independent and directly usable by the heatmap renderer.

---

## 4. Biomechanical Analysis Modules

### Sub-Score Modules

Each analysis session produces five biomechanical sub-scores (0–100, where 100 = professional level):

| Module                 | Description                                                                    |
| :--------------------- | :----------------------------------------------------------------------------- |
| **Movement Stability** | Overall control and consistency of movement patterns across frames             |
| **Joint Alignment**    | Anatomical correctness of joint stacking (valgus/varus tendencies, trunk lean) |
| **Landing Technique**  | Softness, symmetry, and mechanics of foot-strike and deceleration phases       |
| **Balance**            | Centre-of-mass control and lateral stability indicators                        |
| **Fatigue Indicator**  | Detection of progressive form breakdown markers across the clip                |

### Injury Risk Detection

Up to 8 injury risk entries are generated per session, each containing:

- `bodyPart` & `injury` — Specific anatomical location and injury type.
- `level` — Risk level: `Low`, `Medium`, or `High`.
- `probabilityPercent` — Quantified risk probability (0–100%).
- `reason` — Evidence-based biomechanical rationale.
- `correction` — Targeted corrective cue or exercise recommendation.

### Technique Findings

Up to 8 technique findings are extracted per session:

- `area` — Movement area (e.g., "Knee Mechanics", "Arm Swing").
- `observation` — Specific behavioural observation from the video.
- `suggestion` — Actionable coaching recommendation.

### Risky Moment Detection

The engine identifies up to 12 time-coded risky moments per clip:

- Linked to specific frame timestamps (`timeSec`).
- Classified by severity (`Low`, `Medium`, `High`).
- Rendered on an interactive timeline for direct video scrubbing.

---

## 5. Movement Quality Assessment

### Assessment Output Schema

```
AnalysisResult
├── sportDetected        ← AI-inferred sport type
├── movementSummary      ← Narrative movement quality description
├── overallRiskLevel     ← Enum: Low | Medium | High
├── overallRiskPercent   ← 0-100% injury risk score
├── postureScore         ← 0-100 posture quality score
├── performanceScore     ← 0-100 performance quality score
├── scores               ← 5 biomechanical sub-scores (see §4)
├── injuryRisks[]        ← Up to 8 injury risk entries
├── techniqueFindings[]  ← Up to 8 technique findings
├── improvementSuggestions[] ← Up to 8 coaching suggestions
├── preventionExercises[]    ← Up to 8 rehab/prehab exercises
├── coachNotes           ← AI narrative coach summary
├── riskyMoments[]       ← Up to 12 time-coded risk events
└── frameStress[]        ← Per-frame joint coordinates & stress values
```

### Biomechanics Radar Visualisation

The five sub-scores are rendered as an interactive polar radar chart (Recharts `RadarChart`) providing an at-a-glance biomechanical fingerprint for the session.

### Side-by-Side Historical Comparison

When a baseline session is selected from the History Panel, a comparison view renders:

- **Dual radar chart** — Current vs. baseline overlaid on the same polar axes.
- **Delta table** — Metric-by-metric comparison with colour-coded improvement/regression indicators (`+` green, `-` red).

### Joint Stress Heatmap

For each analysed frame, a `HeatmapFrame` component overlays:

- **Radial gradient blobs** — Stress-coloured heat blobs centred on each joint (green → yellow → red).
- **Joint dot markers** — White dots with stress-coloured outlines marking exact joint positions.
- **Per-frame max stress badge** — Shows the worst-case stress value detected in that frame.

---

## 6. Biomechanics Reports

### Interactive Dashboard

The full analysis report renders in-page with the following sections:

1. **Score cards** — Overall risk %, posture score, performance score.
2. **Risky moments timeline** — Scrollable timeline with clickable markers that seek the video player to the flagged moment.
3. **Joint stress heatmap** — Grid of annotated keyframes showing joint positions and stress intensity.
4. **Biomechanics breakdown** — Radar chart of the 5 sub-scores.
5. **Injury risks panel** — Detailed cards per risk with reason and correction.
6. **Technique findings** — Observation + suggestion per movement area.
7. **Prevention exercises** — Prehab/rehab exercise prescriptions with sets/reps.
8. **Improvement suggestions** — Prioritised coaching action list.
9. **AI coach notes** — Narrative summary synthesising all findings.

### PDF Export

A one-click PDF export (`jsPDF`) generates a structured A4 report containing:

- Report header with sport, file name, and timestamp.
- All scores, risky moments, injury risks, technique findings, improvement suggestions, prevention exercises, and coach notes.
- Saved as `KinetIQ-report-<timestamp>.pdf`.

### Session History & Persistence

All analyses are auto-saved to `localStorage` via the `history.ts` module immediately after each successful run. The History Panel renders saved sessions as thumbnail cards with risk level badges, enabling quick baseline selection for comparison.

---

## 7. File Map & Reference Links

| File                                                             | Description                                                                  |
| :--------------------------------------------------------------- | :--------------------------------------------------------------------------- |
| [`src/lib/analyze.functions.ts`](./src/lib/analyze.functions.ts) | Pose estimation server function, Zod schemas, AI model integration           |
| [`src/routes/index.tsx`](./src/routes/index.tsx)                 | Main dashboard: frame extraction, heatmap, timeline, radar chart, PDF export |
| [`src/lib/history.ts`](./src/lib/history.ts)                     | Session persistence (save, load, delete) and thumbnail shrinking             |
| [`src/lib/ai-gateway.server.ts`](./src/lib/ai-gateway.server.ts) | AI provider gateway configuration                                            |
| [`MILESTONE_1_SETUP.md`](./MILESTONE_1_SETUP.md)                 | Milestone 1: Project setup, auth, database schema                            |

---

## 📊 Dataset Alignment

The biomechanical analysis modules are designed against established sports science datasets:

| Dataset                                  | Relevance to Milestone 2                                                                |
| :--------------------------------------- | :-------------------------------------------------------------------------------------- |
| **COCO Keypoints**                       | 17-point keypoint convention (we implement 14 core joints) for coordinate normalisation |
| **Human3.6M**                            | 3D joint coordinate reference for anatomical stress inference                           |
| **MPII Human Pose**                      | Activity-specific keypoint benchmarks for posture score calibration                     |
| **SportsPose**                           | Sport-specific motion patterns for movement quality scoring                             |
| **Sports Injury Risk Detection (Video)** | Ground-truth injury labels for fatigue marker and landing risk detection                |
