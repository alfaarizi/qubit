import pytest
import asyncio
import json
import websockets
from httpx import AsyncClient
from fastapi.testclient import TestClient

from app.services.websocket_manager import manager, ServerMessage, ClientMessage


class TestWebSocketConnection:
    """Test WebSocket connection and disconnection."""

    @pytest.mark.asyncio
    async def test_websocket_connection(self, ws_helper):
        """Test basic WebSocket connection and welcome message."""
        ws = await ws_helper.connect()

        # Should receive welcome message
        message = await ws_helper.receive_json(ws)
        assert message["type"] == ServerMessage.CONNECTION_ESTABLISHED
        assert "connection_id" in message
        assert "connected to" in message["message"].lower()

        # Verify manager state
        assert len(manager.connections) == 1
        assert len(manager.sessions) == 1

    @pytest.mark.asyncio
    async def test_websocket_disconnection(self, ws_helper):
        """Test WebSocket disconnection cleanup."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        connection_id = list(manager.connections.keys())[0]
        await ws.close()
        await asyncio.sleep(0.1)  # Allow cleanup

        # Verify cleanup
        assert len(manager.connections) == 0
        assert len(manager.sessions) == 0

    @pytest.mark.asyncio
    async def test_multiple_connections(self, ws_helper):
        """Test multiple simultaneous connections."""
        ws1 = await ws_helper.connect()
        ws2 = await ws_helper.connect()
        ws3 = await ws_helper.connect()

        # Consume welcome messages
        await ws_helper.receive_json(ws1)
        await ws_helper.receive_json(ws2)
        await ws_helper.receive_json(ws3)

        assert len(manager.connections) == 3
        assert len(manager.sessions) == 3


class TestWebSocketMessages:
    """Test WebSocket message handling."""

    @pytest.mark.asyncio
    async def test_ping_pong(self, ws_helper):
        """Test ping/pong functionality."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        await ws_helper.send_json(ws, ClientMessage.PING)
        response = await ws_helper.receive_json(ws)

        assert response["type"] == ServerMessage.PONG
        assert "timestamp" in response

    @pytest.mark.asyncio
    async def test_get_stats(self, ws_helper):
        """Test get statistics message."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        await ws_helper.send_json(ws, ClientMessage.GET_STATS)
        response = await ws_helper.receive_json(ws)

        assert response["type"] == ServerMessage.STATS
        assert "data" in response
        assert response["data"]["total_connections"] == 1

    @pytest.mark.asyncio
    async def test_unknown_message_type(self, ws_helper):
        """Test handling of unknown message types."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        await ws_helper.send_json(ws, "unknown_message_type")
        response = await ws_helper.receive_json(ws)

        assert response["type"] == ServerMessage.ERROR
        assert "unknown message type" in response["message"]

    @pytest.mark.asyncio
    async def test_plain_text_message(self, ws_helper):
        """Test plain text message handling."""
        ws1 = await ws_helper.connect()
        ws2 = await ws_helper.connect()

        # Consume welcome messages
        await ws_helper.receive_json(ws1)
        await ws_helper.receive_json(ws2)

        # Send plain text from ws1
        await ws1.send("Hello world!")

        # ws2 should receive the broadcast
        message = await ws_helper.receive_json(ws2)
        assert message["type"] == ServerMessage.NOTIFICATION
        assert message["content"] == "Hello world!"


class TestRoomFunctionality:
    """Test room join/leave and room messaging."""

    @pytest.mark.asyncio
    async def test_join_room(self, ws_helper):
        """Test joining a room."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        await ws_helper.send_json(ws, ClientMessage.JOIN_ROOM, room="test-room")
        response = await ws_helper.receive_json(ws)

        assert response["type"] == ServerMessage.ROOM_JOINED
        assert response["room"] == "test-room"
        assert response["success"] is True

        # Verify room state
        assert "test-room" in manager.rooms
        assert len(manager.rooms["test-room"]) == 1

    @pytest.mark.asyncio
    async def test_leave_room(self, ws_helper):
        """Test leaving a room."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        # Join room first
        await ws_helper.send_json(ws, ClientMessage.JOIN_ROOM, room="test-room")
        await ws_helper.receive_json(ws)  # Join confirmation

        # Leave room
        await ws_helper.send_json(ws, ClientMessage.LEAVE_ROOM, room="test-room")
        response = await ws_helper.receive_json(ws)

        assert response["type"] == ServerMessage.ROOM_LEFT
        assert response["room"] == "test-room"
        assert response["success"] is True

        # Verify room cleanup
        assert "test-room" not in manager.rooms

    @pytest.mark.asyncio
    async def test_room_broadcast(self, ws_helper):
        """Test room-specific broadcasting."""
        ws1 = await ws_helper.connect()
        ws2 = await ws_helper.connect()
        ws3 = await ws_helper.connect()

        # Consume welcome messages
        await ws_helper.receive_json(ws1)
        await ws_helper.receive_json(ws2)
        await ws_helper.receive_json(ws3)

        # ws1 and ws2 join same room, ws3 joins different room
        await ws_helper.send_json(ws1, ClientMessage.JOIN_ROOM, room="room-a")
        await ws_helper.receive_json(ws1)  # Join confirmation

        await ws_helper.send_json(ws2, ClientMessage.JOIN_ROOM, room="room-a")
        await ws_helper.receive_json(ws2)  # Join confirmation
        # ws2 also receives notification that ws2 joined
        await ws_helper.receive_json(ws1)  # User joined notification

        await ws_helper.send_json(ws3, ClientMessage.JOIN_ROOM, room="room-b")
        await ws_helper.receive_json(ws3)  # Join confirmation

        # ws1 broadcasts to room-a
        await ws_helper.send_json(ws1, ClientMessage.ROOM_BROADCAST,
                                  room="room-a", content="Hello room-a!")

        # ws2 should receive the message
        message = await ws_helper.receive_json(ws2)
        assert message["type"] == ServerMessage.ROOM_NOTIFICATION
        assert message["room"] == "room-a"
        assert message["content"] == "Hello room-a!"

        # ws3 should not receive anything (different room)
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(ws3.recv(), timeout=0.5)

    @pytest.mark.asyncio
    async def test_room_auto_join_endpoint(self, ws_helper):
        """Test auto-join room WebSocket endpoint."""
        ws = await ws_helper.connect("/api/v1/ws/room/auto-room")
        message = await ws_helper.receive_json(ws)

        assert message["type"] == ServerMessage.CONNECTION_ESTABLISHED
        assert message["room"] == "auto-room"

        # Verify auto-joined room
        assert "auto-room" in manager.rooms
        connection_id = list(manager.connections.keys())[0]
        assert connection_id in manager.rooms["auto-room"]

    @pytest.mark.asyncio
    async def test_multiple_users_same_room(self, ws_helper):
        """Test multiple users in same room receiving notifications."""
        clients = []
        for i in range(3):
            ws = await ws_helper.connect()
            await ws_helper.receive_json(ws)  # Welcome message
            clients.append(ws)

        # All join same room
        room = "busy-room"
        for i, ws in enumerate(clients):
            await ws_helper.send_json(ws, ClientMessage.JOIN_ROOM, room=room)
            await ws_helper.receive_json(ws)  # Join confirmation

            # Each client receives notifications about others joining
            for j in range(i):
                await ws_helper.receive_json(clients[j])  # User joined notification

        # Verify room has all users
        assert len(manager.rooms[room]) == 3

        # One user broadcasts
        await ws_helper.send_json(clients[0], ClientMessage.ROOM_BROADCAST,
                                  room=room, content="Hello everyone!")

        # Other users receive the message
        for i in range(1, 3):
            message = await ws_helper.receive_json(clients[i])
            assert message["type"] == ServerMessage.ROOM_NOTIFICATION
            assert message["content"] == "Hello everyone!"


class TestGlobalBroadcast:
    """Test global broadcasting functionality."""

    @pytest.mark.asyncio
    async def test_global_broadcast(self, ws_helper):
        """Test broadcasting to all connections."""
        ws1 = await ws_helper.connect()
        ws2 = await ws_helper.connect()
        ws3 = await ws_helper.connect()

        # Consume welcome messages
        for ws in [ws1, ws2, ws3]:
            await ws_helper.receive_json(ws)

        # ws1 broadcasts globally
        await ws_helper.send_json(ws1, ClientMessage.BROADCAST,
                                  content="Global message!")

        # ws2 and ws3 should receive it
        for ws in [ws2, ws3]:
            message = await ws_helper.receive_json(ws)
            assert message["type"] == ServerMessage.NOTIFICATION
            assert message["content"] == "Global message!"


class TestHTTPEndpoints:
    """Test HTTP endpoints for WebSocket management."""

    def test_stats_endpoint_empty(self, client):
        """Test stats endpoint with no connections."""
        response = client.get("/api/v1/ws/stats")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["total_connections"] == 0
        assert data["data"]["total_sessions"] == 0

    @pytest.mark.asyncio
    async def test_stats_endpoint_with_connections(self, client, ws_helper):
        """Test stats endpoint with active connections."""
        # Create connections
        ws1 = await ws_helper.connect()
        ws2 = await ws_helper.connect()

        await ws_helper.receive_json(ws1)  # Welcome message
        await ws_helper.receive_json(ws2)  # Welcome message

        # Join rooms
        await ws_helper.send_json(ws1, ClientMessage.JOIN_ROOM, room="room1")
        await ws_helper.receive_json(ws1)  # Join confirmation

        await ws_helper.send_json(ws2, ClientMessage.JOIN_ROOM, room="room1")
        await ws_helper.receive_json(ws2)  # Join confirmation
        await ws_helper.receive_json(ws1)  # User joined notification

        # Check stats
        response = client.get("/api/v1/ws/stats")
        data = response.json()

        assert data["data"]["total_connections"] == 2
        assert data["data"]["total_sessions"] == 2
        assert data["data"]["total_rooms"] == 1
        assert data["data"]["connections_per_room"]["room1"] == 2

    def test_http_broadcast_json(self, client):
        """Test HTTP JSON broadcast endpoint."""
        message = {
            "content": "HTTP broadcast test",
            "metadata": {"source": "test"}
        }

        response = client.post("/api/v1/ws/broadcast", json=message)
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "success"
        assert "message broadcast" in data["message"]

    def test_http_room_broadcast_no_connections(self, client):
        """Test HTTP room broadcast with no active connections."""
        message = {"content": "Room broadcast test"}

        response = client.post("/api/v1/ws/broadcast/room/empty-room", json=message)
        assert response.status_code == 404
        assert "no active connections" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_http_room_broadcast_with_connections(self, client, ws_helper):
        """Test HTTP room broadcast with active connections."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        # Join room
        await ws_helper.send_json(ws, ClientMessage.JOIN_ROOM, room="test-room")
        await ws_helper.receive_json(ws)  # Join confirmation

        # HTTP broadcast to room
        message = {"content": "HTTP room message"}
        response = client.post("/api/v1/ws/broadcast/room/test-room", json=message)

        assert response.status_code == 200
        data = response.json()
        assert "broadcast to room" in data["message"]

        # WebSocket should receive the message
        received = await ws_helper.receive_json(ws)
        assert received["type"] == ServerMessage.HTTP_ROOM_BROADCAST
        assert received["content"] == "HTTP room message"


class TestErrorHandling:
    """Test error handling and edge cases."""

    @pytest.mark.asyncio
    async def test_malformed_json(self, ws_helper):
        """Test handling of malformed JSON messages."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        # Send malformed JSON (this will be treated as plain text)
        await ws.send('{"type": "ping", invalid}')

        # Should receive it as broadcast (since JSON decode fails)
        # This depends on your implementation - it might broadcast as text
        # or you might want to send an error message

    @pytest.mark.asyncio
    async def test_join_room_without_room_name(self, ws_helper):
        """Test joining room without providing room name."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        await ws_helper.send_json(ws, ClientMessage.JOIN_ROOM)  # No room specified
        response = await ws_helper.receive_json(ws)

        # Should receive success: False or error
        assert response["type"] == ServerMessage.ROOM_JOINED
        assert response["success"] is False

    @pytest.mark.asyncio
    async def test_leave_nonexistent_room(self, ws_helper):
        """Test leaving a room user was never in."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        await ws_helper.send_json(ws, ClientMessage.LEAVE_ROOM, room="nonexistent")
        response = await ws_helper.receive_json(ws)

        assert response["type"] == ServerMessage.ROOM_LEFT
        assert response["success"] is False


class TestActivityTracking:
    """Test activity tracking functionality."""

    @pytest.mark.asyncio
    async def test_activity_tracking(self, client, ws_helper):
        """Test that activity is properly tracked."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        # Send a few messages
        await ws_helper.send_json(ws, ClientMessage.PING)
        await ws_helper.receive_json(ws)  # Pong response

        await ws_helper.send_json(ws, ClientMessage.GET_STATS)
        await ws_helper.receive_json(ws)  # Stats response

        # Check activity via HTTP stats
        response = client.get("/api/v1/ws/stats")
        data = response.json()

        connection_id = list(data["data"]["active_connection_ids"])[0]
        activity = data["data"]["activity_per_connection"][connection_id]

        assert activity["messages_received"] >= 2
        assert activity["messages_sent"] >= 2
        assert "last_seen_inbound" in activity
        assert "last_seen_outbound" in activity


# Performance and stress tests
class TestPerformance:
    """Test performance and concurrent operations."""

    @pytest.mark.asyncio
    async def test_concurrent_room_operations(self, ws_helper):
        """Test concurrent room join/leave operations."""
        clients = []
        for i in range(5):
            ws = await ws_helper.connect()
            await ws_helper.receive_json(ws)  # Welcome message
            clients.append(ws)

        # Concurrent room joins
        tasks = []
        for i, ws in enumerate(clients):
            task = ws_helper.send_json(ws, ClientMessage.JOIN_ROOM, room=f"room-{i % 3}")
            tasks.append(task)

        await asyncio.gather(*tasks)

        # Consume all join confirmations
        for ws in clients:
            await ws_helper.receive_json(ws)

        # Verify room distribution
        assert len(manager.rooms) <= 3
        total_connections = sum(len(conns) for conns in manager.rooms.values())
        assert total_connections == 5

    @pytest.mark.asyncio
    async def test_rapid_message_sending(self, ws_helper):
        """Test rapid message sending doesn't break anything."""
        ws = await ws_helper.connect()
        await ws_helper.receive_json(ws)  # Welcome message

        # Send multiple pings rapidly
        for i in range(10):
            await ws_helper.send_json(ws, ClientMessage.PING)

        # Should receive all pongs
        pong_count = 0
        try:
            while pong_count < 10:
                message = await asyncio.wait_for(ws_helper.receive_json(ws), timeout=2.0)
                if message["type"] == ServerMessage.PONG:
                    pong_count += 1
        except asyncio.TimeoutError:
            pass

        assert pong_count == 10