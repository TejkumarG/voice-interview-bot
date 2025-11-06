"""Text chunking service for splitting documents into manageable pieces."""

from typing import List
from models.schemas import DocumentChunk
import uuid


class ChunkingService:
    """Service for splitting text into chunks with overlap."""

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        """Initialize chunking service."""
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be less than chunk_size")

        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_text(self, text: str, session_id: str) -> List[DocumentChunk]:
        """Split text into overlapping chunks."""
        # Clean the text
        text = self._clean_text(text)

        if not text:
            return []

        chunks = []
        start = 0
        chunk_number = 0

        while start < len(text):
            # Calculate end position for this chunk
            end = start + self.chunk_size

            # Extract chunk text
            chunk_text = text[start:end]

            # Skip empty chunks
            if not chunk_text.strip():
                break

            # Create chunk object
            chunk = DocumentChunk(
                id=f"{session_id}_chunk_{chunk_number}",
                text=chunk_text.strip(),
                metadata={
                    "session_id": session_id,
                    "chunk_number": chunk_number,
                    "start_char": start,
                    "end_char": end,
                    "total_chars": len(chunk_text)
                }
            )

            chunks.append(chunk)

            # Move to next chunk with overlap
            start = end - self.chunk_overlap
            chunk_number += 1

            # Safety check: prevent infinite loop
            if chunk_number > 10000:
                raise ValueError("Document too large: exceeds 10,000 chunks")

        return chunks

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Replace multiple newlines with double newline
        text = '\n'.join(line.strip() for line in text.split('\n'))

        # Replace multiple spaces with single space
        while '  ' in text:
            text = text.replace('  ', ' ')

        # Remove excessive newlines (more than 2)
        while '\n\n\n' in text:
            text = text.replace('\n\n\n', '\n\n')

        return text.strip()

    def get_chunk_stats(self, chunks: List[DocumentChunk]) -> dict:
        """Get statistics about chunks."""
        if not chunks:
            return {
                "total_chunks": 0,
                "total_characters": 0,
                "avg_chunk_size": 0,
                "min_chunk_size": 0,
                "max_chunk_size": 0
            }

        chunk_sizes = [len(chunk.text) for chunk in chunks]

        return {
            "total_chunks": len(chunks),
            "total_characters": sum(chunk_sizes),
            "avg_chunk_size": sum(chunk_sizes) // len(chunk_sizes),
            "min_chunk_size": min(chunk_sizes),
            "max_chunk_size": max(chunk_sizes)
        }
