from pydantic_settings import BaseSettings
from typing import List

try:
    from importlib.metadata import version
    VERSION = version("qubitkit-backend")
except Exception:
    VERSION = "unknown"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Qubitkit Backend"
    VERSION: str = VERSION
    API_V1_STR: str = "/api/v1"

    # Configurable settings
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    FRONTEND_URL: str

    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        return [self.FRONTEND_URL]

    class Config:
        env_file = ".env"

settings = Settings()