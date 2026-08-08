"""
Creates the ONE Administrator account for this platform, from environment
variables - never hardcoded, never asked for interactively, never exposed
through any API endpoint (registration explicitly rejects "Administrator"
as a self-registerable role - see database/schemas.py).
 
SETUP:
1. Add these three lines to your .env (see .env.example):
       ADMIN_NAME=Your Name
       ADMIN_EMAIL=admin@yourcompany.com
       ADMIN_PASSWORD=choose-a-strong-password
2. Run this script once:
       python seed_admin.py
3. (Optional but recommended) Remove ADMIN_PASSWORD from .env afterward -
   it's only needed at seed time, not for the app to run day-to-day.
 
Safe to re-run: if an admin with that email already exists, it does
nothing and tells you so, rather than creating a duplicate or overwriting
the existing password.
"""
import os
import sys
 
from dotenv import load_dotenv
from passlib.context import CryptContext
 
load_dotenv()
 
from database.database import SessionLocal
from database import models
 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
 
 
def main():
    admin_name = os.getenv("ADMIN_NAME")
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
 
    if not admin_email or not admin_password:
        print(
            "ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in your .env file "
            "before running this script. See the setup notes at the top of this file."
        )
        sys.exit(1)
 
    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.email == admin_email).first()
        if existing:
            print(f"An account with email '{admin_email}' already exists (role={existing.role}).")
            if existing.role != "Administrator":
                print(
                    "WARNING: that account is NOT an Administrator. This script will not "
                    "modify an existing account's role - resolve this manually if needed."
                )
            else:
                print("Nothing to do - the admin account already exists.")
            return
 
        hashed_password = pwd_context.hash(admin_password)
        admin_user = models.User(
            name=admin_name or "Administrator",
            email=admin_email,
            hashed_password=hashed_password,
            role="Administrator",
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
 
        print(f"Administrator account created successfully: {admin_user.email} (id={admin_user.id})")
        print("You can now log in normally at /login with this email and the password from .env.")
 
    finally:
        db.close()
 
 
if __name__ == "__main__":
    main()
 