"""model serialization unit tests"""
import pytest
from datetime import datetime, timezone
from bson import ObjectId
from app.models.user import User
from app.models.project import Project, CircuitInfo, SerializedGate, GateDefinition


@pytest.mark.unit
class TestUserModel:
    """test user model serialization"""
    def test_user_to_dict(self):
        """test user to_dict conversion"""
        user = User(
            email="test@example.com",
            hashed_password="hashed_password",
            first_name="John",
            last_name="Doe",
            is_active=True,
            is_superuser=False
        )
        data = user.to_dict()
        assert data["email"] == "test@example.com"
        assert data["hashed_password"] == "hashed_password"
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"
        assert data["is_active"] is True
        assert data["is_superuser"] is False
        assert "created_at" in data
        assert "updated_at" in data

    def test_user_from_dict(self):
        """test user from_dict creation"""
        data = {
            "email": "test@example.com",
            "hashed_password": "hashed_password",
            "first_name": "John",
            "last_name": "Doe",
            "is_active": True,
            "is_superuser": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        user = User.from_dict(data)
        assert user.email == "test@example.com"
        assert user.hashed_password == "hashed_password"
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.is_active is True
        assert user.is_superuser is False

    def test_user_from_dict_with_id(self):
        """test user from_dict with MongoDB _id"""
        user_id = ObjectId()
        data = {
            "_id": user_id,
            "email": "test@example.com",
            "hashed_password": "hashed_password"
        }
        user = User.from_dict(data)
        assert user._id == user_id

    def test_user_oauth_fields(self):
        """test user oauth fields serialization"""
        user = User(
            email="oauth@example.com",
            oauth_provider="google",
            oauth_subject_id="google_123",
            profile_url="https://example.com/profile.jpg"
        )
        data = user.to_dict()
        assert data["oauth_provider"] == "google"
        assert data["oauth_subject_id"] == "google_123"
        assert data["profile_url"] == "https://example.com/profile.jpg"

    def test_user_defaults(self):
        """test user default values"""
        user = User(email="test@example.com")
        assert user.is_active is True
        assert user.is_superuser is False
        assert user.hashed_password is None
        assert user.first_name is None
        assert user.last_name is None


@pytest.mark.unit
class TestProjectModel:
    """test project model serialization"""
    def test_project_to_dict(self):
        """test project to_dict conversion"""
        project = Project(
            user_id="user123",
            name="Test Project",
            description="Test Description",
            active_circuit_id="circuit1",
            circuits=[]
        )
        data = project.to_dict()
        assert data["user_id"] == "user123"
        assert data["name"] == "Test Project"
        assert data["description"] == "Test Description"
        assert data["active_circuit_id"] == "circuit1"
        assert data["circuits"] == []
        assert "created_at" in data
        assert "updated_at" in data

    def test_project_to_dict_with_id(self):
        """test project to_dict with id converts to ObjectId"""
        project = Project(
            id="507f1f77bcf86cd799439011",
            user_id="user123",
            name="Test Project",
            active_circuit_id="circuit1",
            circuits=[]
        )
        data = project.to_dict()
        assert isinstance(data["_id"], ObjectId)
        assert str(data["_id"]) == "507f1f77bcf86cd799439011"

    def test_project_from_dict(self):
        """test project from_dict creation"""
        data = {
            "_id": "507f1f77bcf86cd799439011",
            "user_id": "user123",
            "name": "Test Project",
            "description": "Test Description",
            "active_circuit_id": "circuit1",
            "circuits": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        project = Project.from_dict(data)
        assert project.id == "507f1f77bcf86cd799439011"
        assert project.user_id == "user123"
        assert project.name == "Test Project"
        assert project.description == "Test Description"

    def test_project_from_dict_with_objectid(self):
        """test project from_dict with ObjectId"""
        user_id = ObjectId()
        data = {
            "_id": user_id,
            "user_id": "user123",
            "name": "Test Project",
            "active_circuit_id": "circuit1",
            "circuits": []
        }
        project = Project.from_dict(data)
        assert project.id == str(user_id)

    def test_project_with_circuits(self):
        """test project with circuits serialization"""
        circuit = CircuitInfo(
            id="circuit1",
            name="Test Circuit",
            numQubits=2,
            gates=[
                SerializedGate(
                    id="gate1",
                    depth=0,
                    gate=GateDefinition(name="H"),
                    target_qubits=[0]
                )
            ]
        )
        project = Project(
            user_id="user123",
            name="Test Project",
            active_circuit_id="circuit1",
            circuits=[circuit]
        )
        data = project.to_dict()
        assert len(data["circuits"]) == 1
        assert data["circuits"][0]["id"] == "circuit1"

