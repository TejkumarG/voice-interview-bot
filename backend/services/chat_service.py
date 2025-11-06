"""Chat service for orchestration."""

from typing import Dict
from handlers.chat_handler import ChatHandler


class ChatService:
    """Service for chat operations orchestration."""

    def __init__(self, chat_handler: ChatHandler):
        """Initialize with handler dependency."""
        self.chat_handler = chat_handler

    def process_chat(self, message: str, document_id: str = None, interview_mode: bool = False) -> Dict:
        """
        Orchestrate chat workflow.

        Args:
            message: User question
            document_id: Optional document hash (searches all if None)
            interview_mode: If True, searches only interview documents

        Returns:
            Dict with response, status, sources_used

        Raises:
            ValueError: If validation fails
        """
        # Validate input
        if not message or not message.strip():
            raise ValueError("Message cannot be empty")

        if len(message) > 1000:
            raise ValueError("Message too long (max 1000 characters)")

        # Call handler (document_id is optional)
        result = self.chat_handler.handle_chat(message, document_id, interview_mode)

        # Format response
        return {
            "response": result["response"],
            "status": "success",
            "sources_used": result["sources_used"],
            "sources": result.get("sources", [])
        }
