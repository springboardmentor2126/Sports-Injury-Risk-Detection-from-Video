import os

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from database.db import db
from models.video import Video

video = Blueprint("video", __name__)

ALLOWED_EXTENSIONS = {
    "mp4",
    "avi",
    "mov",
    "mkv"
}


def allowed_file(filename):
    return (
        "." in filename and
        filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


@video.route("/upload", methods=["POST"])
@jwt_required()
def upload_video():

    if "video" not in request.files:
        return jsonify({
            "message": "No video file provided"
        }), 400

    file = request.files["video"]

    if file.filename == "":
        return jsonify({
            "message": "No file selected"
        }), 400

    if not allowed_file(file.filename):
        return jsonify({
            "message": "Unsupported file format"
        }), 400

    filename = secure_filename(file.filename)

    filepath = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        filename
    )

    file.save(filepath)

    new_video = Video(
        user_id=int(get_jwt_identity()),
        filename=filename,
        filepath=filepath
    )

    db.session.add(new_video)
    db.session.commit()

    return jsonify({
        "message": "Video uploaded successfully",
        "video_id": new_video.id,
        "filename": filename
    }), 201