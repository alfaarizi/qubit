from fastapi import APIRouter
from .endpoints import health, websocket, circuits, projects, auth

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"])
api_router.include_router(circuits.router, prefix="/circuits", tags=["circuits"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])