from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models.user import User, Role
from app.schemas.user import UserCreate, UserResponse, Token
import secrets

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ─── Register ──────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account."""

    # Check if email already exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # Validate role exists
    role = db.query(Role).filter(Role.id == user_data.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role selected."
        )

    # Generate invite code for professionals
    invite_code = None
    if role.name in ["coach", "physiotherapist"]:
        # generate 6 char hex code e.g. 8A3F9B
        invite_code = secrets.token_hex(3).upper()

    # Create new user
    new_user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role_id=user_data.role_id,
        invite_code=invite_code
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ─── Login ─────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login with email and password. Returns a JWT access token."""

    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated."
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


# ─── Get Current User ──────────────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency: Decode JWT and return the current logged-in user."""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the profile of the currently logged-in user."""
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Delete the current user's account and all associated data.
    This includes their athlete profile, all video analyses, and saved physical files.
    """
    import shutil
    from pathlib import Path
    from app.models.athlete import AthleteProfile
    from app.models.video_analysis import VideoAnalysis
    
    # 1. Delete associated physical files (video analysis outputs)
    analyses = db.query(VideoAnalysis).filter(VideoAnalysis.user_id == str(current_user.id)).all()
    output_dir_base = Path("uploads/pose_outputs")
    for analysis in analyses:
        session_dir = output_dir_base / analysis.session_id
        if session_dir.exists() and session_dir.is_dir():
            shutil.rmtree(session_dir, ignore_errors=True)
    
    # 2. Delete DB records
    # Due to SQLAlchemy relationships without cascade="all, delete-orphan", 
    # we manually delete children to avoid foreign key constraint errors.
    db.query(VideoAnalysis).filter(VideoAnalysis.user_id == str(current_user.id)).delete()
    db.query(AthleteProfile).filter(AthleteProfile.user_id == str(current_user.id)).delete()
    
    # 3. Delete the user
    db.delete(current_user)
    db.commit()
    
    return None
