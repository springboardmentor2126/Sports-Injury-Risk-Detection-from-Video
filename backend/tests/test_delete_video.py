"""
test_delete_video.py — end-to-end test for DELETE /videos/{id}:
verifies only the owning athlete (not other athletes) can delete a
video, and that deletion actually removes both the DB row and the
files on disk (not just marking it hidden).

Uses an in-memory SQLite DB and a mocked PoseEstimator (see
test_upload_flow.py for why).

Needs: pip install httpx   (test-only, not needed to run the app)

Run from the project root:
    python backend/tests/test_delete_video.py
"""

import os
import sys
import uuid as uuid_module
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

from backend.app import database, models, crud

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


def main():
    client.post("/auth/register", json={
        "full_name": "T", "email": "a@test.com", "password": "testpass123",
    })
    token = client.post(
        "/auth/login", json={"email": "a@test.com", "password": "testpass123"}
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    video_path = "/tmp/test_delete_input.mp4"
    make_synthetic_video(video_path)

    with open(video_path, "rb") as f:
        r = client.post("/videos/upload", headers=headers, files={"file": ("test.mp4", f, "video/mp4")})
    # Async upload -- 202 Accepted (see routers/video.py). The physical
    # file is still written synchronously before this response, though,
    # so the on-disk check right below doesn't need to wait for anything.
    assert r.status_code == 202, r.text
    video_id = r.json()["video_id"]

    db = TestingSessionLocal()
    video_row = crud.get_video(db, uuid_module.UUID(video_id))
    video_path_on_disk = video_row.video_path
    db.close()
    assert os.path.exists(video_path_on_disk)
    print("uploaded video file exists on disk before delete: OK")

    # A different athlete must NOT be able to delete someone else's video
    # (single-athlete scope -- ownership is the only rule, no staff role
    # to separately test anymore).
    client.post("/auth/register", json={
        "full_name": "Other", "email": "o@test.com", "password": "testpass123",
    })
    other_token = client.post(
        "/auth/login", json={"email": "o@test.com", "password": "testpass123"}
    ).json()["access_token"]
    r = client.delete(f"/videos/{video_id}", headers={"Authorization": f"Bearer {other_token}"})
    assert r.status_code == 403, r.text
    print("cross-athlete delete correctly blocked:", r.status_code)

    # The owning athlete CAN delete it.
    r = client.delete(f"/videos/{video_id}", headers=headers)
    assert r.status_code == 200, r.text
    print("owner delete succeeded:", r.json())

    # Gone from the list.
    r = client.get("/videos/", headers=headers)
    assert r.json() == []
    print("video removed from list: OK")

    # Gone from disk too, not just hidden in the DB.
    assert not os.path.exists(video_path_on_disk)
    print("video file actually deleted from disk: OK")

    # Direct fetch now 404s.
    r = client.get(f"/videos/{video_id}", headers=headers)
    assert r.status_code == 404, r.text
    print("deleted video returns 404: OK")

    print("\nALL DELETE-VIDEO TESTS PASSED")


if __name__ == "__main__":
    main()

