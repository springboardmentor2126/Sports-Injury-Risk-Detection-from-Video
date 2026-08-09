import os

from app.schemas.auth import LoginRequest, SignupRequest


DEFAULT_LOGIN_EMAIL = 'athlete@example.com'
DEFAULT_LOGIN_PASSWORD = 'Athlete@123'

REGISTERED_ACCOUNTS = {
    DEFAULT_LOGIN_EMAIL.lower(): {
        'fullName': 'Athlete',
        'email': DEFAULT_LOGIN_EMAIL,
        'password': DEFAULT_LOGIN_PASSWORD,
        'role': 'athlete',
    }
}


def register_account(payload: SignupRequest) -> dict:
    normalized_email = payload.email.lower()

    if normalized_email in REGISTERED_ACCOUNTS:
        raise ValueError('An account with this email already exists.')

    account = {
        'fullName': payload.fullName.strip(),
        'email': payload.email,
        'password': payload.password,
        'role': payload.role,
    }
    REGISTERED_ACCOUNTS[normalized_email] = account
    return account


def validate_login(payload: LoginRequest) -> bool:
    normalized_email = payload.email.lower().strip()
    normalized_password = payload.password.strip()
    expected_email = os.getenv('LOGIN_EMAIL', DEFAULT_LOGIN_EMAIL).strip()
    expected_password = os.getenv('LOGIN_PASSWORD', DEFAULT_LOGIN_PASSWORD).strip()

    if normalized_email == expected_email.lower() and normalized_password == expected_password:
        return True

    account = REGISTERED_ACCOUNTS.get(normalized_email)
    return bool(account and account['password'].strip() == normalized_password)
