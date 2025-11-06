from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

try:
    from importlib.metadata import version, PackageNotFoundError
    VERSION = version("qubitkit-backend")
except PackageNotFoundError:
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
    LOG_FILE_PATH: Optional[Path] = None

    # MongoDB Configuration
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "qubitkitdev"

    # JWT Authentication
    SECRET_KEY: str = "your-secret-key-change-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # SQUANDER SSH Configuration
    SQUANDER_SSH_HOST: Optional[str] = None
    SQUANDER_SSH_USER: Optional[str] = None
    SQUANDER_SSH_PATH: Optional[str] = None
    SQUANDER_EXEC_TIMEOUT: int = 300
    SSH_KEY_PATH: Optional[str] = None
    SSH_TIMEOUT: int = 30

    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        return [self.FRONTEND_URL]

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent.parent / ".env"
    )

settings = Settings()