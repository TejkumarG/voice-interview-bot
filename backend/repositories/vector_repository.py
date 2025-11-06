"""Vector repository for Pinecone data access."""

from pinecone import Pinecone, ServerlessSpec
from typing import List, Dict, Any


class VectorRepository:
    """Repository for Pinecone vector storage operations."""

    def __init__(self, api_key: str, index_name: str, dimension: int):
        """Initialize Pinecone connection."""
        self.pc = Pinecone(api_key=api_key)
        self.index_name = index_name
        self.dimension = dimension
        self._ensure_index_exists()
        self.index = self.pc.Index(index_name)

    def _ensure_index_exists(self):
        """Create index if doesn't exist."""
        existing = [idx.name for idx in self.pc.list_indexes()]
        if self.index_name not in existing:
            self.pc.create_index(
                name=self.index_name,
                dimension=self.dimension,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )

    def upsert_vectors(self, vectors: List[Dict[str, Any]]) -> int:
        """
        Insert or update vectors.

        Args:
            vectors: List of dicts with id, values, metadata

        Returns:
            Number of vectors upserted
        """
        self.index.upsert(vectors=vectors)
        return len(vectors)

    def query_vectors(
        self,
        vector: List[float],
        filter: Dict[str, Any],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Query similar vectors.

        Args:
            vector: Query vector
            filter: Metadata filter (e.g., {"document_id": "abc123"})
            top_k: Number of results

        Returns:
            List of matches with id, score, metadata
        """
        response = self.index.query(
            vector=vector,
            top_k=top_k,
            filter=filter,
            include_metadata=True
        )

        return [
            {
                "id": match.id,
                "score": match.score,
                "text": match.metadata.get("text", ""),
                "metadata": match.metadata
            }
            for match in response.matches
        ]

    def list_unique_documents(self) -> List[Dict[str, Any]]:
        """List all unique documents in Pinecone."""
        # Query with dummy vector to get results
        # In production, consider maintaining a separate index for metadata
        response = self.index.query(
            vector=[0.0] * self.dimension,
            top_k=10000,  # Get many results
            include_metadata=True
        )

        # Group by document_id
        documents_map = {}
        for match in response.matches:
            doc_id = match.metadata.get("document_id")
            if doc_id and doc_id not in documents_map:
                documents_map[doc_id] = {
                    "document_id": doc_id,
                    "title": match.metadata.get("title", "Untitled"),
                    "total_chunks": 1,
                    "is_interview": match.metadata.get("is_interview", False)
                }
            elif doc_id:
                documents_map[doc_id]["total_chunks"] += 1

        return list(documents_map.values())

    def delete_by_filter(self, filter: Dict[str, Any]):
        """
        Delete vectors matching filter.

        Args:
            filter: Metadata filter for deletion
        """
        self.index.delete(filter=filter)

    def delete_all(self):
        """Delete all vectors from the index."""
        self.index.delete(delete_all=True)

    def check_exists(self, filter: Dict[str, Any]) -> bool:
        """
        Check if vectors exist matching filter.

        Args:
            filter: Metadata filter

        Returns:
            True if vectors exist
        """
        response = self.index.query(
            vector=[0.0] * self.dimension,
            top_k=1,
            filter=filter
        )
        return len(response.matches) > 0

    def clear_interview_flags(self):
        """Clear interview flag from all existing documents."""
        # Get all vectors with interview flag
        response = self.index.query(
            vector=[0.0] * self.dimension,
            top_k=10000,
            filter={"is_interview": True},
            include_metadata=True
        )

        # Update each vector to set is_interview=False
        if response.matches:
            for match in response.matches:
                self.index.update(
                    id=match.id,
                    set_metadata={"is_interview": False}
                )

    def set_interview_flag(self, document_id: str, value: bool):
        """Set interview flag for all chunks of a specific document."""
        # Get all vectors for this document
        response = self.index.query(
            vector=[0.0] * self.dimension,
            top_k=10000,
            filter={"document_id": document_id},
            include_metadata=True
        )

        # Update each chunk's metadata
        if response.matches:
            for match in response.matches:
                self.index.update(
                    id=match.id,
                    set_metadata={"is_interview": value}
                )
