from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel
 
from database.database import get_db
from database import crud, schemas, models
from services.auth_service import create_access_token
from services import email_service, google_auth_service
 
router = APIRouter(tags=["Authentication"])
 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
 
 
class ForgotPasswordRequest(BaseModel):
    email: str
 
 
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
 
 
class GoogleSignInRequest(BaseModel):
    credential: str  # the ID token from Google Identity Services
 
 
class GoogleCompleteSignupRequest(BaseModel):
    credential: str
    role: str
 
 
def _auto_create_athlete_profile_if_needed(db: Session, user: models.User):
    """
    Shared by /register and /auth/google/complete-signup: an Athlete only
    ever has ONE profile - their own - so there's no reason to make them
    fill out a separate "create profile" form with a free-typed
    athlete_id afterward. Sport-specific fields start blank; the
    Dashboard's Edit Profile flow lets them fill those in whenever ready.
    """
    if user.role != "Athlete":
        return
    auto_athlete_id = f"ATH{user.id:04d}"
    athlete_profile = schemas.AthleteCreate(
        athlete_id=auto_athlete_id,
        sport_type="",
        position="",
        age="",
        height="",
        weight="",
        injury_history="",
        training_load="",
    )
    crud.create_athlete(db, athlete_profile, user_id=user.id)
 
 
@router.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user. Same request body, same success message, same
    400 on duplicate email as before."""
    existing = crud.get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
 
    hashed_password = pwd_context.hash(user.password)
    try:
        created = crud.create_user(
            db,
            name=user.name,
            email=user.email,
            hashed_password=hashed_password,
            role=user.role,
        )
    except IntegrityError:
        # Race condition: someone registered this exact email in the gap
        # between our check above and our insert.
        raise HTTPException(status_code=400, detail="Email already registered")
 
    _auto_create_athlete_profile_if_needed(db, created)
 
    return {"message": f"User {created.name} registered successfully"}
 
 
@router.post("/login")
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Same response shape as before (message + user{email,name,role}), PLUS a
    new access_token field. The frontend MUST store access_token and send it
    as `Authorization: Bearer <access_token>` on every request to an
    ownership-aware endpoint (athlete profiles, upload, analysis, reports) -
    those endpoints no longer trust anything the client claims about who
    it is.
    """
    user = crud.get_user_by_email(db, credentials.email)
    if not user or not pwd_context.verify(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
 
    access_token = create_access_token(user.id)
 
    return {
        "message": "Login successful",
        "user": {
            "email": user.email,
            "name": user.name,
            "role": user.role,
        },
        "access_token": access_token,
        "token_type": "bearer",
    }
 
 
@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Sends a real password reset email if the address is registered.
 
    SECURITY NOTE: always returns the same generic success message whether
    or not the email exists - this prevents someone from using this
    endpoint to check which emails are registered in the system (a common
    real-world privacy leak in "forgot password" flows).
    """
    user = crud.get_user_by_email(db, body.email)
 
    if user:
        reset_token = crud.create_password_reset_token(db, user.id)
        try:
            email_service.send_password_reset_email(user.email, reset_token.token)
        except Exception as e:
            # Don't leak SMTP configuration errors to the client - log
            # server-side only, still return the generic message so we
            # don't reveal whether the email exists via a different
            # error path.
            import logging
            logging.getLogger("uvicorn.error").exception("Failed to send password reset email")
 
    return {
        "message": "If that email is registered, a password reset link has been sent to it."
    }
 
 
@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Completes a password reset using the token from the emailed link."""
    reset_token = crud.get_valid_reset_token(db, body.token)
    if not reset_token:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")
 
    from database import models
    user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")
 
    hashed_password = pwd_context.hash(body.new_password)
    crud.update_user_password(db, user, hashed_password)
    crud.mark_reset_token_used(db, reset_token)
 
    return {"message": "Your password has been reset successfully. You can now log in."}
 
 
@router.post("/auth/google")
def google_sign_in(body: GoogleSignInRequest, db: Session = Depends(get_db)):
    """
    Called every time someone clicks "Sign in with Google" - verifies the
    credential server-side (never trusts anything the frontend claims), then:
      - If a user with this email already exists: logs them straight in,
        issuing our own JWT, regardless of whether they originally signed
        up with a password or via Google.
      - If not: does NOT create the account yet, since we don't know their
        role (Athlete/Coach/Physio/etc.) - returns is_new_user=true so the
        frontend can show a "choose your role" step, then call
        /auth/google/complete-signup with the SAME credential.
    """
    payload = google_auth_service.verify_google_token(body.credential)
    email = payload["email"]
    name = payload.get("name", email.split("@")[0])
 
    user = crud.get_user_by_email(db, email)
 
    if not user:
        return {
            "is_new_user": True,
            "email": email,
            "name": name,
        }
 
    access_token = create_access_token(user.id)
    return {
        "is_new_user": False,
        "message": "Login successful",
        "user": {
            "email": user.email,
            "name": user.name,
            "role": user.role,
        },
        "access_token": access_token,
        "token_type": "bearer",
    }
 
 
@router.post("/auth/google/complete-signup")
def google_complete_signup(body: GoogleCompleteSignupRequest, db: Session = Depends(get_db)):
    """
    Finishes creating an account for a first-time Google sign-in, now that
    the frontend has collected a role. Re-verifies the credential (the
    email/name are never taken from the first call's response - always
    re-derived from the token itself) so this can't be spoofed by someone
    posting an arbitrary email/role pair.
    """
    payload = google_auth_service.verify_google_token(body.credential)
    email = payload["email"]
    name = payload.get("name", email.split("@")[0])
 
    if body.role not in schemas.SELF_REGISTERABLE_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Role must be one of: {', '.join(sorted(schemas.SELF_REGISTERABLE_ROLES))}",
        )
 
    existing = crud.get_user_by_email(db, email)
    if existing:
        # They already completed signup (e.g. double-submitted) - just log
        # them in instead of erroring.
        access_token = create_access_token(existing.id)
        return {
            "message": "Login successful",
            "user": {"email": existing.email, "name": existing.name, "role": existing.role},
            "access_token": access_token,
            "token_type": "bearer",
        }
 
    # Google-authenticated users don't set a password at signup - generate
    # a random one they'll never need, so hashed_password (NOT NULL) is
    # still satisfied. They can set a real one anytime via Forgot Password.
    import secrets
    random_password = secrets.token_urlsafe(32)
    hashed_password = pwd_context.hash(random_password)
 
    try:
        created = crud.create_user(
            db,
            name=name,
            email=email,
            hashed_password=hashed_password,
            role=body.role,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
 
    _auto_create_athlete_profile_if_needed(db, created)
 
    access_token = create_access_token(created.id)
    return {
        "message": f"Account created for {created.name} via Google Sign-In.",
        "user": {"email": created.email, "name": created.name, "role": created.role},
        "access_token": access_token,
        "token_type": "bearer",
    }
 