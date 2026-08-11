from database.db import db

class Analysis(db.Model):
    __tablename__ = "analysis"

    id = db.Column(db.Integer, primary_key=True)

    video_id = db.Column(
        db.Integer,
        db.ForeignKey("videos.id"),
        nullable=False
    )

    risk_score = db.Column(db.Float)

    injury_type = db.Column(db.String(100))

    confidence = db.Column(db.Float)

    recommendation = db.Column(db.Text)

    created_at = db.Column(db.DateTime, server_default=db.func.now())