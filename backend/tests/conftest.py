"""shared pytest fixtures for integration tests"""
import pytest
import pytest_asyncio
import json
import os
import asyncio
import inspect
from httpx import ASGITransport, AsyncClient
from websockets import connect as ws_connect
from starlette.testclient import TestClient

# set testing environment before importing app modules
os.environ["ENVIRONMENT"] = "testing"

from app.services.websocket_manager import ClientMessage, ServerMessage, manager
from app.core.config import settings
from app.main import app
from app.db import get_database, close_database

# ============== Database Fixtures ==============

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """ensure all tests use test database - never touches dev database"""
    settings.ENVIRONMENT = "testing"
    close_database()
    db = get_database()
    assert db.name.endswith("_test"), f"tests must use test database, got {db.name}"
    yield
    close_database()

@pytest.fixture
def db():
    """get test database instance"""
    database = get_database()
    assert database.name.endswith("_test"), f"must use test database, got {database.name}"
    return database

@pytest.fixture
def mongo_client(db):
    """MongoDB client for connection tests"""
    return db.client


# ============== WebSocket Helper ==============

class AsyncWebSocketTestHelper:
    """helper for WebSocket testing with both TestClient and real connections"""
    
    def __init__(self, base_url: str = None, test_client: TestClient = None):
        self.base_url = base_url
        self.test_client = test_client
        self.connections = []
        self.ws_contexts = []
        self.ws_to_connection_id = {}
        self.use_asgi = test_client is not None

    async def connect(self, path: str = "/api/v1/ws/"):
        """establish WebSocket connection"""
        if self.use_asgi:
            ws_context = self.test_client.websocket_connect(path)
            ws = ws_context.__enter__()
            self.connections.append(ws)
            self.ws_contexts.append(ws_context)
            return ws
        else:
            ws = await ws_connect(f"{self.base_url}{path}")
            self.connections.append(ws)
            return ws

    @staticmethod
    async def send_json(ws, message_type, **kwargs):
        """send JSON message via WebSocket"""
        type_value = message_type.value if hasattr(message_type, 'value') else message_type
        if hasattr(ws, 'send_json'):
            # TestClient: synchronous send_json, but need to allow async processing
            ws.send_json({"type": type_value, **kwargs})
            await asyncio.sleep(0.1)  # allow async message processing
        elif hasattr(ws, 'send_text'):
            await ws.send_text(json.dumps({"type": type_value, **kwargs}))
        else:
            await ws.send(json.dumps({"type": type_value, **kwargs}))

    @staticmethod
    async def send_text(ws, text: str):
        """send plain text message via WebSocket"""
        if hasattr(ws, 'send_text'):
            # TestClient: synchronous send_text, but need to allow async processing
            ws.send_text(text)
            await asyncio.sleep(0.05)  # allow async message processing
        else:
            await ws.send(text)

    async def close(self, ws):
        """close WebSocket connection and trigger disconnect notification"""
        if not hasattr(ws, 'close'):
            return
        if inspect.iscoroutinefunction(ws.close):
            await ws.close()
        else:
            # TestClient: manually trigger disconnect notification
            connection_id = self.ws_to_connection_id.get(ws)
            if connection_id:
                manager.disconnect(connection_id)
                del self.ws_to_connection_id[ws]
                # wait a bit for async broadcast to complete
                await asyncio.sleep(0.1)
            ws.close()

    async def receive_json(self, ws, expected_type: str = None, expected_event: str = None, timeout: float = 5.0):
        """receive JSON message from WebSocket with optional filtering"""
        msg = None
        start_time = asyncio.get_event_loop().time()
        
        while msg is None or (expected_type and msg.get("type") != expected_type) or (expected_event and msg.get("event") != expected_event):
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > timeout:
                raise TimeoutError(f"timeout after {timeout}s waiting for message type={expected_type}, event={expected_event}")
            
            try:
                remaining_time = max(0.1, timeout - elapsed)
                if hasattr(ws, 'receive_json'):
                    msg = await asyncio.wait_for(asyncio.to_thread(ws.receive_json), timeout=remaining_time)
                    if "connection_id" in msg and msg.get("type") in ("connection_established", ServerMessage.CONNECTION_ESTABLISHED):
                        self.ws_to_connection_id[ws] = msg["connection_id"]
                elif hasattr(ws, 'receive_text'):
                    text = await asyncio.wait_for(ws.receive_text(), timeout=remaining_time)
                    try:
                        msg = json.loads(text)
                        if not isinstance(msg, dict):
                            msg = {"type": ClientMessage.BROADCAST, "content": text}
                    except json.JSONDecodeError:
                        msg = {"type": ClientMessage.BROADCAST, "content": text}
                else:
                    text = await asyncio.wait_for(ws.recv(), timeout=remaining_time)
                    try:
                        msg = json.loads(text)
                        if not isinstance(msg, dict):
                            msg = {"type": ClientMessage.BROADCAST, "content": text}
                    except json.JSONDecodeError:
                        msg = {"type": ClientMessage.BROADCAST, "content": text}
            except StopAsyncIteration:
                raise RuntimeError("websocket closed unexpectedly")
            except asyncio.TimeoutError:
                continue
        
        return msg

    async def cleanup(self):
        """cleanup all WebSocket connections"""
        for context in self.ws_contexts:
            try:
                context.__exit__(None, None, None)
            except Exception:
                pass
        self.ws_contexts.clear()
        for ws in self.connections:
            try:
                if hasattr(ws, 'close') and not self.use_asgi:
                    await ws.close()
            except Exception:
                pass
        self.connections.clear()


# ============== HTTP Client Fixtures ==============

@pytest_asyncio.fixture
async def http_client():
    """HTTP client - uses ASGI transport in testing mode, real server otherwise"""
    if settings.ENVIRONMENT == "testing":
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
    else:
        host = "localhost" if settings.HOST == "0.0.0.0" else settings.HOST
        base_url = f"http://{host}:{settings.PORT}"
        async with AsyncClient(base_url=base_url) as client:
            yield client


# ============== WebSocket Client Fixtures ==============

@pytest_asyncio.fixture
async def ws_client():
    """WebSocket client helper - uses TestClient in testing mode, real server otherwise"""
    if settings.ENVIRONMENT == "testing":
        test_client = TestClient(app)
        helper = AsyncWebSocketTestHelper(test_client=test_client)
        yield helper
        await helper.cleanup()
    else:
        host = "localhost" if settings.HOST == "0.0.0.0" else settings.HOST
        ws_url = f"ws://{host}:{settings.PORT}"
        helper = AsyncWebSocketTestHelper(ws_url)
        yield helper
        await helper.cleanup()

# ============== User Fixtures ==============

def _create_user_data(email: str, first_name: str, last_name: str, password: str = "testpass123"):
    """helper to create user data dict"""
    return {"email": email, "password": password, "first_name": first_name, "last_name": last_name}

async def _create_user_token(http_client, user_data: dict):
    """register user and return access token"""
    register = await http_client.post("/api/v1/auth/register", json=user_data)
    if register.status_code == 400 and "already registered" in register.json().get("detail", ""):
        pass  # user exists, proceed to login
    elif register.status_code != 201:
        pytest.fail(f"failed to register user: {register.status_code} - {register.text}")
    
    login = await http_client.post("/api/v1/auth/login", json={"email": user_data["email"], "password": user_data["password"]})
    assert login.status_code == 200, f"login failed: {login.status_code}"
    return login.json()["access_token"]

@pytest_asyncio.fixture
async def registered_user(db):
    """create and cleanup test user"""
    user_data = _create_user_data("test@example.com", "Test", "User", "testpassword123")
    db.users.delete_many({"email": user_data["email"]})
    yield user_data
    db.users.delete_many({"email": user_data["email"]})

@pytest_asyncio.fixture
async def authenticated_user(http_client, db):
    """create authenticated test user and return token"""
    user_data = _create_user_data("authuser@example.com", "Auth", "User")
    db.users.delete_many({"email": user_data["email"]})
    token = await _create_user_token(http_client, user_data)
    yield token
    db.users.delete_many({"email": user_data["email"]})

@pytest_asyncio.fixture
async def authenticated_superuser(http_client, db):
    """create authenticated superuser and return token"""
    user_data = _create_user_data("superuser@example.com", "Super", "User")
    db.users.delete_many({"email": user_data["email"]})
    
    response = await http_client.post("/api/v1/auth/register", json=user_data)
    if response.status_code != 201:
        db.users.delete_many({"email": user_data["email"]})
        await asyncio.sleep(0.1)
        response = await http_client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 201, f"failed to register superuser: {response.status_code}"
    
    db.users.update_one({"email": user_data["email"]}, {"$set": {"is_superuser": True}})
    token = await _create_user_token(http_client, user_data)
    
    # verify superuser status
    me = await http_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json().get("is_superuser") is True, "user should be superuser"
    
    yield token
    db.users.delete_many({"email": user_data["email"]})
