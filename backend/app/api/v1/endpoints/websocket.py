from typing import Optional, Any, Dict
from datetime import datetime, UTC
import logging
import json
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ....core.config import settings
from ....services.websocket_manager import manager, ServerMessage, ClientMessage

logger = logging.getLogger(__name__)
router = APIRouter()

class BroadcastMessage(BaseModel):
    content: str = ""
    metadata: Dict[str, Any] = {}

async def get_websocket_user(token: Optional[str]) -> Optional[str]:
    """validate JWT token from websocket and return user email"""
    if not token:
        return None
    from ....core.security import decode_access_token
    from ....db.mongodb import MongoDB
    payload = decode_access_token(token)
    if payload is None:
        return None
    email = payload.get("sub")
    if not email:
        return None
    db = MongoDB.get_db()
    user = await db.users.find_one({"email": email})
    return email if user else None

async def handle_message(connection_id: str, message_data: Dict[str, Any]) -> None:
    session = manager.get_session(connection_id)
    if session:
        session["activity"]["last_seen_inbound"] = datetime.now(UTC)
        session["activity"]["messages_received"] += 1

    message_type = message_data.get("type")

    try:
        if message_type == ClientMessage.PING:
            await manager.send_message(connection_id, {
                "type": ServerMessage.PONG,
                "timestamp": datetime.now(UTC).isoformat()
            })

        elif message_type == ClientMessage.JOIN_ROOM:
            room = message_data.get("room")
            job_id = message_data.get("job_id")
            if room:
                success = await manager.join_room(connection_id, room)
                await manager.send_message(connection_id, {
                    "type": ServerMessage.ROOM_JOINED,
                    "room": room,
                    "job_id": job_id,
                    "success": success,
                    "timestamp": datetime.now(UTC).isoformat()
                })

        elif message_type == ClientMessage.LEAVE_ROOM:
            room = message_data.get("room")
            job_id = message_data.get("job_id")
            if room:
                success = await manager.leave_room(connection_id, room)
                await manager.send_message(connection_id, {
                    "type": ServerMessage.ROOM_LEFT,
                    "room": room,
                    "job_id": job_id,
                    "success": success,
                    "timestamp": datetime.now(UTC).isoformat()
                })

        elif message_type == ClientMessage.BROADCAST:
            content = message_data.get("content", "")
            await manager.broadcast_to_all({
                "type": ServerMessage.NOTIFICATION,
                "content": content,
                "from_connection": connection_id,
                "timestamp": datetime.now(UTC).isoformat()
            }, exclude_connection=connection_id)

        elif message_type == ClientMessage.ROOM_BROADCAST:
            room = message_data.get("room")
            content = message_data.get("content", "")
            if room:
                await manager.broadcast_to_room(room, {
                    "type": ServerMessage.ROOM_NOTIFICATION,
                    "room": room,
                    "content": content,
                    "from_connection": connection_id,
                    "timestamp": datetime.now(UTC).isoformat()
                }, exclude_connection=connection_id)

        elif message_type == ClientMessage.GET_STATS:
            stats = manager.get_stats()
            await manager.send_message(connection_id, {
                "type": ServerMessage.STATS,
                "data": stats,
                "timestamp": datetime.now(UTC).isoformat()
            })

        elif message_type == ClientMessage.COLLABORATOR_UPDATE:
            room = message_data.get("room")
            data = message_data.get("data", {})
            if room:
                await manager.broadcast_to_room(room, {
                    "type": ServerMessage.COLLABORATOR_UPDATE,
                    "data": {**data, "connection_id": connection_id},
                    "timestamp": datetime.now(UTC).isoformat()
                }, exclude_connection=connection_id)

        elif message_type == ClientMessage.COLLABORATOR_ACTION:
            room = message_data.get("room")
            action = message_data.get("action", {})
            if room:
                await manager.broadcast_to_room(room, {
                    "type": ServerMessage.COLLABORATOR_ACTION,
                    "action": {**action, "connection_id": connection_id},
                    "timestamp": datetime.now(UTC).isoformat()
                }, exclude_connection=connection_id)

        elif message_type == ClientMessage.CIRCUIT_CHANGE:
            room = message_data.get("room")
            circuit_id = message_data.get("circuit_id")
            active_circuit_id = message_data.get("active_circuit_id")
            user_id = message_data.get("user_id")
            if room:
                await manager.broadcast_to_room(room, {
                    "type": ServerMessage.CIRCUIT_CHANGE,
                    "circuit_id": circuit_id,
                    "active_circuit_id": active_circuit_id,
                    "user_id": user_id,
                    "connection_id": connection_id,
                    "timestamp": datetime.now(UTC).isoformat()
                }, exclude_connection=connection_id)

        else:
            await manager.send_message(connection_id, {
                "type": ServerMessage.ERROR,
                "message": f"unknown message type: {message_type}",
                "timestamp": datetime.now(UTC).isoformat()
            })

    except ConnectionError as e:
        logger.error("Connection error", extra={"connection_id": connection_id, "error": str(e)})
        manager.disconnect(connection_id)
    except Exception as e:
        logger.error("Error handling message", extra={"connection_id": connection_id, "error": str(e), "message_type": message_type})
        await manager.send_message(connection_id, {
            "type": ServerMessage.ERROR,
            "message": f"internal server error: {type(e).__name__}",
            "timestamp": datetime.now(UTC).isoformat()
        })


@router.websocket("/")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None, description="JWT authentication token"),
    client_id: Optional[str] = Query(None, description="Optional client identifier")
):
    """main websocket endpoint for real-time communication"""
    user_email = await get_websocket_user(token)
    connection_id = await manager.connect(websocket, client_id)
    if user_email:
        manager.update_session(connection_id, user={"email": user_email, "authenticated": True})
    logger.info(f"[WebSocket] Connection established: {connection_id} (auth: {bool(user_email)})")

    try:
        try:
            await manager.send_message(connection_id, {
                "type": ServerMessage.CONNECTION_ESTABLISHED,
                "connection_id": connection_id,
                "message": f"connected to {settings.PROJECT_NAME}",
                "timestamp": datetime.now(UTC).isoformat()
            })
            logger.info(f"[WebSocket] Welcome message sent: {connection_id}")
        except Exception as e:
            logger.error(f"[WebSocket] Failed to send welcome message: {connection_id} - {e}", exc_info=True)
            raise
            
        while True:
            data = await websocket.receive_text()
            logger.debug(f"[WebSocket] Message received okfewfegregreg: {connection_id} - {data}")
            try:
                message_data = json.loads(data)
                if not isinstance(message_data, dict):
                    raise ValueError("Message must be dict")
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"[WebSocket] Invalid message: {connection_id} - {e}")
                message_data = {
                    "type": ClientMessage.BROADCAST,
                    "content": data
                }
            await handle_message(connection_id, message_data)
    except WebSocketDisconnect:
        logger.info(f"[WebSocket] Client disconnected: {connection_id}")
        manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"[WebSocket] Unhandled error: {connection_id} - {e}", exc_info=True)
        manager.disconnect(connection_id)


@router.websocket("/room/{room_name}")
async def room_websocket_endpoint(
    websocket: WebSocket,
    room_name: str,
    client_id: Optional[str] = Query(None, description="Optional client identifier")
):
    """WebSocket endpoint that automatically joins a specific room."""
    connection_id = await manager.connect(websocket, client_id)

    await manager.join_room(connection_id, room_name)

    await manager.send_message(connection_id, {
        "type": ServerMessage.CONNECTION_ESTABLISHED,
        "connection_id": connection_id,
        "room": room_name,
        "message": f"connected to room: {room_name}",
        "timestamp": datetime.now(UTC).isoformat()
    })

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                if not isinstance(message_data, dict):
                    raise ValueError
            except (json.JSONDecodeError, ValueError):
                logger.warning("Received non-JSON message", extra={"connection_id": connection_id})
                message_data = {
                    "type": ClientMessage.ROOM_BROADCAST,
                    "room": room_name,
                    "content": data
                }
            await handle_message(connection_id, message_data)
    except WebSocketDisconnect:
        manager.disconnect(connection_id)
    except Exception as e:
        logger.error("Connection error in the room", extra={"connection_id": connection_id, "error": str(e), "room": room_name})
        manager.disconnect(connection_id)


@router.get("/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics."""
    return JSONResponse(content={
        "status": "success",
        "data": manager.get_stats(),
        "timestamp": datetime.now(UTC).isoformat()
    })

@router.post("/broadcast")
async def broadcast(message: BroadcastMessage):
    """Broadcast JSON message to all WebSocket connections."""
    try:
        await manager.broadcast_to_all({
            "type": ServerMessage.HTTP_BROADCAST,
            "content": message.content,
            "metadata": message.metadata,
            "timestamp": datetime.now(UTC).isoformat()
        })
        return JSONResponse(content={
            "status": "success",
            "message": "message broadcast to all connections",
            "total_connections": len(manager.connections)
        })
    except Exception as e:
        logger.error("Error broadcasting JSON message", extra={"error": str(e)})
        raise HTTPException(status_code=500, detail="Failed to broadcast JSON message")

@router.post("/broadcast/room/{room_name}")
async def broadcast_to_room(room_name: str, message: BroadcastMessage):
    """Broadcast JSON message to a specific room."""
    try:
        room_connections = manager.get_room_connections(room_name)
        if not room_connections:
            raise HTTPException(status_code=404, detail=f"Room '{room_name}' has no active connections")

        await manager.broadcast_to_room(room_name, {
            "type": ServerMessage.HTTP_ROOM_BROADCAST,
            "room": room_name,
            "content": message.content,
            "metadata": message.metadata,
            "timestamp": datetime.now(UTC).isoformat()
        })

        return JSONResponse(content={
            "status": "success",
            "message": f"message broadcast to room '{room_name}'",
            "total_connections": len(room_connections)
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error broadcasting JSON message to the room", extra={"error": str(e), "room": room_name})
        raise HTTPException(status_code=500, detail="Failed to broadcast JSON to room")