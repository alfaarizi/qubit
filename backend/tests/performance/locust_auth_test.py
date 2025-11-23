"""locust authentication endpoints performance test"""
from locust import HttpUser, task, between
import random
from app.core.config import settings


class AuthUser(HttpUser):
    """authentication endpoints performance"""
    wait_time = between(1, 3)
    host = f"http://{'localhost' if settings.HOST == '0.0.0.0' else settings.HOST}:{settings.PORT}"

    def on_start(self):
        """setup: register and login to get token"""
        self.token = None
        self.refresh_token = None
        self.email = f"authtest_{random.randint(100000, 999999)}@example.com"
        self.password = "TestPassword123!"
        self._register_and_login()

    def _register_and_login(self):
        """register new user and login"""
        register_data = {
            "email": self.email,
            "password": self.password,
            "first_name": "Load",
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
                data = login_response.json()
                self.token = data.get("access_token")
                self.refresh_token = data.get("refresh_token")

    @task(5)
    def login(self):
        """test login endpoint"""
        self.client.post(
            "/api/v1/auth/login",
            json={"email": self.email, "password": self.password}
        )

    @task(3)
    def get_me(self):
        """test get current user info"""
        if self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            self.client.get("/api/v1/auth/me", headers=headers)

    @task(2)
    def refresh_token(self):
        """test token refresh"""
        if self.refresh_token:
            self.client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": self.refresh_token}
            )

    @task(1)
    def register(self):
        """test user registration"""
        email = f"authtest_{random.randint(1000000, 9999999)}@example.com"
        self.client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "TestPassword123!",
                "first_name": "Load",
                "last_name": "Test"
            }
        )

