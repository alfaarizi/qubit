"""circuit endpoint integration tests"""
import pytest
from app.db import get_database

@pytest.mark.asyncio
@pytest.mark.integration
class TestCircuitPartition:
    """test circuit partitioning"""
    async def test_partition_circuit(self, http_client, authenticated_user):
        """test circuit partition workflow"""
        token = authenticated_user
        circuit_id = "test-circuit-123"
        partition_response = await http_client.post(
            f"/api/v1/circuits/{circuit_id}/partition",
            json={
                "num_qubits": 3,
                "placed_gates": [
                    {"id": "g1", "name": "H", "qubits": [0]},
                    {"id": "g2", "name": "CNOT", "qubits": [0, 1]},
                    {"id": "g3", "name": "X", "qubits": [2]}
                ],
                "measurements": [],
                "strategy": "kahn"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert partition_response.status_code == 200
        partition_data = partition_response.json()
        assert "job_id" in partition_data
        assert partition_data["status"] == "queued"
        job_id = partition_data["job_id"]
        list_jobs_response = await http_client.get(
            f"/api/v1/circuits/{circuit_id}/jobs",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert list_jobs_response.status_code == 200
        jobs_data = list_jobs_response.json()
        assert "jobs" in jobs_data
        assert job_id in jobs_data["jobs"]
        get_job_response = await http_client.get(
            f"/api/v1/circuits/{circuit_id}/jobs/{job_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_job_response.status_code == 200
        job_data = get_job_response.json()
        assert job_data["job_id"] == job_id
        assert job_data["circuit_id"] == circuit_id
        assert job_data["status"] == "queued"

    async def test_partition_validation(self, http_client, authenticated_user):
        """test circuit partition input validation"""
        token = authenticated_user
        circuit_id = "test-circuit-validation"
        invalid_response1 = await http_client.post(
            f"/api/v1/circuits/{circuit_id}/partition",
            json={
                "num_qubits": 0,
                "placed_gates": [],
                "measurements": []
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert invalid_response1.status_code == 400
        invalid_response2 = await http_client.post(
            f"/api/v1/circuits/{circuit_id}/partition",
            json={
                "num_qubits": -1,
                "placed_gates": [],
                "measurements": []
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert invalid_response2.status_code == 400
        invalid_response3 = await http_client.post(
            f"/api/v1/circuits/{circuit_id}/partition",
            json={
                "num_qubits": 2,
                "placed_gates": [],
                "measurements": []
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert invalid_response3.status_code == 400

@pytest.mark.asyncio
@pytest.mark.integration
class TestQasmImport:
    """test QASM import"""
    async def test_import_qasm(self, http_client, authenticated_user):
        """test QASM import workflow"""
        token = authenticated_user
        circuit_id = "test-qasm-circuit"
        qasm_code = """
        OPENQASM 2.0;
        include "qelib1.inc";
        qreg q[2];
        h q[0];
        cx q[0], q[1];
        """
        import_response = await http_client.post(
            f"/api/v1/circuits/{circuit_id}/import-qasm",
            json={
                "qasm_code": qasm_code,
                "options": {}
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert import_response.status_code == 200
        import_data = import_response.json()
        assert "job_id" in import_data
        assert import_data["status"] == "processing"
        job_id = import_data["job_id"]
        get_job_response = await http_client.get(
            f"/api/v1/circuits/{circuit_id}/jobs/{job_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_job_response.status_code == 200
        job_data = get_job_response.json()
        assert job_data["job_id"] == job_id
        assert job_data["circuit_id"] == circuit_id

@pytest.mark.asyncio
@pytest.mark.integration
class TestJobManagement:
    """test job management"""
    async def test_job_ownership(self, http_client):
        """test that users can only access their own jobs"""
        db = get_database()
        user1_email = "jobuser1@example.com"
        user2_email = "jobuser2@example.com"
        password = "testpass123"
        circuit_id = "shared-circuit"
        db.users.delete_many({"email": {"$in": [user1_email, user2_email]}})
        try:
            await http_client.post(
                "/api/v1/auth/register",
                json={
                    "email": user1_email,
                    "password": password,
                    "first_name": "Job",
                    "last_name": "User1"
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
                    "first_name": "Job",
                    "last_name": "User2"
                }
            )
            login2 = await http_client.post(
                "/api/v1/auth/login",
                json={"email": user2_email, "password": password}
            )
            token2 = login2.json()["access_token"]
            job1_response = await http_client.post(
                f"/api/v1/circuits/{circuit_id}/partition",
                json={
                    "num_qubits": 2,
                    "placed_gates": [{"id": "g1", "name": "H", "qubits": [0]}],
                    "measurements": []
                },
                headers={"Authorization": f"Bearer {token1}"}
            )
            job1_id = job1_response.json()["job_id"]
            job2_response = await http_client.post(
                f"/api/v1/circuits/{circuit_id}/partition",
                json={
                    "num_qubits": 2,
                    "placed_gates": [{"id": "g1", "name": "H", "qubits": [0]}],
                    "measurements": []
                },
                headers={"Authorization": f"Bearer {token2}"}
            )
            job2_id = job2_response.json()["job_id"]
            access_own = await http_client.get(
                f"/api/v1/circuits/{circuit_id}/jobs/{job1_id}",
                headers={"Authorization": f"Bearer {token1}"}
            )
            assert access_own.status_code == 200
            access_other = await http_client.get(
                f"/api/v1/circuits/{circuit_id}/jobs/{job2_id}",
                headers={"Authorization": f"Bearer {token1}"}
            )
            assert access_other.status_code == 403
            access_own2 = await http_client.get(
                f"/api/v1/circuits/{circuit_id}/jobs/{job2_id}",
                headers={"Authorization": f"Bearer {token2}"}
            )
            assert access_own2.status_code == 200
            access_other2 = await http_client.get(
                f"/api/v1/circuits/{circuit_id}/jobs/{job1_id}",
                headers={"Authorization": f"Bearer {token2}"}
            )
            assert access_other2.status_code == 403
        finally:
            db.users.delete_many({"email": {"$in": [user1_email, user2_email]}})

    async def test_invalid_job_access(self, http_client, authenticated_user):
        """test accessing nonexistent job fails"""
        token = authenticated_user
        circuit_id = "test-circuit"
        fake_job_id = "non-existent-job-id"
        get_job_response = await http_client.get(
            f"/api/v1/circuits/{circuit_id}/jobs/{fake_job_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_job_response.status_code == 404

