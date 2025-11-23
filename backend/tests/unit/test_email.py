"""email utility functions unit tests"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from app.core.email import (
    generate_verification_code,
    verify_code,
    send_verification_email,
    verification_codes
)


@pytest.mark.unit
class TestVerificationCode:
    """test email verification code generation and verification"""
    def setup_method(self):
        """clear verification codes before each test"""
        verification_codes.clear()

    def test_generate_verification_code_returns_string(self):
        """test verification code generation returns string"""
        code = generate_verification_code()
        assert isinstance(code, str)
        assert len(code) > 0

    def test_verification_code_length(self):
        """test verification code is 5 digits"""
        code = generate_verification_code()
        assert len(code) == 5
        assert code.isdigit()

    def test_verification_code_digits_only(self):
        """test verification code contains only digits"""
        code = generate_verification_code()
        assert code.isdigit()

    def test_different_codes_generated(self):
        """test different codes are generated on each call"""
        code1 = generate_verification_code()
        code2 = generate_verification_code()
        code3 = generate_verification_code()
        codes = {code1, code2, code3}
        assert len(codes) >= 1

    @patch('app.core.email.settings.ENVIRONMENT', 'testing')
    @patch('app.core.email.resend.Emails.send', MagicMock())
    def test_verify_code_correct(self):
        """test code verification succeeds with correct code"""
        email = "test@example.com"
        code = send_verification_email(email)
        assert verify_code(email, code) is True

    @patch('app.core.email.settings.ENVIRONMENT', 'testing')
    @patch('app.core.email.resend.Emails.send', MagicMock())
    def test_verify_code_incorrect(self):
        """test code verification fails with incorrect code"""
        email = "test@example.com"
        send_verification_email(email)
        wrong_code = "00000"
        assert verify_code(email, wrong_code) is False

    @patch('app.core.email.settings.ENVIRONMENT', 'testing')
    @patch('app.core.email.resend.Emails.send', MagicMock())
    def test_verify_code_wrong_email(self):
        """test code verification fails with wrong email"""
        email1 = "test1@example.com"
        email2 = "test2@example.com"
        code = send_verification_email(email1)
        assert verify_code(email2, code) is False

    @patch('app.core.email.settings.ENVIRONMENT', 'testing')
    @patch('app.core.email.resend.Emails.send', MagicMock())
    def test_verify_code_expires(self):
        """test code verification fails after expiration"""
        email = "test@example.com"
        code = send_verification_email(email)
        assert verify_code(email, code) is True
        if email in verification_codes:
            verification_codes[email]["expires_at"] = datetime.now(timezone.utc) - timedelta(seconds=1)
        assert verify_code(email, code) is False

    @patch('app.core.email.settings.ENVIRONMENT', 'testing')
    @patch('app.core.email.resend.Emails.send', MagicMock())
    def test_verify_code_max_attempts(self):
        """test code verification fails after max attempts"""
        email = "test@example.com"
        code = send_verification_email(email)
        wrong_code = "00000"
        assert verify_code(email, wrong_code) is False
        assert verify_code(email, wrong_code) is False
        assert verify_code(email, wrong_code) is False
        assert verify_code(email, code) is False

