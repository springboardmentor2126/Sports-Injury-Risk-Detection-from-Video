"""
Verifies Google Sign-In ID tokens.
 
REQUIRED SETUP: create a Google Cloud OAuth Client ID (see the walkthrough
provided separately), then set it in your .env:
    GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
 
Never trust an email/name that the FRONTEND claims came from Google -
always re-verify the raw credential (ID token) server-side, which is what
this module does. The frontend only ever sees/sends the opaque token
string, never a "trust me, this is the user" payload.
"""
import os
 
from fastapi import HTTPException
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
 
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
 
 
def verify_google_token(credential: str) -> dict:
    """
    Verifies the ID token's signature and audience against Google's public
    keys. Raises HTTPException(401) if it's invalid, expired, or issued for
    a different client ID than ours.
 
    Returns a dict with at least: email, email_verified, name, sub (Google's
    unique user id).
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLIENT_ID is not configured on the server - Google Sign-In is unavailable.",
        )
 
    try:
        payload = id_token.verify_oauth2_token(
            credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google credential: {e}")
 
    if not payload.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Google account email is not verified.")
 
    return payload
 