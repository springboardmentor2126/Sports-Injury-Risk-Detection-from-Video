"""
test_injury_risk_upload_flow.py — end-to-end test of the Milestone 3
wiring: uploading a video auto-runs a risk assessment (score/level/
injury_type + posture/exercise/recovery recommendations), GET
/videos/{id} reflects that same persisted assessment, and
POST /videos/{id}/risk-assessment/refresh recomputes against the
athlete's CURRENT profile (after injury_history/training_load change)
without needing to re-upload the video.

Upload is ASYNC (FastAPI BackgroundTasks) -- POST /videos/upload
returns 202 immediately with no risk_assessment yet; the very next GET
is what has the processed, scored result. TestClient runs background
tasks synchronously as part of the upload call, so no polling/sleeping
is needed here (see routers/video.py's upload_video() docstring for
why a real browser client does need to poll).

Single-athlete scope: ownership is the only access rule now, no
staff/coach role to separately test.

Uses an in-memory SQLite DB and a mocked PoseEstimator (see
test_upload_flow.py for why) -- everything else is real: actual frame
extraction, actual biomechanics analysis, actual injury_risk scoring,
actual DB writes/reads through the real endpoints, actual ownership checks.

Expected numbers below (score==28.0 on upload, score==58.0 after
refresh, etc.) are hand-derived from FakePoseEstimator's fixed pose --
same squat-like keypoints test_upload_flow.py/test_delete_video.py use,
identical on every sampled frame:
  - left knee valgus proxy for that exact pose works out to 27.49% of
    leg length (thigh+shank-segment leg_length -- see biomechanics.py)
    -- above KNEE_VALGUS_HIGH_PCT (15%), so "knee_valgus" fires at the
    HIGH severity (28 points). That's the only biomechanics factor that
    fires: the pose is IDENTICAL every frame, so knee ROM (max-min per
    side) is 0 for both legs -> no ROM-asymmetry factor, and the
    shoulder/hip midpoints line up perfectly vertically -> 0 deg trunk
    lean -> no trunk factor.
  - so a fresh athlete (no injury_history/training_load set) scores
    exactly 28.0 -> "Moderate".
  - after PUT /athletes/me sets a lower-body injury_history (+18) and
    a high training_load (+12), a refresh should score 28+18+12=58.0
    -> "High", with injury_type still "Left knee valgus proxy" (28 is
    still the single largest contributor).

Needs: pip install httpx   (test-only, not needed to run the app)

Run from the project root:
    python backend/tests/test_injury_risk_upload_flow.py
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
    """Same fixed squat-like pose as test_upload_flow.py/test_delete_video.py
    -- identical on every frame, which is exactly why the hand-derived
    numbers in this file's docstring are exact, not approximate."""

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
    r = client.post("/auth/register", json={
        "full_name": "Risk Test Athlete", "email": "risktest@test.com",
        "password": "testpass123",
    })
    assert r.status_code == 201, r.text
    token = client.post(
        "/auth/login", json={"email": "risktest@test.com", "password": "testpass123"}
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # --- Upload auto-runs a risk assessment ---
    video_path = "/tmp/functest_risk_input.mp4"
    make_synthetic_video(video_path)

    with open(video_path, "rb") as f:
        r = client.post("/videos/upload", headers=headers, files={"file": ("test.mp4", f, "video/mp4")})
    # Async upload -- 202, no risk_assessment in THIS response (it's built
    # before the background task runs). TestClient runs that background
    # task synchronously as part of the same call though, so the very next
    # GET already reflects the finished, scored state.
    assert r.status_code == 202, r.text
    video_id = r.json()["video_id"]

    r = client.get(f"/videos/{video_id}", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "completed"

    risk = data["risk_assessment"]
    print("post-processing risk_assessment:", risk)
    assert risk is not None, "expected upload processing to auto-run a risk assessment"
    assert risk["risk_score"] == 28.0, f"expected 28.0 from the fixed valgus-only pose, got {risk['risk_score']}"
    assert risk["risk_level"] == "Moderate"
    assert risk["injury_type"] == "Left knee valgus proxy"
    assert any(f["key"] == "knee_valgus" for f in risk["factors"])
    assert not any(f["key"] == "knee_rom_asymmetry" for f in risk["factors"]), (
        "identical pose every frame -> zero ROM -> must NOT flag asymmetry"
    )
    assert "knees over toes" in risk["recommendation"]["posture_correction"].lower()
    assert "glute" in risk["recommendation"]["exercise_plan"].lower()
    assert "no recovery" in risk["recommendation"]["recovery_plan"].lower()  # no history/load set yet
    assert risk["anomalous_frames"] == [], "identical valgus value every frame -> zero stdev -> no outliers"
    first_prediction_id = risk["prediction_id"]
    print("auto risk assessment scored/labeled correctly after processing: OK")

    # --- GET again reflects that SAME persisted assessment, not a
    # silently-recomputed one ---
    r = client.get(f"/videos/{video_id}", headers=headers)
    assert r.status_code == 200, r.text
    get_risk = r.json()["risk_assessment"]
    assert get_risk["prediction_id"] == first_prediction_id
    assert get_risk["risk_score"] == 28.0
    print("repeated GET reflects the same persisted assessment: OK")

    # --- Update the athlete's profile with a relevant injury history +
    # high training load, THEN manually refresh (no re-upload needed) ---
    r = client.put(
        "/athletes/me", headers=headers,
        json={"injury_history": "ACL tear last year", "training_load": "high intensity block"},
    )
    assert r.status_code == 200, r.text

    # SQLite's CURRENT_TIMESTAMP (used for prediction_date's server_default
    # in this test DB) only has 1-second resolution -- sleep so the refresh
    # below gets a strictly later prediction_date than the upload-time one,
    # and "latest" ordering is unambiguous. Postgres (the real deployment
    # target per Tech_Stack.md) has microsecond resolution and doesn't need
    # this; it's purely a SQLite-in-tests quirk.
    time.sleep(1.1)

    r = client.post(f"/videos/{video_id}/risk-assessment/refresh", headers=headers)
    assert r.status_code == 200, r.text
    refreshed = r.json()
    print("refreshed risk_assessment:", refreshed)
    assert refreshed["prediction_id"] != first_prediction_id, "refresh should create a NEW prediction row"
    assert refreshed["risk_score"] == 58.0, (
        f"expected 28 (valgus) + 18 (relevant history) + 12 (high load) = 58, got {refreshed['risk_score']}"
    )
    assert refreshed["risk_level"] == "High"
    assert refreshed["injury_type"] == "Left knee valgus proxy"  # still the single largest contributor
    assert "physiotherapist" in refreshed["recommendation"]["recovery_plan"].lower()
    assert "deload" in refreshed["recommendation"]["recovery_plan"].lower()
    print("manual refresh recomputed against the updated profile correctly: OK")

    # --- GET again now shows the REFRESHED assessment, not the original ---
    r = client.get(f"/videos/{video_id}", headers=headers)
    assert r.status_code == 200, r.text
    latest = r.json()["risk_assessment"]
    assert latest["prediction_id"] == refreshed["prediction_id"]
    assert latest["risk_score"] == 58.0
    print("GET after refresh shows the newer assessment as 'latest': OK")

    # --- Single-athlete scope: a different athlete must not be able to
    # trigger a refresh for someone else's video ---
    client.post("/auth/register", json={
        "full_name": "Other", "email": "riskother@test.com", "password": "testpass123",
    })
    other_token = client.post(
        "/auth/login", json={"email": "riskother@test.com", "password": "testpass123"}
    ).json()["access_token"]
    r = client.post(
        f"/videos/{video_id}/risk-assessment/refresh",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert r.status_code == 403, r.text
    print("cross-athlete refresh correctly blocked:", r.status_code)

    print("\nALL INJURY RISK UPLOAD-FLOW END-TO-END TESTS PASSED")


if __name__ == "__main__":
    main()
