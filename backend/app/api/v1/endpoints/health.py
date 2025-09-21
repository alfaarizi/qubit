from typing import Dict
from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()

@router.get("/")
async def health_check():
    dependencies: Dict[str, str] = {}
    try:
        import qubitkit
        dependencies["qubitkit"] = f"OK (v{qubitkit.__version__})"
    except ImportError as e:
        dependencies["qubitkit"] = f"ERROR: {str(e)}"
    except Exception as e:
        dependencies["qubitkit"] = f"ERROR: {str(e)}"

    is_healthy = all("OK" in status for status in dependencies.values())

    return {
        "status": "healthy",
        "message": f"{settings.PROJECT_NAME} is {'running' if is_healthy else 'running with issues'}",
        "dependencies": dependencies
    }