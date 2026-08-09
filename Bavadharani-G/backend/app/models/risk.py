"""
The output of running the injury risk prediction engine on a
BiomechanicsReport. One assessment per video/report.

Each *_risk field is 0-100. category is a simple bucket derived from
the overall_risk_score: Low / Moderate / High / Critical, matching the
spec's Risk Categories.
"""

from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class InjuryRiskAssessment(Base):
    __tablename__ = "injury_risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), unique=True, nullable=False)

    acl_risk = Column(Float, default=0.0)
    hamstring_risk = Column(Float, default=0.0)
    ankle_sprain_risk = Column(Float, default=0.0)
    lower_back_risk = Column(Float, default=0.0)
    overuse_risk = Column(Float, default=0.0)

    overall_risk_score = Column(Float, default=0.0)  # 0-100, higher = riskier
    risk_category = Column(String, default="Low")     # Low / Moderate / High / Critical

    top_risk_factors = Column(Text, nullable=True)     # JSON list of strings
    recommendations = Column(Text, nullable=True)       # JSON list of strings

    created_at = Column(DateTime(timezone=True), server_default=func.now())
