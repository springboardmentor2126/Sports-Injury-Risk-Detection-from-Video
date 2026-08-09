from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.database import Base


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    sport_type = Column(String, nullable=True)
    position = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    injury_history = Column(String, nullable=True)
    training_load = Column(String, nullable=True)
