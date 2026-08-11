from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import shutil
import os

from .. import models
from ..dependencies import get_db
from ..jwt_handler import verify_token
from ..services.pose_estimation import process_video

router = APIRouter(
    prefix="/video",
    tags=["Video"]
)

security = HTTPBearer()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def get_current_user(token: str, db: Session):

    payload = verify_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid Token"
        )

    user = db.query(models.User).filter(
        models.User.email == payload["sub"]
    ).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


@router.post("/upload")
def upload_video(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):

    user = get_current_user(
        credentials.credentials,
        db
    )

    filepath = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    analysis = process_video(filepath)

    video = models.Video(

        filename=file.filename,
        filepath=filepath,
        owner_id=user.id,

        frames_processed=analysis["frames_processed"],
        pose_detected_frames=analysis["pose_detected_frames"],

        left_knee_angle=analysis["left_knee_angle"],
        right_knee_angle=analysis["right_knee_angle"],

        left_hip_angle=analysis["left_hip_angle"],
        right_hip_angle=analysis["right_hip_angle"],

        left_shoulder_angle=analysis["left_shoulder_angle"],
        right_shoulder_angle=analysis["right_shoulder_angle"],

        left_elbow_angle=analysis["left_elbow_angle"],
        right_elbow_angle=analysis["right_elbow_angle"],

        posture_symmetry=analysis["posture_symmetry"],
        movement_quality=analysis["movement_quality"],

        injury_risk=analysis["injury_risk"],
        recommendation=analysis["recommendation"]

    )

    db.add(video)
    db.commit()
    db.refresh(video)

    return {
        "message": "Video Uploaded Successfully",
        "analysis": analysis
    }


@router.get("/my-videos")
def my_videos(

    credentials: HTTPAuthorizationCredentials = Depends(security),

    db: Session = Depends(get_db)

):

    user = get_current_user(

        credentials.credentials,

        db

    )

    videos = db.query(models.Video).filter(

        models.Video.owner_id == user.id

    ).all()

    results = []

    for video in videos:

        average_knee = round(
            (video.left_knee_angle + video.right_knee_angle) / 2,
            2
        )

        results.append({

            "id": video.id,

            "filename": video.filename,

            "analysis": {

                "frames_processed": video.frames_processed,

                "pose_detected_frames": video.pose_detected_frames,

                "average_knee_angle": average_knee,

                "left_knee_angle": video.left_knee_angle,
                "right_knee_angle": video.right_knee_angle,

                "left_hip_angle": video.left_hip_angle,
                "right_hip_angle": video.right_hip_angle,

                "left_shoulder_angle": video.left_shoulder_angle,
                "right_shoulder_angle": video.right_shoulder_angle,

                "left_elbow_angle": video.left_elbow_angle,
                "right_elbow_angle": video.right_elbow_angle,

                "posture_symmetry": video.posture_symmetry,

                "movement_quality": video.movement_quality,

                "injury_risk": video.injury_risk,

                "recommendation": video.recommendation

            }

        })

    return results