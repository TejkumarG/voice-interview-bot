"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import get_settings
from api.routers import health, document, chat


# Initialize app
app = FastAPI(
    title="Voice Interview Bot API",
    description="Backend with 4-layer architecture: Router→Service→Handler→Repo",
    version="1.0.0"
)


# CORS middleware
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(health.router)
app.include_router(document.router)
app.include_router(chat.router)


# Run server
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
