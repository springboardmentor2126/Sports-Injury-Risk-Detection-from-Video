from database.db import db


class Athlete(db.Model):
    __tablename__ = "athletes"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True
    )

    age = db.Column(db.Integer)

    gender = db.Column(db.String(20))

    height = db.Column(db.Float)

    weight = db.Column(db.Float)

    sport = db.Column(db.String(100))

    experience = db.Column(db.Integer)

    dominant_leg = db.Column(db.String(20))

    medical_history = db.Column(db.Text)

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    def __repr__(self):
        return f"<Athlete {self.user_id}>"