import pytest_asyncio
from httpx import AsyncClient
from websockets import connect as ws_connect
import json

from app.services.websocket_manager import ClientMessage
from app.core.config import settings

# ---------------- Async WebSocket Helper ----------------

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


# ---------------- Fixtures ----------------

@pytest_asyncio.fixture
async def http_client():
    base_url = f"http://{settings.HOST}:{settings.PORT}"
    async with AsyncClient(base_url=base_url) as client:
        yield client

@pytest_asyncio.fixture
async def ws_client():
    ws_url = f"ws://{settings.HOST}:{settings.PORT}"
    helper = AsyncWebSocketTestHelper(ws_url)
    yield helper
    await helper.cleanup()
