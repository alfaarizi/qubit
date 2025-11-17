"""project endpoint integration tests"""
import pytest
from app.db import get_database
from bson import ObjectId

@pytest.mark.asyncio
@pytest.mark.integration
class TestProjectCRUD:
    """test project CRUD operations"""
    async def test_create_project(self, http_client, authenticated_user):
        """test creating project with valid data"""
        db = get_database()
        token = authenticated_user
        me_response = await http_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        user_email = me_response.json()["email"]
        try:
            response = await http_client.post(
                "/api/v1/projects",
                json={
                    "name": "Test Project",
                    "description": "Test description",
                    "activeCircuitId": "",
                    "circuits": []
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "Test Project"
            assert data["description"] == "Test description"
            assert "id" in data
            assert "createdAt" in data
            assert "updatedAt" in data
        finally:
            db.projects.delete_many({"user_id": user_email})

    async def test_list_projects(self, http_client, authenticated_user):
        """test listing user's projects"""
        token = authenticated_user
        response = await http_client.get(
            "/api/v1/projects",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_project(self, http_client, authenticated_user):
        """test getting project by id"""
        db = get_database()
        token = authenticated_user
        me_response = await http_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        user_email = me_response.json()["email"]
        try:
            create_response = await http_client.post(
                "/api/v1/projects",
                json={
                    "name": "Get Test Project",
                    "activeCircuitId": "",
                    "circuits": []
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            project_id = create_response.json()["id"]
            get_response = await http_client.get(
                f"/api/v1/projects/{project_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert get_response.status_code == 200
            data = get_response.json()
            assert data["id"] == project_id
            assert data["name"] == "Get Test Project"
        finally:
            db.projects.delete_many({"user_id": user_email})

    async def test_update_project(self, http_client, authenticated_user):
        """test updating project"""
        db = get_database()
        token = authenticated_user
        me_response = await http_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        user_email = me_response.json()["email"]
        try:
            create_response = await http_client.post(
                "/api/v1/projects",
                json={
                    "name": "Original Name",
                    "activeCircuitId": "",
                    "circuits": []
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            project_id = create_response.json()["id"]
            update_response = await http_client.put(
                f"/api/v1/projects/{project_id}",
                json={"name": "Updated Name"},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert update_response.status_code == 200
            data = update_response.json()
            assert data["name"] == "Updated Name"
            assert data["id"] == project_id
        finally:
            db.projects.delete_many({"user_id": user_email})

    async def test_delete_project(self, http_client, authenticated_user):
        """test deleting project"""
        db = get_database()
        token = authenticated_user
        me_response = await http_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        user_email = me_response.json()["email"]
        try:
            create_response = await http_client.post(
                "/api/v1/projects",
                json={
                    "name": "Delete Test Project",
                    "activeCircuitId": "",
                    "circuits": []
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            project_id = create_response.json()["id"]
            delete_response = await http_client.delete(
                f"/api/v1/projects/{project_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert delete_response.status_code == 204
            get_response = await http_client.get(
                f"/api/v1/projects/{project_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert get_response.status_code == 404
        finally:
            db.projects.delete_many({"user_id": user_email})

@pytest.mark.asyncio
@pytest.mark.integration
class TestProjectOperations:
    """test project operations"""
    async def test_duplicate_project(self, http_client, authenticated_user):
        """test project duplication"""
        db = get_database()
        token = authenticated_user
        me_response = await http_client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        user_email = me_response.json()["email"]
        try:
            create_response = await http_client.post(
                "/api/v1/projects",
                json={
                    "name": "Original Project",
                    "description": "Original description",
                    "activeCircuitId": "circuit1",
                    "circuits": []
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            original_id = create_response.json()["id"]
            duplicate_response = await http_client.post(
                f"/api/v1/projects/{original_id}/duplicate",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert duplicate_response.status_code == 201
            duplicate = duplicate_response.json()
            assert duplicate["id"] != original_id
            assert duplicate["name"] == "Original Project (Copy)"
            assert duplicate["description"] == "Original description"
            assert duplicate["activeCircuitId"] == "circuit1"
        finally:
            db.projects.delete_many({"user_id": user_email})

    async def test_project_isolation(self, http_client):
        """test that users can only see their own projects"""
        db = get_database()
        user1_email = "user1@example.com"
        user2_email = "user2@example.com"
        password = "testpass123"
        db.users.delete_many({"email": {"$in": [user1_email, user2_email]}})
        db.projects.delete_many({"user_id": {"$in": [user1_email, user2_email]}})
        try:
            await http_client.post(
                "/api/v1/auth/register",
                json={
                    "email": user1_email,
                    "password": password,
                    "first_name": "User",
                    "last_name": "One"
                }
            )
            login1 = await http_client.post(
                "/api/v1/auth/login",
                json={"email": user1_email, "password": password}
            )
            token1 = login1.json()["access_token"]
            await http_client.post(
                "/api/v1/auth/register",
                json={
                    "email": user2_email,
                    "password": password,
                    "first_name": "User",
                    "last_name": "Two"
                }
            )
            login2 = await http_client.post(
                "/api/v1/auth/login",
                json={"email": user2_email, "password": password}
            )
            token2 = login2.json()["access_token"]
            project1_response = await http_client.post(
                "/api/v1/projects",
                json={
                    "name": "User 1 Project",
                    "activeCircuitId": "",
                    "circuits": []
                },
                headers={"Authorization": f"Bearer {token1}"}
            )
            project1_id = project1_response.json()["id"]
            project2_response = await http_client.post(
                "/api/v1/projects",
                json={
                    "name": "User 2 Project",
                    "activeCircuitId": "",
                    "circuits": []
                },
                headers={"Authorization": f"Bearer {token2}"}
            )
            project2_id = project2_response.json()["id"]
            list1_response = await http_client.get(
                "/api/v1/projects",
                headers={"Authorization": f"Bearer {token1}"}
            )
            projects1 = list1_response.json()
            assert len(projects1) == 1
            assert projects1[0]["id"] == project1_id
            list2_response = await http_client.get(
                "/api/v1/projects",
                headers={"Authorization": f"Bearer {token2}"}
            )
            projects2 = list2_response.json()
            assert len(projects2) == 1
            assert projects2[0]["id"] == project2_id
            access_denied = await http_client.get(
                f"/api/v1/projects/{project2_id}",
                headers={"Authorization": f"Bearer {token1}"}
            )
            assert access_denied.status_code == 404
        finally:
            db.users.delete_many({"email": {"$in": [user1_email, user2_email]}})
            db.projects.delete_many({"user_id": {"$in": [user1_email, user2_email]}})

@pytest.mark.asyncio
@pytest.mark.integration
class TestProjectErrors:
    """test project error handling"""
    async def test_invalid_project_id(self, http_client, authenticated_user):
        """test handling of invalid project id format"""
        token = authenticated_user
        invalid_response = await http_client.get(
            "/api/v1/projects/invalid-id-format",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert invalid_response.status_code in [400, 404]
        fake_id = str(ObjectId())
        not_found_response = await http_client.get(
            f"/api/v1/projects/{fake_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert not_found_response.status_code == 404

    async def test_missing_required_fields(self, http_client, authenticated_user):
        """test validation of required fields"""
        token = authenticated_user
        missing_name = await http_client.post(
            "/api/v1/projects",
            json={"activeCircuitId": "", "circuits": []},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert missing_name.status_code == 422
        missing_circuit_id = await http_client.post(
            "/api/v1/projects",
            json={"name": "Test Project", "circuits": []},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert missing_circuit_id.status_code == 422

    async def test_update_nonexistent_project(self, http_client, authenticated_user):
        """test updating nonexistent project fails"""
        token = authenticated_user
        fake_id = str(ObjectId())
        update_response = await http_client.put(
            f"/api/v1/projects/{fake_id}",
            json={"name": "Updated Name"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert update_response.status_code == 404

    async def test_delete_nonexistent_project(self, http_client, authenticated_user):
        """test deleting nonexistent project fails"""
        token = authenticated_user
        fake_id = str(ObjectId())
        delete_response = await http_client.delete(
            f"/api/v1/projects/{fake_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert delete_response.status_code == 404

    async def test_duplicate_nonexistent_project(self, http_client, authenticated_user):
        """test duplicating nonexistent project fails"""
        token = authenticated_user
        fake_id = str(ObjectId())
        duplicate_response = await http_client.post(
            f"/api/v1/projects/{fake_id}/duplicate",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert duplicate_response.status_code == 404

