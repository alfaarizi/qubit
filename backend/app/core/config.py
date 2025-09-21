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

    DOMAIN: str = "localhost:8000"
    FRONTEND_DOMAIN: str = "localhost:3000"

    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        if self.DEBUG:
            return [
                f"http://{self.FRONTEND_DOMAIN}",
                f"https://{self.FRONTEND_DOMAIN}",
                "http://localhost:3000"
            ]
        else:
            return [f"https://{self.FRONTEND_DOMAIN}"]

    @property
    def API_URL(self) -> str:
        protocol = "http" if self.DEBUG else "https"
        return f"{protocol}://{self.DOMAIN}{self.API_V1_STR}"

    class Config:
        env_file = ".env"

settings = Settings()