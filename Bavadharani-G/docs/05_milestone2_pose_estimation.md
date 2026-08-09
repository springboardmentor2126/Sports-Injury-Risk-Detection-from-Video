# Milestone 2 — Pose Estimation & Biomechanical Analysis

## What was built

| Task (from spec) | Implementation |
|---|---|
| Pose estimation engine | MediaPipe Pose (Tasks API) — 33 body landmarks per frame |
| Skeleton tracking workflows | Per-frame landmark detection, sampled every 3rd frame for speed |
| Biomechanical analysis modules | Joint angle math: knee, hip, trunk lean, left/right symmetry |
| Movement quality assessment | Rule-based 0-100 score (asymmetry + trunk lean + detection confidence) |
| Biomechanics reports | JSON report per video + downloadable skeleton-overlay video |

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/videos/upload` | Upload an mp4 (validates extension + size) |
| POST | `/videos/{id}/process` | Runs pose estimation + biomechanical analysis |
| GET | `/videos` | List the logged-in athlete's videos |
| GET | `/videos/{id}/report` | Get the biomechanics report for a video |
| GET | `/videos/{id}/overlay` | Download the video with a skeleton drawn on it |

## Important: MediaPipe API version note

MediaPipe versions that support Python 3.13/3.14 (0.10.30+) removed the
older, simpler `mp.solutions.pose` API entirely. This implementation
uses the current, correct replacement — the **Tasks API**
(`mediapipe.tasks.python.vision.PoseLandmarker`), which requires a
separately downloaded model file (~9MB). This is standard MediaPipe
practice, not a workaround — even Google's own sample apps download
this file on first run rather than bundling it. `model_downloader.py`
handles this automatically the first time a video is processed
(requires internet once; cached locally after that).

## How the pipeline works

1. Video read frame-by-frame with OpenCV
2. Every 3rd frame passed to MediaPipe's PoseLandmarker
3. Joint angles computed with vector geometry (`biomechanics.py`):
   knee angle (hip→knee→ankle), hip angle (shoulder→hip→knee), trunk
   lean (shoulder midpoint vs hip midpoint vs vertical)
4. Skeleton drawn on each analyzed frame, written to an overlay video
5. Aggregate stats + movement quality score computed across the clip

## Testing performed

- Unit tests on angle math against known geometric shapes (90°, 180°,
  45° triangles) — all passed
- API signature verification: confirmed `PoseLandmarkerOptions`,
  `mp.Image`, `PoseLandmarker.create_from_options`, and
  `detect_for_video` all match the actual installed MediaPipe package
- Full pipeline test with a synthetic video — correctly produces 0%
  detection rate and a "low confidence" warning note (no person in a
  synthetic test pattern), confirming graceful handling rather than a
  false-positive or crash

**Test with a real video of an actual person** (not a screen recording
or animation) to see full pose detection and real angle output.
