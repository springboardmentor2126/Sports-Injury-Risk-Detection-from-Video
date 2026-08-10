import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from . import models
from .database import get_db

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
# SECRET_KEY must come from .env in real use. The fallback below is only
# so the app doesn't crash on first run -- change it before deploying.
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_IN_PRODUCTION")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        raw_user_id = payload.get("sub")
        if raw_user_id is None:
            raise credentials_exception
        # Explicit cast rather than relying on the DB driver to coerce a
        # plain string into the UUID column -- also turns a
        # malformed/tampered token into a clean 401 instead of a 500.
        user_id = uuid.UUID(raw_user_id)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


# require_role(*allowed_roles) used to live here for the multi-role
# (coach/physiotherapist/sports_scientist/admin) staff-viewing endpoints.
# Single-athlete scope removed all of those, so there's no RBAC left
# beyond "is this your own data" (handled inline in routers/video.py and
# routers/athlete.py) -- nothing to reintroduce this for right now.

