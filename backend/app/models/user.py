from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId


class User:
    """user model for MongoDB"""
    def __init__(
        self,
        email: str,
        hashed_password: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        is_active: bool = True,
        is_superuser: bool = False,
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
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "User":
        """create user from MongoDB document"""
        return cls(
            _id=data.get("_id"),
            email=data["email"],
            hashed_password=data["hashed_password"],
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            is_active=data.get("is_active", True),
            is_superuser=data.get("is_superuser", False),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )