"""test API endpoints - real integration tests matching actual endpoints"""
import pytest
from app.db import get_database

class TestHealthEndpoint:
    """test health check endpoint"""
    @pytest.mark.asyncio
    async def test_health_check_returns_status(self, http_client):
        """test health check returns status with dependencies"""
        response = await http_client.get("/api/v1/health/")
        assert response.status_code in [200, 503]
        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "unhealthy", "degraded"]

class TestAuthenticationEndpoints:
    """test authentication endpoints"""
    @pytest.mark.asyncio
    async def test_register_creates_user(self, http_client):
        """test user registration creates account"""
        db = get_database()
        db.users.delete_many({"email": "newuser@example.com"})
        response = await http_client.post(
            "/api/v1/auth/register",
            json={"email": "newuser@example.com", "password": "testpass123", "first_name": "New", "last_name": "User"}
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["email"] == "newuser@example.com"
        db.users.delete_many({"email": "newuser@example.com"})

    @pytest.mark.asyncio
    async def test_register_duplicate_email_fails(self, http_client):
        """test registration with duplicate email fails"""
        response1 = await http_client.post(
            "/api/v1/auth/register",
            json={"email": "duplicate@example.com", "password": "testpass123", "first_name": "Test", "last_name": "User"}
        )
        response2 = await http_client.post(
            "/api/v1/auth/register",
            json={"email": "duplicate@example.com", "password": "testpass456", "first_name": "Test2", "last_name": "User2"}
        )
        assert response1.status_code == 201, f"First registration failed: {response1.text}"
        assert response2.status_code == 400, f"Duplicate should fail with 400, got {response2.status_code}"
        db = get_database()
        db.users.delete_many({"email": "duplicate@example.com"})

    @pytest.mark.asyncio
    async def test_login_returns_tokens(self, http_client):
        """test login returns access and refresh tokens"""
        db = get_database()
        db.users.delete_many({"email": "apitest@example.com"})
        await http_client.post(
            "/api/v1/auth/register",
            json={"email": "apitest@example.com", "password": "testpass123", "first_name": "API", "last_name": "Test"}
        )
        response = await http_client.post(
            "/api/v1/auth/login",
            json={"email": "apitest@example.com", "password": "testpass123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password_fails(self, http_client):
        """test login with wrong password fails"""
        db = get_database()
        db.users.delete_many({"email": "apitest@example.com"})
        await http_client.post(
            "/api/v1/auth/register",
            json={"email": "apitest@example.com", "password": "testpass123", "first_name": "API", "last_name": "Test"}
        )
        response = await http_client.post(
            "/api/v1/auth/login",
            json={"email": "apitest@example.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        db.users.delete_many({"email": "apitest@example.com"})

    @pytest.mark.asyncio
    async def test_refresh_token_creates_new_token(self, http_client):
        """test token refresh creates new access token"""
        db = get_database()
        db.users.delete_many({"email": "apitest@example.com"})
        await http_client.post(
            "/api/v1/auth/register",
            json={"email": "apitest@example.com", "password": "testpass123", "first_name": "API", "last_name": "Test"}
        )
        login = await http_client.post(
            "/api/v1/auth/login",
            json={"email": "apitest@example.com", "password": "testpass123"}
        )
        refresh_token = login.json()["refresh_token"]
        response = await http_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()
        db.users.delete_many({"email": "apitest@example.com"})

class TestProjectEndpoints:
    """test project CRUD endpoints"""
    @pytest.mark.asyncio
    async def test_list_projects_requires_auth(self, http_client):
        """test listing projects without auth fails"""
        response = await http_client.get("/api/v1/projects")
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_list_projects_returns_array(self, http_client, authenticated_user):
        """test list projects returns array of projects"""
        response = await http_client.get(
            "/api/v1/projects",
            headers={"Authorization": f"Bearer {authenticated_user}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_create_project_requires_auth(self, http_client):
        """test creating project without auth fails"""
        response = await http_client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "activeCircuitId": ""}
        )
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_create_project_with_valid_data(self, http_client, authenticated_user):
        """test creating project with valid data succeeds"""
        response = await http_client.post(
            "/api/v1/projects",
            json={"name": "New Project", "activeCircuitId": ""},
            headers={"Authorization": f"Bearer {authenticated_user}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Project"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_get_project_requires_valid_id(self, http_client, authenticated_user):
        """test get project with invalid ID fails"""
        response = await http_client.get(
            "/api/v1/projects/invalid",
            headers={"Authorization": f"Bearer {authenticated_user}"}
        )
        assert response.status_code in [400, 404]

class TestCircuitEndpoints:
    """test circuit partitioning endpoints"""
    @pytest.mark.asyncio
    async def test_partition_circuit_requires_auth(self, http_client):
        """test partition endpoint requires authentication"""
        response = await http_client.post(
            "/api/v1/circuits/circuit1/partition",
            json={"num_qubits": 2, "placed_gates": [], "measurements": []}
        )
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_partition_circuit_validates_data(self, http_client, authenticated_user):
        """test partition endpoint validates circuit data"""
        response = await http_client.post(
            "/api/v1/circuits/circuit1/partition",
            json={"num_qubits": 0, "placed_gates": [], "measurements": []},
            headers={"Authorization": f"Bearer {authenticated_user}"}
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_partition_circuit_returns_job_id(self, http_client, authenticated_user):
        """test partition returns job ID for async processing"""
        response = await http_client.post(
            "/api/v1/circuits/circuit1/partition",
            json={"num_qubits": 2, "placed_gates": [{"id": "g1", "name": "H"}], "measurements": []},
            headers={"Authorization": f"Bearer {authenticated_user}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "queued"

class TestAuthorizationAndErrors:
    """test authorization and error handling"""
    @pytest.mark.asyncio
    async def test_missing_bearer_token_rejected(self, http_client):
        """test request without bearer token fails"""
        response = await http_client.get("/api/v1/projects")
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_invalid_bearer_token_rejected(self, http_client):
        """test invalid bearer token fails"""
        response = await http_client.get(
            "/api/v1/projects",
            headers={"Authorization": "Bearer invalid_token_xyz"}
        )
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_malformed_authorization_header(self, http_client):
        """test malformed auth header fails"""
        response = await http_client.get(
            "/api/v1/projects",
            headers={"Authorization": "MalformedToken"}
        )
        assert response.status_code in [401, 403]

