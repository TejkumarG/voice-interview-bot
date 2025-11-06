"""
Chat handler for business logic.
Orchestrates search and LLM response generation.
"""

from typing import Dict
from utils.embedding_service import EmbeddingService
from utils.llm_service import LLMService
from repositories.vector_repository import VectorRepository


class ChatHandler:
    """Handler for chat business logic with RAG."""

    def __init__(
        self,
        embedding_service: EmbeddingService,
        llm_service: LLMService,
        vector_repository: VectorRepository
    ):
        """Initialize with dependencies (DI)."""
        self.embedding = embedding_service
        self.llm = llm_service
        self.vector_repo = vector_repository

    def handle_chat(self, message: str, document_id: str = None, interview_mode: bool = False) -> Dict:
        """
        Business logic for chat with RAG.

        Workflow:
            1. If document_id provided: Direct search → top 5 chunks → LLM
            2. If document_id is None: Two-stage RAG pipeline:
               - Stage 1: Semantic search → top 3 chunks
               - Stage 2: Extract document_ids → get all chunks from those docs
               - Stage 3: Semantic search on those chunks → top 5 → LLM

        Args:
            message: User question
            document_id: Optional document hash (searches all if None)

        Returns:
            Dict with response, sources_used

        Raises:
            ValueError: If specific document not found
        """
        # Embed query
        query_embedding = self.embedding.embed_text(message)

        if document_id:
            # Direct single-stage search
            print(f"\n🔍 [SINGLE-STAGE RAG] Searching 1 specific document")
            print(f"   Document ID: {document_id[:16]}...")
            has_document = self.vector_repo.check_exists({"document_id": document_id})
            if not has_document:
                raise ValueError(f"Document not found (ID: {document_id})")

            search_results = self.vector_repo.query_vectors(
                vector=query_embedding,
                filter={"document_id": document_id},
                top_k=5
            )
            print(f"   ✅ Found {len(search_results)} chunks from 1 document")
        else:
            # Determine filter based on interview_mode
            stage1_filter = {"is_interview": True} if interview_mode else {}

            # Two-stage RAG pipeline
            if interview_mode:
                print(f"\n🔍 [TWO-STAGE RAG] Searching across ALL INTERVIEW documents")
            else:
                print(f"\n🔍 [TWO-STAGE RAG] Searching across ALL documents")

            # Stage 1: Get top 3 chunks to identify relevant documents
            print(f"   📍 Stage 1: Getting top-3 chunks...")
            stage1_results = self.vector_repo.query_vectors(
                vector=query_embedding,
                filter=stage1_filter,
                top_k=3
            )

            if not stage1_results:
                print(f"   ❌ No results found")
                search_results = []
            else:
                # Extract unique document_ids from top 3 chunks
                doc_ids = set()
                for result in stage1_results:
                    doc_id = result.get("metadata", {}).get("document_id")
                    if doc_id:
                        doc_ids.add(doc_id)

                print(f"   📍 Stage 2: Found {len(doc_ids)} unique documents from top-3 chunks")

                # Stage 2: Get all chunks from those document_ids and re-rank
                if doc_ids:
                    all_chunks = []
                    for doc_id in doc_ids:
                        # Query all chunks from this document
                        print(f"      - Fetching all chunks from doc {doc_id[:16]}...")
                        chunks = self.vector_repo.query_vectors(
                            vector=query_embedding,
                            filter={"document_id": doc_id},
                            top_k=10000  # Get all chunks from this doc
                        )
                        print(f"        → Got {len(chunks)} chunks")
                        all_chunks.extend(chunks)

                    print(f"   📍 Stage 3: Re-ranking {len(all_chunks)} total chunks...")
                    # Sort all chunks by score and take top 5
                    sorted_chunks = sorted(
                        all_chunks,
                        key=lambda x: x.get("score", 0),
                        reverse=True
                    )
                    search_results = sorted_chunks[:5]
                    print(f"   ✅ Selected top-5 chunks from {len(doc_ids)} documents")
                else:
                    search_results = []

        # Format context
        context = None
        sources_used = False
        sources = []
        if search_results:
            context = self._format_context(search_results)
            sources_used = True

            # Extract source information - include ALL chunks used
            for result in search_results:
                doc_id = result.get("metadata", {}).get("document_id")
                chunk_text = result.get("text", "")
                if doc_id:
                    print(f"      - Source chunk: {len(chunk_text)} chars from {doc_id[:12]}... chunk #{result.get('metadata', {}).get('chunk_number', 0)}")
                    sources.append({
                        "document_id": doc_id,
                        "title": result.get("metadata", {}).get("title", "Unknown"),
                        "chunk_number": result.get("metadata", {}).get("chunk_number", 0),
                        "text": chunk_text
                    })

        # Generate response
        response_text = self.llm.generate_response(
            user_message=message,
            context=context
        )

        print(f"   📚 Sources: {len(sources)} document(s) used\n")

        return {
            "response": response_text,
            "sources_used": sources_used,
            "sources": sources
        }

    def _format_context(self, search_results: list) -> str:
        """Format search results into context string."""
        # Sort by score
        sorted_results = sorted(
            search_results,
            key=lambda x: x.get("score", 0),
            reverse=True
        )

        # Extract text from top results
        context_parts = [
            result.get("text", "").strip()
            for result in sorted_results[:5]
            if result.get("text", "").strip()
        ]

        return "\n\n".join(context_parts)
