"""
Real email sending via SMTP (Gmail by default). Used for the Forgot
Password flow.
 
REQUIRED SETUP (Gmail):
1. Turn on 2-Step Verification on the Gmail account you want to send from:
   https://myaccount.google.com/security
2. Generate an App Password:
   https://myaccount.google.com/apppasswords
   (Select app: "Mail", device: "Other" - name it e.g. "SportsAI backend")
   Google gives you a 16-character password - this is NOT your normal
   Gmail password, and it's the only time you'll see it.
3. Add both to your .env file (see .env.example):
   SMTP_EMAIL=youraddress@gmail.com
   SMTP_APP_PASSWORD=the16characterapppassword
"""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
 
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD")
 
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
 
 
def send_email(to_email: str, subject: str, body_html: str):
    if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
        raise Exception(
            "SMTP_EMAIL / SMTP_APP_PASSWORD are not set. Add them to your "
            ".env file to enable sending real emails (see the setup notes "
            "at the top of services/email_service.py)."
        )
 
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email
    msg.attach(MIMEText(body_html, "html"))
 
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
        server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
 
 
def send_password_reset_email(to_email: str, token: str):
    reset_link = f"{FRONTEND_BASE_URL}/reset-password?token={token}"
    subject = "Reset your SportsAI password"
    body_html = f"""
    <div style="font-family: sans-serif; max-width: 480px;">
      <h2>Reset your SportsAI password</h2>
      <p>We received a request to reset your password. Click the button below
      to choose a new one:</p>
      <p>
        <a href="{reset_link}"
           style="background:#2563EB;color:#fff;padding:10px 20px;
                  border-radius:6px;text-decoration:none;display:inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color:#64748B;font-size:13px;">
        This link expires in 30 minutes. If you didn't request this, you can
        safely ignore this email - your password will not be changed.
      </p>
    </div>
    """
    send_email(to_email, subject, body_html)
 