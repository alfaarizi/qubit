from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId


class User:
    """user model for MongoDB"""
    def __init__(
        self,
        email: str,
        hashed_password: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        is_active: bool = True,
        is_superuser: bool = False,
        oauth_provider: Optional[str] = None,
        oauth_subject_id: Optional[str] = None,
        profile_url: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        _id: Optional[ObjectId] = None,
    ):
        self._id = _id
        self.email = email
        self.hashed_password = hashed_password
        self.first_name = first_name
        self.last_name = last_name
        self.is_active = is_active
        self.is_superuser = is_superuser
        self.oauth_provider = oauth_provider  # "google", "microsoft", or None for email/password
        self.oauth_subject_id = oauth_subject_id  # unique ID from OAuth provider
        self.profile_url = profile_url  # profile picture URL
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)

    def to_dict(self) -> dict:
        """convert user to dictionary for MongoDB"""
        return {
            "email": self.email,
            "hashed_password": self.hashed_password,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "is_active": self.is_active,
            "is_superuser": self.is_superuser,
            "oauth_provider": self.oauth_provider,
            "oauth_subject_id": self.oauth_subject_id,
            "profile_url": self.profile_url,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        """create user from MongoDB document"""
        return cls(
            _id=data.get("_id"),
            email=data["email"],
            hashed_password=data.get("hashed_password"),
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            is_active=data.get("is_active", True),
            is_superuser=data.get("is_superuser", False),
            oauth_provider=data.get("oauth_provider"),
            oauth_subject_id=data.get("oauth_subject_id"),
            profile_url=data.get("profile_url"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )