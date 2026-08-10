"""
test_risk_history.py — end-to-end test for the Milestone 3 athlete
risk-history endpoint: GET /athletes/me/risk-history.

Verifies history aggregates across MULTIPLE videos for one athlete
(most-recent-first) and stays scoped per-athlete (single-athlete
scope -- self-service only, no staff/coach viewing route anymore).

Upload is ASYNC (FastAPI BackgroundTasks) -- POST /videos/upload
returns 202 immediately; TestClient runs the background task
synchronously as part of that same call, so the video is already fully
processed and scored by the time upload_one() returns its video_id.

Uses an in-memory SQLite DB and a mocked PoseEstimator (see
test_upload_flow.py for why). Expected risk_score (28.0 per upload) is
the same hand-derived/verified number from
test_injury_risk_upload_flow.py's docstring -- FakePoseEstimator's
fixed pose triggers only the "knee_valgus" HIGH factor (28 points),
nothing else, on every upload.

Needs: pip install httpx   (test-only, not needed to run the app)

Run from the project root:
    python backend/tests/test_risk_history.py
"""

import os
import sys
import time
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


from backend.app import main as app_main  # noqa: E402

app_main.app.dependency_overrides[database.get_db] = override_get_db

from backend.app.services import pose_utils  # noqa: E402
from backend.app.routers import video as video_router  # noqa: E402


class FakePoseEstimator:
    """Same fixed squat-like pose as test_injury_risk_upload_flow.py --
    identical every frame, so every upload deterministically scores 28.0
    ("Moderate", knee_valgus only)."""

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


def make_synthetic_video(path: str, num_frames: int = 15):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(path, fourcc, 10, (320, 240))
    for i in range(num_frames):
        frame = np.full((240, 320, 3), fill_value=(i * 10) % 256, dtype=np.uint8)
        writer.write(frame)
    writer.release()


def upload_one(headers, tag: str) -> str:
    """Uploads a video and returns its video_id. Async upload returns 202
    immediately, but TestClient runs the background processing task
    synchronously as part of this same call -- so by the time this
    function returns, the video is already fully processed and scored."""
    path = f"/tmp/functest_history_{tag}.mp4"
    make_synthetic_video(path)
    with open(path, "rb") as f:
        r = client.post("/videos/upload", headers=headers, files={"file": (f"{tag}.mp4", f, "video/mp4")})
    assert r.status_code == 202, r.text
    return r.json()["video_id"]


def main():
    # --- Athlete with TWO uploads -> history should have 2 entries,
    # most-recent-first, each tied to the correct video_id ---
    client.post("/auth/register", json={
        "full_name": "History Athlete", "email": "history@test.com",
        "password": "testpass123",
    })
    token = client.post(
        "/auth/login", json={"email": "history@test.com", "password": "testpass123"}
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    first_video_id = upload_one(headers, "first")
    # SQLite's CURRENT_TIMESTAMP (prediction_date's server_default here) only
    # has 1-second resolution -- sleep so the two predictions get distinct
    # timestamps and "most-recent-first" ordering is unambiguous. Postgres
    # (the real deployment target) has microsecond resolution and doesn't
    # need this.
    time.sleep(1.1)
    second_video_id = upload_one(headers, "second")

    r = client.get("/athletes/me/risk-history", headers=headers)
    assert r.status_code == 200, r.text
    history = r.json()
    print("history entries:", len(history))
    assert len(history) == 2
    assert all(entry["risk_score"] == 28.0 for entry in history)
    assert all(entry["risk_level"] == "Moderate" for entry in history)
    # most-recent-first -> the SECOND upload should come first
    assert history[0]["video_id"] == second_video_id
    assert history[1]["video_id"] == first_video_id
    assert history[0]["prediction_id"] != history[1]["prediction_id"]
    print("self-service history: 2 entries, correct order, correct video_id linkage: OK")

    # --- A second athlete with no uploads sees an empty history, not the
    # first athlete's data (single-athlete scope -- each account only ever
    # sees its own history, there's no staff/cross-athlete view anymore) ---
    client.post("/auth/register", json={
        "full_name": "Empty Athlete", "email": "emptyhistory@test.com",
        "password": "testpass123",
    })
    empty_token = client.post(
        "/auth/login", json={"email": "emptyhistory@test.com", "password": "testpass123"}
    ).json()["access_token"]
    r = client.get("/athletes/me/risk-history", headers={"Authorization": f"Bearer {empty_token}"})
    assert r.status_code == 200, r.text
    assert r.json() == []
    print("a different athlete's history is empty, not leaking the first athlete's data: OK")

    print("\nALL RISK HISTORY TESTS PASSED")


if __name__ == "__main__":
    main()
