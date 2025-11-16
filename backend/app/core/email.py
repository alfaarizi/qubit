"""email verification service using Resend"""
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
import resend
from app.core.config import settings

resend.api_key = settings.RESEND_API_KEY

# in-memory storage for verification codes (#TODO: use redis/db)
verification_codes: Dict[str, Dict[str, any]] = {}

def generate_verification_code() -> str:
    """generate a random 5-digit verification code"""
    return ''.join(random.choices(string.digits, k=5))

def send_verification_email(email: str) -> str:
    """send verification code to email and return the code"""
    # use hardcoded test code in testing environment for E2E tests
    if settings.ENVIRONMENT == "testing":
        code = "12345"
        print(f"[Email] TESTING MODE: using test code {code} for {email}")
    else:
        code = generate_verification_code()

    # store code with expiration (10 minutes)
    verification_codes[email] = {
        "code": code,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "attempts": 0
    }

    # skip sending actual email in testing environment
    if settings.ENVIRONMENT == "testing":
        print(f"[Email] TESTING MODE: skipping email send for {email}")
        return code

    try:
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": email,
            "subject": "Your QubitKit verification code",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Welcome to QubitKit</h2>
                <p>Your verification code is:</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #1f2937; letter-spacing: 8px; margin: 0;">{code}</h1>
                </div>
                <p style="color: #6b7280;">This code will expire in 10 minutes.</p>
                <p style="color: #6b7280;">If you didn't request this code, please ignore this email.</p>
            </div>
            """
        })
    except Exception as e:
        print(f"[Email] failed to send verification email: {str(e)}")
        raise
    return code

def verify_code(email: str, code: str) -> bool:
    """verify the code for the given email"""
    if email not in verification_codes:
        return False
    stored = verification_codes[email]
    # check expiration
    if datetime.now(timezone.utc) > stored["expires_at"]:
        del verification_codes[email]
        return False
    # check attempts (max 3 attempts)
    if stored["attempts"] >= 3:
        del verification_codes[email]
        return False
    # increment attempts
    stored["attempts"] += 1
    # verify code
    if stored["code"] == code:
        del verification_codes[email]
        return True
    return False

def cleanup_expired_codes():
    """remove expired verification codes"""
    current_time = datetime.now(timezone.utc)
    expired_emails = [
        email for email, data in verification_codes.items()
        if current_time > data["expires_at"]
    ]
    for email in expired_emails:
        del verification_codes[email]
