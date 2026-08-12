from sqlalchemy import Column, Integer, String, Float, Text, Boolean
from database import Base

class Athlete(Base):
    __tablename__ = "athletes"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    sport_type = Column(String)
    position = Column(String)
    age = Column(Integer)
    height = Column(Float)
    weight = Column(Float)
    injury_history = Column(Text)
    training_load = Column(String)
    user_id = Column(Integer, nullable=True)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    profile_completed = Column(Boolean, default=False, nullable=False)