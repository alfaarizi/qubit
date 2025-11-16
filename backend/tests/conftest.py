import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from websockets import connect as ws_connect
import json

from app.services.websocket_manager import ClientMessage
from app.core.config import settings
from app.main import app
from app.db import get_database

# ============== Async WebSocket Helper ==============

class AsyncWebSocketTestHelper:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.connections = []

    async def connect(self, path: str = "/api/v1/ws/"):
        ws = await ws_connect(f"{self.base_url}{path}")
        self.connections.append(ws)
        return ws

    @staticmethod
    async def send_json(ws, message_type: str, **kwargs):
        await ws.send(json.dumps({"type": message_type, **kwargs}))

    @staticmethod
    async def receive_json(ws, expected_type: str = None, expected_event: str = None):
        msg = None
        while (
            msg is None
            or (expected_type and msg.get("type") != expected_type)
            or (expected_event and msg.get("event") != expected_event)
        ):
            text = await ws.recv()
            try:
                msg = json.loads(text)
                if not isinstance(msg, dict):
                    msg = {"type": ClientMessage.BROADCAST, "content": text}
            except json.JSONDecodeError:
                msg = {"type": ClientMessage.BROADCAST, "content": text}
        return msg

    async def cleanup(self):
        for ws in self.connections:
            await ws.close()
        self.connections.clear()


# ============== Test Data Fixtures ==============

@pytest.fixture
def test_user_data():
    """test user data"""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User"
    }


# ============== HTTP Client Fixtures ==============

@pytest_asyncio.fixture
async def http_client():
    """HTTP client for real server (localhost:8000) - same server as ws_client and mongo_client"""
    base_url = f"http://{settings.HOST}:{settings.PORT}"
    async with AsyncClient(base_url=base_url) as client:
        yield client

@pytest_asyncio.fixture
async def http_client_asgi():
    """HTTP client with ASGI transport (in-memory, no server needed) - for fast isolated tests"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ============== WebSocket Fixtures ==============

@pytest_asyncio.fixture
async def ws_client():
    """WebSocket client helper"""
    ws_url = f"ws://{settings.HOST}:{settings.PORT}"
    helper = AsyncWebSocketTestHelper(ws_url)
    yield helper
    await helper.cleanup()


# ============== User Fixtures ==============

@pytest_asyncio.fixture
async def registered_user(test_user_data):
    """create and cleanup test user"""
    db = get_database()
    db.users.delete_many({"email": test_user_data["email"]})
    yield test_user_data
    db.users.delete_many({"email": test_user_data["email"]})

@pytest_asyncio.fixture
async def authenticated_user(http_client):
    """create authenticated test user and return token (uses real server)"""
    db = get_database()
    email = "authuser@example.com"
    db.users.delete_many({"email": email})
    response = await http_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "testpass123", "first_name": "Auth", "last_name": "User"}
    )
    if response.status_code == 201:
        login = await http_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "testpass123"}
        )
        token = login.json()["access_token"]
        yield token
    db.users.delete_many({"email": email})

@pytest_asyncio.fixture
async def authenticated_superuser(http_client):
    """create authenticated superuser and return token (uses real server)"""
    db = get_database()
    email = "superuser@example.com"
    db.users.delete_many({"email": email})
    response = await http_client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "testpass123", "first_name": "Super", "last_name": "User"}
    )
    if response.status_code == 201:
        db.users.update_one(
            {"email": email},
            {"$set": {"is_superuser": True}}
        )
        login = await http_client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "testpass123"}
        )
        token = login.json()["access_token"]
        yield token
    db.users.delete_many({"email": email})

@pytest_asyncio.fixture
async def authenticated_user_asgi(http_client_asgi):
    """create authenticated test user and return token (uses ASGI transport for isolated tests)"""
    db = get_database()
    email = "authuser-asgi@example.com"
    db.users.delete_many({"email": email})
    response = await http_client_asgi.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "testpass123", "first_name": "Auth", "last_name": "ASGI"}
    )
    if response.status_code == 201:
        login = await http_client_asgi.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "testpass123"}
        )
        token = login.json()["access_token"]
        yield token
    db.users.delete_many({"email": email})

@pytest_asyncio.fixture
async def authenticated_superuser_asgi(http_client_asgi):
    """create authenticated superuser and return token (uses ASGI transport for isolated tests)"""
    db = get_database()
    email = "superuser-asgi@example.com"
    db.users.delete_many({"email": email})
    response = await http_client_asgi.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "testpass123", "first_name": "Super", "last_name": "ASGI"}
    )
    if response.status_code == 201:
        db.users.update_one(
            {"email": email},
            {"$set": {"is_superuser": True}}
        )
        login = await http_client_asgi.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "testpass123"}
        )
        token = login.json()["access_token"]
        yield token
    db.users.delete_many({"email": email})

@pytest.fixture
def mongo_client():
    """create MongoDB client and cleanup after test"""
    from pymongo import MongoClient
    client = MongoClient(
        settings.MONGODB_URL,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000
    )
    yield client
    # cleanup
    if settings.MONGODB_DATABASE:
        db = client[settings.MONGODB_DATABASE]
        if 'test_collection' in db.list_collection_names():
            db['test_collection'].drop()
    client.close()
