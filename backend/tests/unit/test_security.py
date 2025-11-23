"""security functions unit tests"""
import pytest
from datetime import timedelta
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_token
)
from app.core.config import settings


@pytest.mark.unit
class TestPasswordHashing:
    """test password hashing and verification"""
    def test_password_hash_creates_hash(self):
        """test password hash creates non-empty string"""
        password = "test_password_123"
        hashed = get_password_hash(password)
        assert hashed is not None
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        assert hashed != password

    def test_verify_password_correct(self):
        """test password verification succeeds with correct password"""
        password = "test_password_123"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """test password verification fails with incorrect password"""
        password = "test_password_123"
        wrong_password = "wrong_password"
        hashed = get_password_hash(password)
        assert verify_password(wrong_password, hashed) is False

    def test_different_passwords_produce_different_hashes(self):
        """test different passwords produce different hashes"""
        password1 = "password1"
        password2 = "password2"
        hash1 = get_password_hash(password1)
        hash2 = get_password_hash(password2)
        assert hash1 != hash2

    def test_same_password_produces_different_hashes(self):
        """test same password produces different hashes (salt)"""
        password = "same_password"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


@pytest.mark.unit
class TestJWTTokenCreation:
    """test JWT token creation"""
    def test_create_access_token_returns_string(self):
        """test access token creation returns string"""
        subject = "test@example.com"
        token = create_access_token(subject)
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_refresh_token_returns_string(self):
        """test refresh token creation returns string"""
        subject = "test@example.com"
        token = create_refresh_token(subject)
        assert isinstance(token, str)
        assert len(token) > 0

    def test_access_token_contains_subject(self):
        """test access token contains correct subject"""
        subject = "test@example.com"
        token = create_access_token(subject)
        decoded_subject = verify_token(token, token_type="access")
        assert decoded_subject == subject

    def test_refresh_token_contains_subject(self):
        """test refresh token contains correct subject"""
        subject = "test@example.com"
        token = create_refresh_token(subject)
        decoded_subject = verify_token(token, token_type="refresh")
        assert decoded_subject == subject

    def test_access_token_expires(self):
        """test access token expires after specified time"""
        subject = "test@example.com"
        expires_delta = timedelta(seconds=-1)
        token = create_access_token(subject, expires_delta=expires_delta)
        decoded_subject = verify_token(token, token_type="access")
        assert decoded_subject is None

    def test_refresh_token_expires(self):
        """test refresh token expires after specified time"""
        subject = "test@example.com"
        expires_delta = timedelta(seconds=-1)
        token = create_refresh_token(subject, expires_delta=expires_delta)
        decoded_subject = verify_token(token, token_type="refresh")
        assert decoded_subject is None

    def test_access_token_wrong_type_rejected(self):
        """test access token rejected when verified as refresh token"""
        subject = "test@example.com"
        token = create_access_token(subject)
        decoded_subject = verify_token(token, token_type="refresh")
        assert decoded_subject is None

    def test_refresh_token_wrong_type_rejected(self):
        """test refresh token rejected when verified as access token"""
        subject = "test@example.com"
        token = create_refresh_token(subject)
        decoded_subject = verify_token(token, token_type="access")
        assert decoded_subject is None

    def test_invalid_token_rejected(self):
        """test invalid token is rejected"""
        invalid_token = "invalid.token.here"
        decoded_subject = verify_token(invalid_token, token_type="access")
        assert decoded_subject is None

    def test_empty_token_rejected(self):
        """test empty token is rejected"""
        decoded_subject = verify_token("", token_type="access")
        assert decoded_subject is None

    def test_different_subjects_produce_different_tokens(self):
        """test different subjects produce different tokens"""
        subject1 = "user1@example.com"
        subject2 = "user2@example.com"
        token1 = create_access_token(subject1)
        token2 = create_access_token(subject2)
        assert token1 != token2

