"""websocket endpoint integration tests"""
import pytest
from app.services.websocket_manager import ClientMessage, ServerMessage, ConnectionEvent

@pytest.mark.asyncio
@pytest.mark.integration
class TestWebSocketConnection:
    """test websocket connection and disconnection"""
    async def test_connection(self, ws_client):
        """test websocket connection establishes successfully"""
        ws = await ws_client.connect()
        msg = await ws_client.receive_json(ws)
        assert msg["type"] == ServerMessage.CONNECTION_ESTABLISHED
        assert "connection_id" in msg

    async def test_disconnect(self, ws_client):
        """test websocket disconnection notifies other clients"""
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        await ws_client.receive_json(ws1)
        await ws_client.receive_json(ws2)
        await ws_client.close(ws1)
        msg = await ws_client.receive_json(ws2, expected_type=ServerMessage.CONNECTION_UPDATE)
        assert msg["event"] == ConnectionEvent.USER_DISCONNECTED
        assert msg["connection_id"] is not None

    async def test_multiple_connections(self, ws_client):
        """test multiple simultaneous websocket connections"""
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        ws3 = await ws_client.connect()
        for ws in [ws1, ws2, ws3]:
            await ws_client.receive_json(ws)

@pytest.mark.asyncio
@pytest.mark.integration
class TestWebSocketMessages:
    """test websocket message handling"""
    async def test_ping_pong(self, ws_client):
        """test ping-pong message exchange"""
        ws = await ws_client.connect()
        await ws_client.receive_json(ws)
        await ws_client.send_json(ws, ClientMessage.PING)
        msg = await ws_client.receive_json(ws)
        assert msg["type"] == ServerMessage.PONG

    async def test_get_stats(self, ws_client):
        """test getting websocket statistics"""
        ws = await ws_client.connect()
        await ws_client.receive_json(ws)
        await ws_client.send_json(ws, ClientMessage.GET_STATS)
        msg = await ws_client.receive_json(ws)
        assert msg["type"] == ServerMessage.STATS
        assert "data" in msg

    async def test_unknown_message_type(self, ws_client):
        """test handling of unknown message types"""
        ws = await ws_client.connect()
        await ws_client.receive_json(ws)
        await ws_client.send_json(ws, "unknown_message_type")
        msg = await ws_client.receive_json(ws)
        assert msg["type"] == ServerMessage.ERROR
        assert "unknown message type" in msg["message"]

    async def test_plain_text_message(self, ws_client):
        """test broadcasting plain text messages"""
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        await ws_client.receive_json(ws1)
        await ws_client.receive_json(ws2)
        await ws_client.send_text(ws1, "Hello world!")
        msg = await ws_client.receive_json(ws2)
        assert msg["type"] == ServerMessage.NOTIFICATION
        assert msg["content"] == "Hello world!"

@pytest.mark.asyncio
@pytest.mark.integration
class TestRoomNotifications:
    """test room-based notifications"""
    async def test_room_leave_broadcast(self, ws_client):
        """test room leave notifications are broadcast to other clients"""
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        await ws_client.receive_json(ws1)
        await ws_client.receive_json(ws2)
        room = "room-notify"
        await ws_client.send_json(ws1, ClientMessage.JOIN_ROOM, room=room)
        await ws_client.receive_json(ws1)
        await ws_client.send_json(ws2, ClientMessage.JOIN_ROOM, room=room)
        await ws_client.receive_json(ws2)
        await ws_client.receive_json(ws1)
        await ws_client.send_json(ws2, ClientMessage.LEAVE_ROOM, room=room)
        await ws_client.receive_json(ws2)
        msg = await ws_client.receive_json(
            ws1,
            expected_type=ServerMessage.CONNECTION_UPDATE,
            expected_event=ConnectionEvent.USER_LEFT_ROOM
        )
        assert msg["event"] == "user_left_room"
        assert msg["room"] == room
        assert msg["connection_id"] is not None

@pytest.mark.asyncio
@pytest.mark.integration
class TestRoomFunctionality:
    """test room join and leave functionality"""
    async def test_join_leave_room(self, ws_client):
        """test joining and leaving a room"""
        ws = await ws_client.connect()
        await ws_client.receive_json(ws)
        await ws_client.send_json(ws, ClientMessage.JOIN_ROOM, room="room-x")
        msg = await ws_client.receive_json(ws)
        assert msg["type"] == ServerMessage.ROOM_JOINED
        await ws_client.send_json(ws, ClientMessage.LEAVE_ROOM, room="room-x")
        msg2 = await ws_client.receive_json(ws)
        assert msg2["type"] == ServerMessage.ROOM_LEFT

    async def test_room_broadcast(self, ws_client):
        """test broadcasting messages within a room"""
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        await ws_client.receive_json(ws1)
        await ws_client.receive_json(ws2)
        await ws_client.send_json(ws1, ClientMessage.JOIN_ROOM, room="room-a")
        await ws_client.receive_json(ws1)
        await ws_client.send_json(ws2, ClientMessage.JOIN_ROOM, room="room-a")
        await ws_client.receive_json(ws2)
        await ws_client.receive_json(ws1)
        await ws_client.send_json(ws1, ClientMessage.ROOM_BROADCAST, room="room-a", content="Hello room-a!")
        msg = await ws_client.receive_json(ws2)
        assert msg["type"] == ServerMessage.ROOM_NOTIFICATION
        assert msg["content"] == "Hello room-a!"

@pytest.mark.asyncio
@pytest.mark.integration
class TestGlobalBroadcast:
    """test global broadcast functionality"""
    async def test_broadcast(self, ws_client):
        """test global message broadcast to all connected clients"""
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        ws3 = await ws_client.connect()
        for ws in [ws1, ws2, ws3]:
            await ws_client.receive_json(ws)
        await ws_client.send_json(ws1, ClientMessage.BROADCAST, content="Global!")
        for ws in [ws2, ws3]:
            msg = await ws_client.receive_json(ws, expected_type=ServerMessage.NOTIFICATION)
            assert msg["type"] == ServerMessage.NOTIFICATION
            assert msg["content"] == "Global!"

@pytest.mark.asyncio
@pytest.mark.integration
class TestHTTPEndpoints:
    """test websocket HTTP endpoints"""
    async def test_stats(self, http_client, authenticated_user):
        """test getting websocket statistics via HTTP"""
        r = await http_client.get(
            "/api/v1/ws/stats",
            headers={"Authorization": f"Bearer {authenticated_user}"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["status"] == "success"

    async def test_http_broadcast(self, http_client, authenticated_superuser):
        """test HTTP broadcast endpoint requires superuser"""
        payload = {"content": "HTTP broadcast", "metadata": {"src": "test"}}
        r = await http_client.post(
            "/api/v1/ws/broadcast",
            json=payload,
            headers={"Authorization": f"Bearer {authenticated_superuser}"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["status"] == "success"

    async def test_http_room_broadcast(self, http_client, ws_client, authenticated_superuser):
        """test HTTP room broadcast endpoint"""
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        await ws_client.receive_json(ws1)
        await ws_client.receive_json(ws2)
        room = "room-http"
        await ws_client.send_json(ws1, ClientMessage.JOIN_ROOM, room=room)
        await ws_client.receive_json(ws1)
        await ws_client.send_json(ws2, ClientMessage.JOIN_ROOM, room=room)
        await ws_client.receive_json(ws2)
        payload = {"content": "Room HTTP broadcast", "metadata": {"src": "test"}}
        r = await http_client.post(
            f"/api/v1/ws/broadcast/room/{room}",
            json=payload,
            headers={"Authorization": f"Bearer {authenticated_superuser}"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["status"] == "success"
        msg = await ws_client.receive_json(ws1, expected_type=ServerMessage.HTTP_ROOM_BROADCAST)
        assert msg["type"] == ServerMessage.HTTP_ROOM_BROADCAST
        assert msg["content"] == "Room HTTP broadcast"
