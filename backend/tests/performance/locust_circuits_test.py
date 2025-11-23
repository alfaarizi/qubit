"""locust circuit operations performance test"""
from locust import HttpUser, task, between
import random
from app.core.config import settings


class CircuitUser(HttpUser):
    """circuit operations performance"""
    wait_time = between(2, 5)
    host = f"http://{'localhost' if settings.HOST == '0.0.0.0' else settings.HOST}:{settings.PORT}"

    def on_start(self):
        """setup: register, login and create project with circuit"""
        self.token = None
        self.project_id = None
        self.circuit_id = None
        self.job_ids = []
        self.email = f"circuittest_{random.randint(100000, 999999)}@example.com"
        self.password = "TestPassword123!"
        self._register_and_login()
        if self.token:
            self._create_project_with_circuit()
            # retry if circuit creation failed
            if not self.circuit_id:
                self._create_project_with_circuit()

    def _register_and_login(self):
        """register user if needed and login"""
        register_data = {
            "email": self.email,
            "password": self.password,
            "first_name": "Circuit",
            "last_name": "Test"
        }
        register_response = self.client.post("/api/v1/auth/register", json=register_data)
        # only try login if registration succeeded (201) or user already exists (400)
        if register_response.status_code == 201 or (
            register_response.status_code == 400 and 
            "email already registered" in register_response.text
        ):
            login_response = self.client.post(
                "/api/v1/auth/login",
                json={"email": self.email, "password": self.password}
            )
            if login_response.status_code == 200:
                self.token = login_response.json().get("access_token")

    def _create_project_with_circuit(self):
        """create project with a circuit for testing"""
        if not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        circuit = {
            "id": f"circuit_{random.randint(1000, 9999)}",
            "name": "Test Circuit",
            "numQubits": 2,
            "gates": [
                {
                    "id": "gate1",
                    "depth": 0,
                    "gate": {"name": "H"},
                    "target_qubits": [0]
                },
                {
                    "id": "gate2",
                    "depth": 1,
                    "gate": {"name": "CNOT"},
                    "target_qubits": [0, 1]
                }
            ]
        }
        project_data = {
            "name": f"Circuit Test Project {random.randint(1000, 9999)}",
            "description": "Project for circuit testing",
            "circuits": [circuit],
            "activeCircuitId": circuit["id"]
        }
        response = self.client.post("/api/v1/projects", json=project_data, headers=headers)
        if response.status_code == 201:
            data = response.json()
            self.project_id = data["id"]
            if data.get("circuits"):
                self.circuit_id = data["circuits"][0]["id"]
        # if project creation failed, try to get circuit from existing projects
        elif response.status_code != 201 and not self.circuit_id:
            # try to get circuit from existing projects
            projects_response = self.client.get("/api/v1/projects", headers=headers)
            if projects_response.status_code == 200:
                projects = projects_response.json()
                for project in projects:
                    if project.get("circuits"):
                        self.project_id = project["id"]
                        self.circuit_id = project["circuits"][0]["id"]
                        break

    @task(5)
    def list_jobs(self):
        """test list jobs for circuit"""
        if self.token and self.circuit_id:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.client.get(f"/api/v1/circuits/{self.circuit_id}/jobs", headers=headers)
            if response.status_code == 200:
                jobs = response.json().get("jobs", {})
                if jobs:
                    self.job_ids = list(jobs.keys())[:10]
            elif response.status_code == 404:
                # circuit might have been deleted, try to get a new one
                self.circuit_id = None
                if self.project_id:
                    headers = {"Authorization": f"Bearer {self.token}"}
                    project_response = self.client.get(f"/api/v1/projects/{self.project_id}", headers=headers)
                    if project_response.status_code == 200:
                        project = project_response.json()
                        if project.get("circuits"):
                            self.circuit_id = project["circuits"][0]["id"]

    @task(3)
    def get_job(self):
        """test get job status"""
        if self.token and self.circuit_id and self.job_ids:
            headers = {"Authorization": f"Bearer {self.token}"}
            job_id = random.choice(self.job_ids)
            response = self.client.get(f"/api/v1/circuits/{self.circuit_id}/jobs/{job_id}", headers=headers)
            if response.status_code == 404:
                # job doesn't exist, remove it from list
                if job_id in self.job_ids:
                    self.job_ids.remove(job_id)

    @task(2)
    def partition_circuit(self):
        """test partition circuit operation"""
        if self.token and self.circuit_id:
            headers = {"Authorization": f"Bearer {self.token}"}
            partition_data = {
                "num_qubits": 2,
                "placed_gates": [
                    {"gate": "H", "target": [0], "params": []},
                    {"gate": "CNOT", "target": [0, 1], "params": []}
                ],
                "measurements": [0, 1],
                "strategy": "kahn",
                "options": {}
            }
            response = self.client.post(
                f"/api/v1/circuits/{self.circuit_id}/partition",
                json=partition_data,
                headers=headers
            )
            if response.status_code == 200:
                job_id = response.json().get("job_id")
                if job_id:
                    self.job_ids.append(job_id)

    @task(1)
    def import_qasm(self):
        """test QASM import operation"""
        if self.token and self.circuit_id:
            headers = {"Authorization": f"Bearer {self.token}"}
            qasm_code = """
            OPENQASM 2.0;
            include "qelib1.inc";
            qreg q[2];
            h q[0];
            cx q[0], q[1];
            measure q[0] -> c[0];
            measure q[1] -> c[1];
            """
            response = self.client.post(
                f"/api/v1/circuits/{self.circuit_id}/import-qasm",
                json={"qasm_code": qasm_code},
                headers=headers
            )
            if response.status_code == 200:
                job_id = response.json().get("job_id")
                if job_id:
                    self.job_ids.append(job_id)

