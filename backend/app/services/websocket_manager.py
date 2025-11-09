from typing import Dict, Optional, Set, Any, List
from datetime import datetime, UTC
from enum import Enum
import logging
import json
import uuid

from fastapi import WebSocket
import asyncio

logger = logging.getLogger(__name__)

class ClientMessage(str, Enum):
    PING = "ping"
    JOIN_ROOM = "join_room"
    LEAVE_ROOM = "leave_room"
    BROADCAST = "broadcast"
    ROOM_BROADCAST = "room_broadcast"
    GET_STATS = "get_stats"
    # collaboration messages
    CURSOR_MOVE = "cursor_move"
    GATE_OPERATION = "gate_operation"
    GATE_LOCK = "gate_lock"
    GATE_UNLOCK = "gate_unlock"
    SELECTION_CHANGE = "selection_change"

class ServerMessage(str, Enum):
    CONNECTION_ESTABLISHED = "connection_established"
    CONNECTION_UPDATE = "connection_update"
    PONG = "pong"
    ROOM_JOINED = "room_joined"
    ROOM_LEFT = "room_left"
    NOTIFICATION = "notification"
    ROOM_NOTIFICATION = "room_notification"
    STATS = "stats"
    ERROR = "error"
    HTTP_BROADCAST = "http_broadcast"
    HTTP_ROOM_BROADCAST = "http_room_broadcast"
    # collaboration messages
    CURSOR_UPDATE = "cursor_update"
    GATE_OP_UPDATE = "gate_op_update"
    GATE_LOCKED = "gate_locked"
    GATE_UNLOCKED = "gate_unlocked"
    SELECTION_UPDATE = "selection_update"
    USER_PRESENCE = "user_presence"

class ConnectionEvent(str, Enum):
    USER_CONNECTED = "user_connected"
    USER_DISCONNECTED = "user_disconnected"
    USER_JOINED_ROOM = "user_joined_room"
    USER_LEFT_ROOM = "user_left_room"

class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.rooms: Dict[str, Set[str]] = {}
        self.gate_locks: Dict[str, Dict[str, str]] = {}  # {room: {gate_id: connection_id}}

    async def connect(self, websocket: WebSocket, client_id: Optional[str] = None) -> str:
        await websocket.accept()
        connection_id = client_id or str(uuid.uuid4())
        self.connections[connection_id] = websocket
        self.sessions[connection_id] = {
            "connected_at": datetime.now(UTC),
            "rooms": set(),
            "user": {},
            "client": {},
            "activity": {
                "last_seen_inbound": datetime.now(UTC),
                "last_seen_outbound": datetime.now(UTC),
                "messages_received": 0,
                "messages_sent": 0
            }
        }
        logger.info("WebSocket connection established", extra={"connection_id": connection_id})
        await self.broadcast_to_all({
            "type": ServerMessage.CONNECTION_UPDATE,
            "event": ConnectionEvent.USER_CONNECTED,
            "connection_id": connection_id,
            "total_connections": len(self.connections),
            "timestamp": datetime.now(UTC).isoformat()
        }, exclude_connection=connection_id)
        return connection_id

    def disconnect(self, connection_id: str):
        if connection_id not in self.connections:
            return
        
        # release all gate locks held by this connection
        self.release_all_locks(connection_id)
        
        if connection_id in self.sessions:
            rooms = self.sessions[connection_id]["rooms"].copy()
            for room in rooms:
                if room in self.rooms and connection_id in self.rooms[room]:
                    self.rooms[room].remove(connection_id)
                    if not self.rooms[room]:
                        del self.rooms[room]
            del self.sessions[connection_id]
        if connection_id in self.connections:
            del self.connections[connection_id]
        logger.info("WebSocket connection closed", extra={"connection_id": connection_id})
        try:
            asyncio.get_running_loop().create_task(self.broadcast_to_all({
                "type": ServerMessage.CONNECTION_UPDATE,
                "event": ConnectionEvent.USER_DISCONNECTED,
                "connection_id": connection_id,
                "total_connections": len(self.connections),
                "timestamp": datetime.now(UTC).isoformat()
            }))
        except RuntimeError:
            pass

    async def join_room(self, connection_id: str, room: str) -> bool:
        if connection_id not in self.connections:
            return False
        if room not in self.rooms:
            self.rooms[room] = set()
        is_added = connection_id not in self.rooms[room]
        self.rooms[room].add(connection_id)
        if connection_id in self.sessions:
            self.sessions[connection_id]["rooms"].add(room)
        if is_added:
            logger.info("Connection joined room", extra={"connection_id": connection_id, "room": room})
            await self.broadcast_to_room(room, {
                "type": ServerMessage.CONNECTION_UPDATE,
                "event": ConnectionEvent.USER_JOINED_ROOM,
                "connection_id": connection_id,
                "room": room,
                "timestamp": datetime.now(UTC).isoformat()
            }, exclude_connection=connection_id)
        return is_added

    async def leave_room(self, connection_id: str, room: str):
        is_removed = False
        if room in self.rooms and connection_id in self.rooms[room]:
            self.rooms[room].remove(connection_id)
            is_removed = True
            if not self.rooms[room]:
                del self.rooms[room]
        if connection_id in self.sessions:
            self.sessions[connection_id]["rooms"].discard(room)
        if is_removed:
            logger.info("Connection left room", extra={"connection_id": connection_id, "room": room})
            await self.broadcast_to_room(room, {
                "type": ServerMessage.CONNECTION_UPDATE,
                "event": ConnectionEvent.USER_LEFT_ROOM,
                "connection_id": connection_id,
                "room": room,
                "timestamp": datetime.now(UTC).isoformat()
            }, exclude_connection=connection_id)
        return is_removed

    async def send_message(self, connection_id: str, message: Any):
        if connection_id not in self.connections:
            return False
        websocket = self.connections[connection_id]
        message_str = json.dumps(message) if isinstance(message, dict) else str(message)
        await self._send_message_safe(websocket, connection_id, message_str)
        return True

    async def broadcast_to_room(self, room: str, message: Any, exclude_connection: Optional[str] = None):
        if room not in self.rooms:
            logger.warning(f"Room '{room}' does not exist. Connections in room: none. Active rooms: {list(self.rooms.keys())}")
            return
        message_str = json.dumps(message) if isinstance(message, dict) else str(message)
        # skip logging for frequent messages
        msg_type = message.get("type") if isinstance(message, dict) else None
        if msg_type not in ["cursor_update", "selection_update", "gate_op_update"]:
            logger.debug(f"Broadcasting to room '{room}': {message}")
        await asyncio.gather(
            *(
                self._send_message_safe(self.connections[connection_id], connection_id, message_str)
                for connection_id in self.rooms[room]
                if connection_id != exclude_connection and connection_id in self.connections
            ),
            return_exceptions=True
        )

    async def broadcast_to_all(self, message: Any, exclude_connection: Optional[str] = None):
        if not self.connections:
            return
        message_str = json.dumps(message) if isinstance(message, dict) else str(message)
        await asyncio.gather(
            *(
                self._send_message_safe(websocket, connection_id, message_str)
                for connection_id, websocket in self.connections.items()
                if connection_id != exclude_connection
            ),
            return_exceptions=True
        )

    def update_session(self, connection_id: str, **updates):
        if connection_id in self.sessions:
            session = self.sessions[connection_id]
            for key, value in updates.items():
                if key in ["user", "client", "activity"]:
                    session[key].update(value)
                else:
                    session[key] = value
            return True
        return False

    def get_session(self, connection_id: str) -> Optional[Dict[str, Any]]:
        return self.sessions.get(connection_id)

    def get_room_connections(self, room: str) -> Set[str]:
        return self.rooms.get(room, set()).copy()

    def get_connection_rooms(self, connection_id: str) -> Set[str]:
        return self.sessions[connection_id]["rooms"].copy() if connection_id in self.sessions else set()

    def lock_gate(self, room: str, gate_id: str, connection_id: str) -> bool:
        """lock a gate for editing"""
        if room not in self.gate_locks:
            self.gate_locks[room] = {}
        
        if gate_id in self.gate_locks[room]:
            # already locked by someone else
            return False
        
        self.gate_locks[room][gate_id] = connection_id
        return True
    
    def unlock_gate(self, room: str, gate_id: str, connection_id: str) -> bool:
        """unlock a gate"""
        if room not in self.gate_locks:
            return False
        
        if gate_id not in self.gate_locks[room]:
            return False
        
        # only the lock owner can unlock
        if self.gate_locks[room][gate_id] != connection_id:
            return False
        
        del self.gate_locks[room][gate_id]
        return True
    
    def get_gate_lock_owner(self, room: str, gate_id: str) -> Optional[str]:
        """get the connection_id that owns the lock"""
        if room not in self.gate_locks:
            return None
        return self.gate_locks[room].get(gate_id)
    
    def release_all_locks(self, connection_id: str):
        """release all locks held by a connection"""
        for room, locks in self.gate_locks.items():
            gates_to_unlock = [gate_id for gate_id, owner in locks.items() if owner == connection_id]
            for gate_id in gates_to_unlock:
                del locks[gate_id]

    def get_room_presence(self, room: str) -> List[Dict[str, Any]]:
        """get presence info for all users in a room"""
        if room not in self.rooms:
            return []
        
        presence = []
        for connection_id in self.rooms[room]:
            if connection_id in self.sessions:
                session = self.sessions[connection_id]
                presence.append({
                    "connectionId": connection_id,
                    "user": session.get("user", {}),
                    "client": session.get("client", {}),
                })
        return presence

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_connections": len(self.connections),
            "total_sessions": len(self.sessions),
            "total_rooms": len(self.rooms),
            "active_connection_ids": list(self.connections.keys()),
            "connections_per_room": {
                room: len(connections)
                for room, connections in self.rooms.items()
            },
            "activity_per_connection": {
                cid: {
                    "last_seen_inbound": session["activity"]["last_seen_inbound"].isoformat(),
                    "last_seen_outbound": session["activity"]["last_seen_outbound"].isoformat(),
                    "messages_received": session["activity"]["messages_received"],
                    "messages_sent": session["activity"]["messages_sent"]
                }
                for cid, session in self.sessions.items()
            }
        }

    async def _send_message_safe(self, websocket: WebSocket, connection_id: str, message: str):
        try:
            await websocket.send_text(message)
            if connection_id in self.sessions:
                activity = self.sessions[connection_id]["activity"]
                activity["last_seen_outbound"] = datetime.now(UTC)
                activity["messages_sent"] += 1
        except Exception as e:
            logger.error("Error broadcasting", extra={"connection_id": connection_id, "error": str(e)})
            self.disconnect(connection_id)

manager = ConnectionManager()