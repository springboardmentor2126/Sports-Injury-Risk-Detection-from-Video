"""
test_annotated_upload_flow.py — end-to-end test: uploading a video
produces a real, playable annotated (skeleton-overlay) video, servable
through GET /videos/{id}/annotated, with the same RBAC rules as
everything else.

Uses an in-memory SQLite DB and a mocked PoseEstimator (see
test_upload_flow.py for why) -- everything else is real: actual frame
extraction, actual skeleton drawing, actual video encoding, actual file
serving through the real endpoint.

Needs: pip install httpx   (test-only, not needed to run the app)

Run from the project root:
    python backend/tests/test_annotated_upload_flow.py
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


def make_synthetic_video(path: str, num_frames: int = 20):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(path, fourcc, 10, (320, 240))
    for i in range(num_frames):
        frame = np.full((240, 320, 3), fill_value=(i * 10) % 256, dtype=np.uint8)
        writer.write(frame)
    writer.release()


def main():
    r = client.post("/auth/register", json={
        "full_name": "T", "email": "a@test.com", "password": "testpass123",
    })
    assert r.status_code == 201, r.text
    token = client.post(
        "/auth/login", json={"email": "a@test.com", "password": "testpass123"}
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    video_path = "/tmp/functest_annotated_input.mp4"
    make_synthetic_video(video_path)

    with open(video_path, "rb") as f:
        r = client.post("/videos/upload", headers=headers, files={"file": ("test.mp4", f, "video/mp4")})
    # Async upload -- 202, and has_annotated_video is still False in THIS
    # response (it's serialized before the background task runs). TestClient
    # runs the background task synchronously as part of the same call
    # though, so a follow-up GET already reflects the finished state.
    assert r.status_code == 202, r.text
    video_id = r.json()["video_id"]

    r = client.get(f"/videos/{video_id}", headers=headers)
    assert r.status_code == 200, r.text
    detail = r.json()
    print("processed has_annotated_video:", detail["has_annotated_video"])
    assert detail["status"] == "completed"
    assert detail["has_annotated_video"] is True

    r = client.get(f"/videos/{video_id}/annotated", headers=headers)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "video/mp4"
    assert len(r.content) > 0
    print("annotated video endpoint returned", len(r.content), "bytes")

    out = "/tmp/downloaded_annotated.mp4"
    with open(out, "wb") as f:
        f.write(r.content)
    cap = cv2.VideoCapture(out)
    assert cap.isOpened()
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()
    assert frame_count > 0
    print("downloaded annotated video has", frame_count, "playable frames")

    # Critical regression check: the file must be real H.264, not
    # OpenCV's raw mp4v (MPEG-4 Part 2) -- mp4v passes cv2.VideoCapture
    # checks fine but renders as corrupted color noise in a real
    # browser <video> tag. This is exactly the bug that slipped through
    # before ffmpeg re-encoding was added, so it's pinned here for good.
    import shutil as _shutil
    if _shutil.which("ffprobe"):
        import subprocess as _subprocess
        import json as _json
        probe = _subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=codec_name", "-of", "json", out],
            capture_output=True, text=True,
        )
        codec = _json.loads(probe.stdout)["streams"][0]["codec_name"]
        assert codec == "h264", f"expected browser-playable h264, got '{codec}' -- this will look broken in a real browser"
        print("codec verified as h264 (browser-playable):", codec)
    else:
        print("ffprobe not found -- skipping codec verification (install ffmpeg to enable this check)")

    # Single-athlete scope: a different athlete must not be able to fetch
    # it either -- ownership is the only access rule now
    client.post("/auth/register", json={
        "full_name": "Other", "email": "o@test.com", "password": "testpass123",
    })
    other_token = client.post(
        "/auth/login", json={"email": "o@test.com", "password": "testpass123"}
    ).json()["access_token"]
    r = client.get(f"/videos/{video_id}/annotated", headers={"Authorization": f"Bearer {other_token}"})
    assert r.status_code == 403, r.text
    print("cross-athlete access to annotated video blocked:", r.status_code)

    print("\nALL ANNOTATED-VIDEO END-TO-END TESTS PASSED")


if __name__ == "__main__":
    main()
