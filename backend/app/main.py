import sys
import logging
import asyncio
from pythonjsonlogger.json import JsonFormatter

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .core.config import settings
from .api.v1.api import api_router
from .services.squander_client import SquanderClient
from .db.mongodb import MongoDB

def setup_logging():
    # Use simple formatter for readability (comment out for JSON)
    formatter = logging.Formatter(
        fmt='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%H:%M:%S'
    )
    # Uncomment below to use JSON formatter
    # formatter = JsonFormatter(
    #     fmt="%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d",
    #     datefmt="%Y-%m-%d %H:%M:%S"
    # )
    root_logger = logging.getLogger()
    root_logger.handlers.clear()

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    if settings.LOG_FILE_PATH:
        settings.LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(settings.LOG_FILE_PATH)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

    root_logger.setLevel(logging.INFO if not settings.DEBUG else logging.DEBUG)

def create_application() -> FastAPI:
    setup_logging()

    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        docs_url=f"{settings.API_V1_STR}/docs"
    )

    application.add_middleware(
        CORSMiddleware, # type: ignore
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

    application.include_router(api_router, prefix=settings.API_V1_STR)

    @application.on_event("startup")
    async def startup_event():
        """Initialize services on startup"""
        # Connect to MongoDB
        await MongoDB.connect_db()
        logging.info("MongoDB connection established")
        # Start SSH cleanup task
        async def cleanup_loop():
            while True:
                await asyncio.sleep(60)  # Run every minute
                await SquanderClient.cleanup_stale_connections(max_idle_seconds=300)
        asyncio.create_task(cleanup_loop())
        logging.info("Started SSH connection cleanup task (checks every 60s, cleans after 300s idle)")

    @application.on_event("shutdown")
    async def shutdown_event():
        """Cleanup on shutdown"""
        await MongoDB.close_db()
        logging.info("MongoDB connection closed")

    @application.get('/favicon.ico', include_in_schema=False)
    async def favicon():
        return FileResponse('favicon.ico')

    @application.get("/")
    async def root():
        return {"message": f"Welcome to {settings.PROJECT_NAME}"}

    return application

app = create_application()

def main():
    import uvicorn
    uvicorn.run(
        "app.main:app" if settings.DEBUG else app,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_config=None
    )

if __name__ == "__main__":
    main()
