from typing import List, Dict
from importlib import metadata, import_module
from functools import cache
from pathlib import Path
import tomllib
import re

from fastapi import APIRouter
from fastapi import status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db import get_database

PACKAGE_TO_MODULE = {
    "pydantic-settings": "pydantic_settings",
    "python-json-logger": "pythonjsonlogger",
}

router = APIRouter()

@cache
def get_dependencies() -> List[str]:
    pyproject_path = Path(__file__).resolve().parents[4] / "pyproject.toml"
    with open(pyproject_path, "rb") as f:
        pyproject = tomllib.load(f)
    project_name = pyproject["project"]["name"]
    dist = metadata.distribution(project_name)
    requires = dist.requires or []
    return [re.split(r"[><=!\[]", req.split()[0])[0] for req in requires if "extra ==" not in req]

def check_dependency(package: str) -> str:
    module_name = PACKAGE_TO_MODULE.get(package, package)
    try:
        import_module(module_name)
        version = metadata.version(package)
        return f"OK (v{version})"
    except Exception as e:
        return f"ERROR: {str(e)}"

@router.get("/")
async def health_check():
    try:
        deps = get_dependencies()
    except Exception as e:
        return JSONResponse(
            content={
                "status": "unhealthy",
                "message": f"cannot read dependencies: {e}",
                "dependencies": None,
            },
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    dependencies: Dict[str, str] = {pkg: check_dependency(pkg) for pkg in deps}

    ok_count = sum("OK" in stat for stat in dependencies.values())

    if ok_count == len(dependencies):
        status_str = "healthy"
        status_code = status.HTTP_200_OK
    elif ok_count == 0:
        status_str = "unhealthy"
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    else:
        status_str = "degraded"
        status_code = status.HTTP_200_OK

    # get database info
    try:
        db = get_database()
        db_name = db.name
        db_environment = settings.ENVIRONMENT
    except Exception as e:
        db_name = f"ERROR: {str(e)}"
        db_environment = settings.ENVIRONMENT

    return JSONResponse(
        content={
            "status": status_str,
            "message": f"{settings.PROJECT_NAME} is running{' with issues' if status_str != 'healthy' else ''}",
            "dependencies": dependencies,
            "database": {
                "name": db_name,
                "environment": db_environment,
            },
        },
        status_code=status_code,
    )