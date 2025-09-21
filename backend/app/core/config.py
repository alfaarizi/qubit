from importlib.metadata import version
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Qubitkit Backend"
    VERSION: str = version("qubitkit-backend")
    API_V1_STR: str = "/api/v1"
    # Configurable settings
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()