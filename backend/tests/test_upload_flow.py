"""
test_upload_flow.py — end-to-end test of the real API: register, login,
upload a video, and verify pose estimation -> biomechanics -> DB
storage -> retrieval -> ownership checks all work together correctly.

Upload is ASYNC (FastAPI BackgroundTasks): POST /videos/upload returns
202 immediately with status "uploaded", and the actual processing runs
in the background. TestClient runs background tasks synchronously as
part of the same call, so no polling/sleeping is needed here -- a real
browser client would poll GET /{video_id} instead (see
routers/video.py's upload_video()/_process_video_task() docstrings).

Single-athlete scope: there's no staff/coach role anymore, so ownership
is the only access rule -- see test_delete_video.py and this file's
cross-athlete-blocked check.

Uses an in-memory SQLite DB (so it doesn't touch your real Postgres
data) and mocks PoseEstimator (so it doesn't need the real .task model
file downloaded) -- everything else runs for real: the actual FastAPI
routes, actual frame extraction on a real generated video file, actual
DB writes/reads, actual JWT auth, actual ownership checks.

Needs: pip install httpx   (FastAPI's TestClient dependency -- test-only,
no need to add it to requirements.txt for the running app)

Run from the project root:
    python backend/tests/test_upload_flow.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret"
# Keep these e2e tests deterministic and network-free regardless of the
# ambient shell environment -- report_writer.py treats an unset/empty key
# as "provider not configured" and returns None, same as a real network
# failure would, so this doesn't change any test's pass/fail behavior.
os.environ["XAI_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""

import cv2
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app import database, models

# --- isolated in-memory SQLite test DB, wired into the app's get_db ---
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine)
models.Base.metadata.create_all(bind=engine)

database.engine = engine
database.SessionLocal = TestingSessionLocal


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


from backend.app import main as app_main  # noqa: E402  (import after DB patch)

app_main.app.dependency_overrides[database.get_db] = override_get_db

from backend.app.services import pose_utils  # noqa: E402
from backend.app.routers import video as video_router  # noqa: E402


class FakePoseEstimator:
    """Simulates a squat detected in every frame, so this test doesn't
    need the real ~9MB model file or a real photo of a person."""

    def __enter__(self):
        return self

    def __exit__(self, *a):
        pass

    def estimate(self, frame_rgb):
        return {
            "left_shoulder": pose_utils.Point(150, 120, 2), "right_shoulder": pose_utils.Point(190, 120, 2),
            "left_hip": pose_utils.Point(155, 250, 2), "right_hip": pose_utils.Point(185, 250, 2),
            "left_knee": pose_utils.Point(200, 300, 2), "right_knee": pose_utils.Point(140, 300, 2),
            "left_ankle": pose_utils.Point(160, 380, 2), "right_ankle": pose_utils.Point(180, 380, 2),
            "left_elbow": pose_utils.Point(130, 190, 2), "right_elbow": pose_utils.Point(210, 190, 2),
            "left_wrist": pose_utils.Point(120, 240, 2), "right_wrist": pose_utils.Point(220, 240, 2),
        }


video_router.pose_estimation.PoseEstimator = FakePoseEstimator

client = TestClient(app_main.app)


def make_synthetic_video(path: str, num_frames: int = 20):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(path, fourcc, 10, (320, 240))
    for i in range(num_frames):
        frame = np.full((240, 320, 3), fill_value=(i * 10) % 256, dtype=np.uint8)
        writer.write(frame)
    writer.release()


def main():
    # 1. Register + login an athlete
    r = client.post("/auth/register", json={
        "full_name": "Test Athlete", "email": "athlete@test.com",
        "password": "testpass123",
    })
    assert r.status_code == 201, r.text
    print("register:", r.status_code)

    r = client.post("/auth/login", json={"email": "athlete@test.com", "password": "testpass123"})
    assert r.status_code == 200, r.text
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    print("login:", r.status_code)

    # 2. Generate + upload a synthetic test video
    video_path = "/tmp/functest_upload.mp4"
    make_synthetic_video(video_path)

    with open(video_path, "rb") as f:
        r = client.post(
            "/videos/upload", headers=headers,
            files={"file": ("squat_test.mp4", f, "video/mp4")},
        )
    print("upload:", r.status_code, r.json())
    # Async upload: 202 Accepted, not 201 -- the request returns before
    # processing runs, so this response body deliberately does NOT have
    # biomechanics_summary/risk_assessment yet (see routers/video.py).
    assert r.status_code == 202, r.text
    data = r.json()
    video_id = data["video_id"]

    # TestClient runs FastAPI BackgroundTasks synchronously as part of the
    # same call that returned the response above -- so by the time we get
    # here, _process_video_task has already finished. No polling/sleeping
    # needed in a test; a real browser client would poll GET /{video_id}.
    r = client.get(f"/videos/{video_id}", headers=headers)
    assert r.status_code == 200, r.text
    detail = r.json()
    print("processed detail:", detail["status"], detail.get("biomechanics_summary"))
    assert detail["status"] == "completed"
    assert detail["biomechanics_summary"]["frames_analyzed"] > 0
    assert detail["biomechanics_summary"]["avg_left_knee_angle"] < 150

    # 3. List + detail + frames
    assert client.get("/videos/", headers=headers).status_code == 200
    assert client.get(f"/videos/{video_id}", headers=headers).status_code == 200
    frames = client.get(f"/videos/{video_id}/frames", headers=headers).json()
    assert len(frames) > 0
    print("frames stored:", len(frames))

    # 4. RBAC: a different athlete must NOT see this video (single-athlete
    # scope -- there's no staff role anymore that CAN see it either)
    client.post("/auth/register", json={
        "full_name": "Other Athlete", "email": "other@test.com",
        "password": "testpass123",
    })
    other_token = client.post(
        "/auth/login", json={"email": "other@test.com", "password": "testpass123"}
    ).json()["access_token"]
    r = client.get(f"/videos/{video_id}", headers={"Authorization": f"Bearer {other_token}"})
    assert r.status_code == 403, r.text
    print("cross-athlete access blocked:", r.status_code)

    print("\nALL END-TO-END TESTS PASSED")


if __name__ == "__main__":
    main()
