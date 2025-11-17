from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

class UserBase(BaseModel):
    """base user schema"""
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    """schema for user registration"""
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """validate password does not contain null bytes"""
        if "\x00" in v:
            raise ValueError("password cannot contain null bytes")
        return v

class UserLogin(BaseModel):
    """schema for user login"""
    email: EmailStr
    password: str

class UserResponse(UserBase):
    """schema for user response"""
    id: str
    is_active: bool
    is_superuser: bool
    oauth_provider: Optional[str] = None
    profile_url: Optional[str] = None
    class Config:
        from_attributes = True

class Token(BaseModel):
    """schema for token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    """schema for JWT token payload"""
    sub: str
    exp: int
    type: str = "access"

class RefreshToken(BaseModel):
    """schema for refresh token request"""
    refresh_token: str

class OAuthLogin(BaseModel):
    """schema for OAuth login"""
    token: str  # ID token from OAuth provider
    provider: str  # "google" or "microsoft"

class EmailVerificationRequest(BaseModel):
    """schema for requesting email verification code"""
    email: EmailStr

class EmailVerificationVerify(BaseModel):
    """schema for verifying email code"""
    email: EmailStr
    code: str = Field(..., min_length=5, max_length=5)