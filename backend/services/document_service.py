"""
Document service for orchestration.
Coordinates handlers and workflows.
"""

from typing import Dict
from handlers.document_handler import DocumentHandler


class DocumentService:
    """Service for document operations orchestration."""

    def __init__(self, document_handler: DocumentHandler):
        """Initialize with handler dependency."""
        self.document_handler = document_handler

    def process_upload(
        self,
        text: str,
        filename: str,
        is_interview: bool = False,
        max_size: int = 5242880
    ) -> Dict:
        """
        Orchestrate document upload workflow.

        Args:
            text: Document content
            filename: Original filename (without extension)
            is_interview: Flag to mark as interview document
            max_size: Max size in bytes

        Returns:
            Dict with document_id, title, chunks_created, message

        Raises:
            ValueError: If validation fails or duplicate
        """
        # Validate input
        if not text or not text.strip():
            raise ValueError("Document cannot be empty")

        if len(text.encode('utf-8')) > max_size:
            raise ValueError(f"Document too large (max {max_size} bytes)")

        # Call handler
        result = self.document_handler.handle_upload(text, filename, is_interview)

        # Format response
        return {
            "document_id": result["document_id"],
            "title": result["title"],
            "chunks_created": result["chunks_created"],
            "message": "Document uploaded successfully"
        }

    def list_documents(self, page: int = 1, limit: int = 10) -> Dict:
        """
        Orchestrate document listing with pagination.

        Args:
            page: Page number (1-indexed)
            limit: Items per page

        Returns:
            Dict with documents list, pagination info
        """
        # Get all documents
        all_docs = self.document_handler.handle_list_documents()

        # Calculate pagination
        total = len(all_docs)
        start = (page - 1) * limit
        end = start + limit
        has_more = end < total

        # Slice for current page
        documents = all_docs[start:end]

        return {
            "documents": documents,
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": has_more
        }

    def delete_document(self, document_id: str) -> Dict:
        """
        Orchestrate document deletion workflow.

        Args:
            document_id: Document hash to delete

        Returns:
            Dict with success message

        Raises:
            ValueError: If document doesn't exist
        """
        if not document_id or not document_id.strip():
            raise ValueError("Document ID cannot be empty")

        result = self.document_handler.handle_delete_document(document_id)

        return {
            "message": result["message"],
            "document_id": result["document_id"]
        }

    def delete_all_documents(self) -> Dict:
        """
        Orchestrate delete all workflow.

        Returns:
            Dict with success message
        """
        result = self.document_handler.handle_delete_all()

        return {
            "message": result["message"]
        }
