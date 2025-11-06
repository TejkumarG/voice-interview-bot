"""
Health check router.

Purpose:
    Simple health check endpoint to verify server is running.
"""

from fastapi import APIRouter
from models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Purpose:
        Verify server is running and healthy.

    Returns:
        HealthResponse with status
    """
    return HealthResponse(
        status="healthy",
        message="Voice Interview Bot API is running"
    )
