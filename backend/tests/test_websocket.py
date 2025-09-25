import pytest
from app.services.websocket_manager import ClientMessage, ServerMessage, ConnectionEvent


# ---------------- WebSocket Tests ----------------

@pytest.mark.asyncio
class TestWebSocketConnection:
    async def test_connection(self, ws_client):
        # connect client
        ws = await ws_client.connect()
        msg = await ws_client.receive_json(ws)
        assert msg["type"] == ServerMessage.CONNECTION_ESTABLISHED
        assert "connection_id" in msg

    async def test_disconnect(self, ws_client):
        # connect two clients
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        await ws_client.receive_json(ws1)
        await ws_client.receive_json(ws2)
        # ws1 disconnects
        await ws1.close()
        msg = await ws_client.receive_json(ws2, expected_type=ServerMessage.CONNECTION_UPDATE)
        assert msg["event"] == ConnectionEvent.USER_DISCONNECTED
        assert msg["connection_id"] is not None

    async def test_multiple_connections(self, ws_client):
        # connect multiple clients
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        ws3 = await ws_client.connect()
        for ws in [ws1, ws2, ws3]:
            await ws_client.receive_json(ws)

@pytest.mark.asyncio
class TestWebSocketMessages:
    async def test_ping_pong(self, ws_client):
        # ping/pong
        ws = await ws_client.connect()
        await ws_client.receive_json(ws)
        await ws_client.send_json(ws, ClientMessage.PING)
        msg = await ws_client.receive_json(ws)
        assert msg["type"] == ServerMessage.PONG

    async def test_get_stats(self, ws_client):
        # get stat
        ws = await ws_client.connect()
        await ws_client.receive_json(ws)
        await ws_client.send_json(ws, ClientMessage.GET_STATS)
        msg = await ws_client.receive_json(ws)
        assert msg["type"] == ServerMessage.STATS
        assert "data" in msg

    async def test_unknown_message_type(self, ws_client):
        # send unknown message
        ws = await ws_client.connect()
        await ws_client.receive_json(ws)
        await ws_client.send_json(ws, "unknown_message_type")
        msg = await ws_client.receive_json(ws)
        assert msg["type"] == ServerMessage.ERROR
        assert "unknown message type" in msg["message"]

    async def test_plain_text_message(self, ws_client):
        # broadcast plain text
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        await ws_client.receive_json(ws1)
        await ws_client.receive_json(ws2)
        await ws1.send("Hello world!")
        msg = await ws_client.receive_json(ws2)
        assert msg["type"] == ServerMessage.NOTIFICATION
        assert msg["content"] == "Hello world!"

@pytest.mark.asyncio
class TestRoomNotifications:
    async def test_room_leave_broadcast(self, ws_client):
        # connect clients
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        await ws_client.receive_json(ws1)
        await ws_client.receive_json(ws2)
        room = "room-notify"
        # ws1 joins room
        await ws_client.send_json(ws1, ClientMessage.JOIN_ROOM, room=room)
        await ws_client.receive_json(ws1)
        # ws2 joins room
        await ws_client.send_json(ws2, ClientMessage.JOIN_ROOM, room=room)
        await ws_client.receive_json(ws2)
        await ws_client.receive_json(ws1) # ws1 notified of ws2 joining
        # ws2 leaves room
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
class TestRoomFunctionality:
    async def test_join_leave_room(self, ws_client):
        # join/leave room
        ws = await ws_client.connect()
        await ws_client.receive_json(ws)
        await ws_client.send_json(ws, ClientMessage.JOIN_ROOM, room="room-x")
        msg = await ws_client.receive_json(ws)
        assert msg["type"] == ServerMessage.ROOM_JOINED
        await ws_client.send_json(ws, ClientMessage.LEAVE_ROOM, room="room-x")
        msg2 = await ws_client.receive_json(ws)
        assert msg2["type"] == ServerMessage.ROOM_LEFT

    async def test_room_broadcast(self, ws_client):
        # connect clients
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        await ws_client.receive_json(ws1)
        await ws_client.receive_json(ws2)
        # join room
        await ws_client.send_json(ws1, ClientMessage.JOIN_ROOM, room="room-a")
        await ws_client.receive_json(ws1)
        await ws_client.send_json(ws2, ClientMessage.JOIN_ROOM, room="room-a")
        await ws_client.receive_json(ws2)
        await ws_client.receive_json(ws1) # ws1 notified
        # broadcast in room
        await ws_client.send_json(ws1, ClientMessage.ROOM_BROADCAST, room="room-a", content="Hello room-a!")
        msg = await ws_client.receive_json(ws2)
        assert msg["type"] == ServerMessage.ROOM_NOTIFICATION
        assert msg["content"] == "Hello room-a!"

@pytest.mark.asyncio
class TestGlobalBroadcast:
    async def test_broadcast(self, ws_client):
        # connect clients
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        ws3 = await ws_client.connect()
        for ws in [ws1, ws2, ws3]:
            await ws_client.receive_json(ws)
        # broadcast globally
        await ws_client.send_json(ws1, ClientMessage.BROADCAST, content="Global!")
        for ws in [ws2, ws3]:
            msg = await ws_client.receive_json(ws, expected_type=ServerMessage.NOTIFICATION)
            assert msg["type"] == ServerMessage.NOTIFICATION
            assert msg["content"] == "Global!"

# ---------------- HTTP Tests ----------------

@pytest.mark.asyncio
class TestHTTPEndpoints:
    async def test_stats(self, http_client):
        # get stats
        r = await http_client.get("/api/v1/ws/stats")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "success"

    async def test_http_broadcast(self, http_client):
        # broadcast via HTTP
        payload = {"content": "HTTP broadcast", "metadata": {"src": "test"}}
        r = await http_client.post("/api/v1/ws/broadcast", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "success"

    async def test_http_room_broadcast(self, http_client, ws_client):
        # Connect clients
        ws1 = await ws_client.connect()
        ws2 = await ws_client.connect()
        await ws_client.receive_json(ws1)
        await ws_client.receive_json(ws2)
        room = "room-http"
        # join room
        await ws_client.send_json(ws1, ClientMessage.JOIN_ROOM, room=room)
        await ws_client.receive_json(ws1)
        await ws_client.send_json(ws2, ClientMessage.JOIN_ROOM, room=room)
        await ws_client.receive_json(ws2)
        # HTTP broadcast to room
        payload = {"content": "Room HTTP broadcast", "metadata": {"src": "test"}}
        r = await http_client.post(f"/api/v1/ws/broadcast/room/{room}", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "success"
        # verify ws1 receives broadcast
        msg = await ws_client.receive_json(ws1, expected_type=ServerMessage.HTTP_ROOM_BROADCAST)
        assert msg["type"] == ServerMessage.HTTP_ROOM_BROADCAST
        assert msg["content"] == "Room HTTP broadcast"