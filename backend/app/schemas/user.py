from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserCreate(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    """User login request"""
    email: EmailStr
    password: str

class User(BaseModel):
    """User response"""
    email: EmailStr
    created_at: int = Field(alias="createdAt")

    class Config:
        populate_by_name = True

class UserInDB(User):
    """User in database with hashed password"""
    hashed_password: str = Field(alias="hashedPassword")

class Token(BaseModel):
    """JWT token response"""
    access_token: str = Field(alias="accessToken")
    token_type: str = Field(default="bearer", alias="tokenType")
    user: User

    class Config:
        populate_by_name = True
