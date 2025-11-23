"""locust stress test - high load to find breaking points"""
from locust import HttpUser, task, between
import random
from app.core.config import settings


class StressUser(HttpUser):
    """stress test user - high frequency requests"""
    wait_time = between(0.1, 0.5)
    host = f"http://{'localhost' if settings.HOST == '0.0.0.0' else settings.HOST}:{settings.PORT}"

    def on_start(self):
        """register, login at start"""
        self.token = None
        self.project_ids = []
        self.email = f"stresstest_{random.randint(100000, 999999)}@example.com"
        self.password = "TestPassword123!"
        self._register_and_login()
        if self.token:
            self._load_project_ids()

    def _register_and_login(self):
        """register user if needed and login"""
        register_data = {
            "email": self.email,
            "password": self.password,
            "first_name": "Stress",
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

    def _load_project_ids(self):
        """load existing project IDs"""
        if self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = self.client.get("/api/v1/projects", headers=headers)
            if response.status_code == 200:
                projects = response.json()
                self.project_ids = [p["id"] for p in projects[:10]]

    @task(15)
    def health_check(self):
        """frequent health checks"""
        self.client.get("/api/v1/health/")

    @task(10)
    def get_projects(self):
        """frequent project fetches"""
        if self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            self.client.get("/api/v1/projects", headers=headers)

    @task(8)
    def get_me(self):
        """frequent user info fetches"""
        if self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            self.client.get("/api/v1/auth/me", headers=headers)

    @task(5)
    def create_project(self):
        """create projects under stress"""
        if self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            project_data = {
                "name": f"Stress Test {random.randint(10000, 99999)}",
                "description": "Stress test project",
                "circuits": [],
                "activeCircuitId": ""
            }
            response = self.client.post("/api/v1/projects", json=project_data, headers=headers)
            if response.status_code == 201:
                project_id = response.json().get("id")
                if project_id and project_id not in self.project_ids:
                    self.project_ids.append(project_id)
            # silently ignore 500 errors (server-side issue, not test issue)

    @task(3)
    def get_project(self):
        """get single project under stress"""
        if self.token and self.project_ids:
            headers = {"Authorization": f"Bearer {self.token}"}
            project_id = random.choice(self.project_ids)
            response = self.client.get(f"/api/v1/projects/{project_id}", headers=headers)
            # remove project ID if it doesn't exist
            if response.status_code == 404:
                if project_id in self.project_ids:
                    self.project_ids.remove(project_id)

    @task(2)
    def rapid_requests(self):
        """rapid sequential requests"""
        if self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            for _ in range(5):
                self.client.get("/api/v1/projects", headers=headers)
                self.client.get("/api/v1/auth/me", headers=headers)

