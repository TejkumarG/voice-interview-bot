"""Chat router - HTTP layer."""

from fastapi import APIRouter, HTTPException, Depends
from models.schemas import ChatRequest, ChatResponse
from services.chat_service import ChatService
from dependencies import get_chat_service

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    service: ChatService = Depends(get_chat_service)
):
    """Chat endpoint with RAG."""
    try:
        # Call service
        result = service.process_chat(request.message, request.document_id, request.interview_mode)

        # Return response
        return ChatResponse(
            response=result["response"],
            status=result["status"],
            sources_used=result["sources_used"],
            sources=result["sources"]
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
