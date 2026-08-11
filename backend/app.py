import os

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt

from config import Config
from database.db import db

# Import Models
from models.user import User
from models.athlete import Athlete
from models.video import Video

# Import Routes
from routes.auth import auth
from routes.athlete import athlete
from routes.video import video


app = Flask(__name__)

# Load Configuration
app.config.from_object(Config)

# Upload Folder Configuration
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Initialize Extensions
CORS(app)

bcrypt = Bcrypt(app)

jwt = JWTManager(app)

db.init_app(app)

# Register Blueprints
app.register_blueprint(auth, url_prefix="/api/auth")
app.register_blueprint(athlete, url_prefix="/api/athlete")
app.register_blueprint(video, url_prefix="/api/video")

# Create Database Tables
with app.app_context():
    db.create_all()


@app.route("/")
def home():
    return {
        "status": "Running",
        "message": "Sports Injury Detection Backend API",
        "version": "2.0",
        "modules": [
            "Authentication",
            "Athlete Management",
            "Video Upload"
        ]
    }


if __name__ == "__main__":
    app.run(debug=True)