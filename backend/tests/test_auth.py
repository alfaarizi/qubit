import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.db import get_database


@pytest.fixture
def test_user_data():
    """test user data"""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User"
    }

@pytest_asyncio.fixture
async def registered_user(test_user_data):
    """create and cleanup test user"""
    db = get_database()
    # cleanup before test
    db.users.delete_many({"email": test_user_data["email"]})
    yield test_user_data
    # cleanup after test
    db.users.delete_many({"email": test_user_data["email"]})


@pytest_asyncio.fixture
async def http_client():
    """create HTTP client"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

class TestUserRegistration:
    @pytest.mark.asyncio
    async def test_register_user(self, http_client, registered_user):
        """test user registration"""
        response = await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
                "first_name": registered_user["first_name"],
                "last_name": registered_user["last_name"]
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == registered_user["email"]
        assert data["first_name"] == registered_user["first_name"]
        assert data["last_name"] == registered_user["last_name"]
        assert data["is_active"] is True
        assert data["is_superuser"] is False
        assert "id" in data

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, http_client, registered_user):
        """test registration with duplicate email"""
        # register first user
        await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
                "first_name": registered_user["first_name"],
                "last_name": registered_user["last_name"]
            }
        )
        # try to register with same email
        response = await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": "differentpassword",
                "first_name": "Different",
                "last_name": "Name"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, http_client):
        """test registration with invalid email"""
        response = await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": "invalid-email",
                "password": "testpassword123",
                "first_name": "Test",
                "last_name": "User"
            }
        )
        assert response.status_code == 422


class TestUserLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, http_client, registered_user):
        """test successful login"""
        # register user first
        await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
                "first_name": registered_user["first_name"],
                "last_name": registered_user["last_name"]
            }
        )
        # login
        response = await http_client.post(
            "/api/v1/auth/login",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, http_client, registered_user):
        """test login with wrong password"""
        # register user first
        await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
                "first_name": registered_user["first_name"],
                "last_name": registered_user["last_name"]
            }
        )
        # try to login with wrong password
        response = await http_client.post(
            "/api/v1/auth/login",
            json={
                "email": registered_user["email"],
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, http_client):
        """test login with nonexistent user"""
        response = await http_client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 401


class TestTokenRefresh:
    @pytest.mark.asyncio
    async def test_refresh_token_success(self, http_client, registered_user):
        """test successful token refresh"""
        # register and login
        await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
                "first_name": registered_user["first_name"],
                "last_name": registered_user["last_name"]
            }
        )
        login_response = await http_client.post(
            "/api/v1/auth/login",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"]
            }
        )
        refresh_token = login_response.json()["refresh_token"]
        # refresh token
        response = await http_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_refresh_with_access_token(self, http_client, registered_user):
        """test refresh with access token (should fail)"""
        # register and login
        await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
                "first_name": registered_user["first_name"],
                "last_name": registered_user["last_name"]
            }
        )
        login_response = await http_client.post(
            "/api/v1/auth/login",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"]
            }
        )
        access_token = login_response.json()["access_token"]
        # try to refresh with access token
        response = await http_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": access_token}
        )
        assert response.status_code == 401

class TestProtectedEndpoint:
    @pytest.mark.asyncio
    async def test_get_current_user(self, http_client, registered_user):
        """test get current user endpoint"""
        # register and login
        await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
                "first_name": registered_user["first_name"],
                "last_name": registered_user["last_name"]
            }
        )
        login_response = await http_client.post(
            "/api/v1/auth/login",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"]
            }
        )
        access_token = login_response.json()["access_token"]
        # get current user
        response = await http_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == registered_user["email"]
        assert data["first_name"] == registered_user["first_name"]
        assert data["last_name"] == registered_user["last_name"]

    @pytest.mark.asyncio
    async def test_get_current_user_no_token(self, http_client):
        """test get current user without token"""
        response = await http_client.get("/api/v1/auth/me")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, http_client):
        """test get current user with invalid token"""
        response = await http_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401