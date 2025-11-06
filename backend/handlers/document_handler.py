"""
Document handler for business logic.
Orchestrates services and repository calls.
"""

from typing import Dict, List
from utils.chunking_service import ChunkingService
from utils.embedding_service import EmbeddingService
from utils.hash_utils import compute_file_hash, extract_title_from_content
from repositories.vector_repository import VectorRepository


class DocumentHandler:
    """Handler for document business logic."""

    def __init__(
        self,
        chunking_service: ChunkingService,
        embedding_service: EmbeddingService,
        vector_repository: VectorRepository
    ):
        """Initialize with dependencies (DI)."""
        self.chunking = chunking_service
        self.embedding = embedding_service
        self.vector_repo = vector_repository

    def handle_upload(self, text: str, filename: str, is_interview: bool = False) -> Dict:
        """
        Business logic for document upload.

        Workflow:
            1. Compute file hash (document_id)
            2. Check if document already exists
            3. If is_interview=True, clear interview flag from all existing docs
            4. Use filename as title
            5. Chunk document text
            6. Generate embeddings
            7. Store in vector DB with metadata

        Args:
            text: Document content
            filename: Original filename (without extension)
            is_interview: Flag to mark as interview document

        Returns:
            Dict with document_id, title, chunks_created

        Raises:
            ValueError: If document already exists or is empty
        """
        # Compute hash as document_id
        document_id = compute_file_hash(text)

        # Check if already exists
        exists = self.vector_repo.check_exists({"document_id": document_id})
        if exists:
            raise ValueError(f"Document already uploaded (ID: {document_id})")

        # If marking as interview, clear interview flag from all existing documents
        if is_interview:
            self.vector_repo.clear_interview_flags()

        # Use filename as title
        title = filename[:100] if filename else "Untitled"

        # Chunk text
        chunks = self.chunking.chunk_text(text, document_id)
        if not chunks:
            raise ValueError("Document empty after chunking")

        # Generate embeddings
        chunk_texts = [chunk.text for chunk in chunks]
        embeddings = self.embedding.embed_batch(chunk_texts)

        # Prepare vectors with metadata
        vectors = [
            {
                "id": chunk.id,
                "values": embedding,
                "metadata": {
                    "text": chunk.text,
                    "document_id": document_id,
                    "title": title,
                    "chunk_number": chunk.metadata.get("chunk_number"),
                    "is_interview": is_interview
                }
            }
            for chunk, embedding in zip(chunks, embeddings)
        ]

        # Store vectors
        stored_count = self.vector_repo.upsert_vectors(vectors)

        return {
            "document_id": document_id,
            "title": title,
            "chunks_created": stored_count
        }

    def handle_check_exists(self, document_id: str) -> bool:
        """Check if document exists in vector store."""
        return self.vector_repo.check_exists({"document_id": document_id})

    def handle_list_documents(self) -> List[Dict]:
        """List all unique documents from vector store."""
        return self.vector_repo.list_unique_documents()

    def handle_delete_document(self, document_id: str) -> Dict:
        """
        Delete a specific document.

        Args:
            document_id: Document hash to delete

        Returns:
            Dict with success message

        Raises:
            ValueError: If document doesn't exist
        """
        # Check if document exists
        exists = self.vector_repo.check_exists({"document_id": document_id})
        if not exists:
            raise ValueError(f"Document not found (ID: {document_id})")

        # Delete all chunks with this document_id
        self.vector_repo.delete_by_filter({"document_id": document_id})

        return {
            "message": "Document deleted successfully",
            "document_id": document_id
        }

    def handle_delete_all(self) -> Dict:
        """
        Delete all data from vector store.

        Returns:
            Dict with success message
        """
        self.vector_repo.delete_all()

        return {
            "message": "All data cleared successfully"
        }
