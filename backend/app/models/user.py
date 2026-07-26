import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, types
from sqlalchemy.orm import relationship
from app.core.database import Base


# Cross-database compatible UUID type (works with both SQLite and PostgreSQL)
class UUID(types.TypeDecorator):
    impl = types.String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return uuid.UUID(value)


class Role(Base):
    """Lookup table for system roles."""
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # athlete, coach, etc.
    description = Column(String(255), nullable=True)

    # Relationship: one role -> many users
    users = relationship("User", back_populates="role")


class User(Base):
    """Core user authentication and identity table."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    invite_code = Column(String(10), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    role = relationship("Role", back_populates="users")
    athlete_profile = relationship("AthleteProfile", back_populates="user", uselist=False, foreign_keys="[AthleteProfile.user_id]")
    video_analyses  = relationship("VideoAnalysis",  back_populates="user", order_by="VideoAnalysis.created_at.desc()")
