"""authentication endpoint integration tests"""
import pytest

@pytest.mark.asyncio
@pytest.mark.integration
class TestUserRegistration:
    """test user registration"""
    async def test_register_user(self, http_client, registered_user):
        """test user registration creates account"""
        response = await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
                "first_name": registered_user["first_name"],
                "last_name": registered_user["last_name"]
            }
        )
        assert response.status_code == 201, f"expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["email"] == registered_user["email"]
        assert data["first_name"] == registered_user["first_name"]
        assert data["last_name"] == registered_user["last_name"]
        assert data["is_active"] is True
        assert data["is_superuser"] is False
        assert "id" in data

    async def test_register_duplicate_email(self, http_client, registered_user):
        """test registration with duplicate email fails"""
        await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
                "first_name": registered_user["first_name"],
                "last_name": registered_user["last_name"]
            }
        )
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

    async def test_register_invalid_email(self, http_client):
        """test registration with invalid email format"""
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

@pytest.mark.asyncio
@pytest.mark.integration
class TestUserLogin:
    """test user login"""
    async def test_login_success(self, http_client, registered_user):
        """test successful login returns tokens"""
        await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
                "first_name": registered_user["first_name"],
                "last_name": registered_user["last_name"]
            }
        )
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

    async def test_login_wrong_password(self, http_client, registered_user):
        """test login with wrong password fails"""
        await http_client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
                "first_name": registered_user["first_name"],
                "last_name": registered_user["last_name"]
            }
        )
        response = await http_client.post(
            "/api/v1/auth/login",
            json={
                "email": registered_user["email"],
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    async def test_login_nonexistent_user(self, http_client):
        """test login with nonexistent user fails"""
        response = await http_client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 401

@pytest.mark.asyncio
@pytest.mark.integration
class TestTokenRefresh:
    """test token refresh"""
    async def test_refresh_token_success(self, http_client, registered_user):
        """test successful token refresh"""
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
        response = await http_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_refresh_with_access_token_fails(self, http_client, registered_user):
        """test refresh with access token fails"""
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
        response = await http_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": access_token}
        )
        assert response.status_code == 401

@pytest.mark.asyncio
@pytest.mark.integration
class TestProtectedEndpoint:
    """test protected endpoints"""
    async def test_get_current_user(self, http_client, registered_user):
        """test get current user endpoint"""
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
        response = await http_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == registered_user["email"]
        assert data["first_name"] == registered_user["first_name"]
        assert data["last_name"] == registered_user["last_name"]

    async def test_get_current_user_no_token(self, http_client):
        """test get current user without token fails"""
        response = await http_client.get("/api/v1/auth/me")
        assert response.status_code == 403

    async def test_get_current_user_invalid_token(self, http_client):
        """test get current user with invalid token fails"""
        response = await http_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401

@pytest.mark.asyncio
@pytest.mark.integration
class TestAuthorization:
    """test authorization and access control"""
    async def test_unauthenticated_access_denied(self, http_client):
        """test that unauthenticated requests are denied"""
        list_projects = await http_client.get("/api/v1/projects")
        assert list_projects.status_code in [401, 403]
        create_project = await http_client.post(
            "/api/v1/projects",
            json={"name": "Test", "activeCircuitId": "", "circuits": []}
        )
        assert create_project.status_code in [401, 403]
        partition = await http_client.post(
            "/api/v1/circuits/test/partition",
            json={"num_qubits": 2, "placed_gates": [], "measurements": []}
        )
        assert partition.status_code in [401, 403]

    async def test_invalid_token_rejected(self, http_client):
        """test that invalid tokens are rejected"""
        from httpx import LocalProtocolError
        invalid_tokens = [
            "invalid_token",
            "Bearer",
            "Bearer invalid.token.here",
            "not_bearer_token",
        ]
        for token in invalid_tokens:
            response = await http_client.get(
                "/api/v1/projects",
                headers={"Authorization": token}
            )
            assert response.status_code != 200, f"Token '{token}' should be rejected, got {response.status_code}"
            assert response.status_code >= 400, f"Token '{token}' should return error status, got {response.status_code}"
        # test "Bearer " separately as it causes protocol error
        try:
            response = await http_client.get(
                "/api/v1/projects",
                headers={"Authorization": "Bearer "}
            )
            assert response.status_code >= 400
        except LocalProtocolError:
            # HTTP client rejects illegal header values (trailing space violates HTTP spec)
            # this is also a valid rejection
            pass

    async def test_cross_user_resource_access_denied(self, http_client, db):
        """test that users cannot access other users' resources"""
        from tests.conftest import _create_user_data, _create_user_token
        user1_email = "crossuser1@example.com"
        user2_email = "crossuser2@example.com"
        password = "testpass123"
        db.users.delete_many({"email": {"$in": [user1_email, user2_email]}})
        db.projects.delete_many({"user_id": {"$in": [user1_email, user2_email]}})
        token1 = await _create_user_token(http_client, _create_user_data(user1_email, "Cross", "User1", password))
        token2 = await _create_user_token(http_client, _create_user_data(user2_email, "Cross", "User2", password))
        project_response = await http_client.post(
            "/api/v1/projects",
            json={
                "name": "User 1 Private Project",
                "activeCircuitId": "",
                "circuits": []
            },
            headers={"Authorization": f"Bearer {token1}"}
        )
        project_id = project_response.json()["id"]
        unauthorized_get = await http_client.get(
            f"/api/v1/projects/{project_id}",
            headers={"Authorization": f"Bearer {token2}"}
        )
        assert unauthorized_get.status_code == 404
        unauthorized_update = await http_client.put(
            f"/api/v1/projects/{project_id}",
            json={"name": "Hacked Project"},
            headers={"Authorization": f"Bearer {token2}"}
        )
        assert unauthorized_update.status_code == 404
        unauthorized_delete = await http_client.delete(
            f"/api/v1/projects/{project_id}",
            headers={"Authorization": f"Bearer {token2}"}
        )
        assert unauthorized_delete.status_code == 404
        db.users.delete_many({"email": {"$in": [user1_email, user2_email]}})
        db.projects.delete_many({"user_id": {"$in": [user1_email, user2_email]}})
