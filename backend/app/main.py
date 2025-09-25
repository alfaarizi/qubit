from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .core.config import settings
from .api.v1.api import api_router

def create_application() -> FastAPI:
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
        reload=settings.DEBUG
    )

if __name__ == "__main__":
    main()
