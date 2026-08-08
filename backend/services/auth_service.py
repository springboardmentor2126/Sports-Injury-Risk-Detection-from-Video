"""
NEW FILE. JWT issuing + verification, and the get_current_user dependency
that every ownership-aware router now depends on.
 
Why this exists: the whole point of this change is that routes must trust
*who is making the request*, not a user_id the frontend hands them. That
requires real authentication - a signed token issued at login, verified on
every subsequent request. Before this, /login just checked a password and
returned a message; there was no way for any other endpoint to know who was
asking.
"""
import os
from datetime import datetime, timedelta, timezone
 
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
 
from database.database import get_db
from database import models
 
# IMPORTANT: set a real, random SECRET_KEY via the SECRET_KEY environment
# variable in production (see .env.example). The fallback below is fine for
# local development only - anyone with it can forge valid tokens.
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-insecure-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
 
_bearer_scheme = HTTPBearer()
 
 
def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
 
 
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    FastAPI dependency. Add `current_user: models.User = Depends(get_current_user)`
    to any route that needs to know who's logged in. Raises 401 if the token
    is missing, malformed, expired, or doesn't match a real user.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (jwt.PyJWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")
 
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
 
    return user
 
 
def require_role(*allowed_roles: str):
    """
    Dependency FACTORY for protecting an endpoint to specific role(s).
    Usage:
        @router.get("/admin/something")
        def something(current_user: models.User = Depends(require_role("Administrator"))):
            ...
 
    Runs get_current_user first (so a missing/invalid token still correctly
    returns 401), then checks the role and returns 403 if it doesn't match -
    keeping the "not authenticated" vs "authenticated but not allowed"
    distinction correct (401 vs 403), which matters for RBAC done properly.
    """
    def _check_role(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"This action requires one of these roles: {', '.join(allowed_roles)}",
            )
        return current_user
 
    return _check_role
 
 
# Ready-to-use admin-only dependency - covers the common case without every
# router needing to spell out require_role("Administrator") itself.
require_admin = require_role("Administrator")
 