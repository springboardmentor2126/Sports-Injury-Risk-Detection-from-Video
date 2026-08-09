import hashlib
import os

from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.auth import SignupRequest

DEFAULT_DEMO_EMAIL = os.getenv('LOGIN_EMAIL', 'athlete@example.com').strip()
DEFAULT_DEMO_PASSWORD = os.getenv('LOGIN_PASSWORD', 'Athlete@123').strip()
DEFAULT_DEMO_ROLE = 'athlete'


def _hash_password(password: str) -> str:
    """Hash passwords with PBKDF2 using only Python standard-library primitives."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100_000)
    return f'pbkdf2_sha256$100000${salt.hex()}${digest.hex()}'


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, salt_hex, digest_hex = password_hash.split('$')
    except ValueError:
        return False

    if algorithm != 'pbkdf2_sha256':
        return False

    digest = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        bytes.fromhex(salt_hex),
        int(iterations),
    )
    return digest.hex() == digest_hex


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.strip().lower()).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.user_id == user_id).first()


def create_user(db: Session, payload: SignupRequest) -> User:
    user = User(
        full_name=payload.fullName.strip(),
        email=payload.email.strip().lower(),
        password_hash=_hash_password(payload.password),
        role=payload.role.strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def seed_default_demo_user(db: Session) -> User | None:
    normalized_email = DEFAULT_DEMO_EMAIL.lower()
    existing_user = get_user_by_email(db, normalized_email)
    if existing_user is not None:
        return existing_user

    user = User(
        full_name='Athlete',
        email=normalized_email,
        password_hash=_hash_password(DEFAULT_DEMO_PASSWORD),
        role=DEFAULT_DEMO_ROLE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    normalized_email = email.strip().lower()
    user = get_user_by_email(db, normalized_email)

    if not user:
        if normalized_email == DEFAULT_DEMO_EMAIL.lower() and password.strip() == DEFAULT_DEMO_PASSWORD:
            user = seed_default_demo_user(db)
        else:
            return None

    if not _verify_password(password.strip(), user.password_hash):
        return None

    return user
