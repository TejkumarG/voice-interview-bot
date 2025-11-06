"""
Dependency injection configuration.

Purpose:
    Wire up all layers with proper DI.
    Uses @lru_cache for singleton instances.

Architecture:
    Router → Service → Handler → Repository
                         ↓
                       Utils

Author: Teja
"""

from functools import lru_cache
from config import get_settings

# Utils
from utils.chunking_service import ChunkingService
from utils.embedding_service import EmbeddingService
from utils.llm_service import LLMService

# Repository
from repositories.vector_repository import VectorRepository

# Handlers
from handlers.document_handler import DocumentHandler
from handlers.chat_handler import ChatHandler

# Services
from services.document_service import DocumentService
from services.chat_service import ChatService


# ==================== UTILS ====================

@lru_cache
def get_chunking_service() -> ChunkingService:
    """Get chunking utility (singleton)."""
    settings = get_settings()
    return ChunkingService(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap
    )


@lru_cache
def get_embedding_service() -> EmbeddingService:
    """Get embedding utility (singleton)."""
    settings = get_settings()
    return EmbeddingService(
        api_key=settings.openai_api_key,
        model=settings.embedding_model
    )


@lru_cache
def get_llm_service() -> LLMService:
    """Get LLM utility (singleton)."""
    settings = get_settings()
    return LLMService(
        api_key=settings.openai_api_key,
        model=settings.llm_model,
        max_tokens=settings.max_tokens,
        temperature=settings.temperature
    )


# ==================== REPOSITORY ====================

@lru_cache
def get_vector_repository() -> VectorRepository:
    """Get vector repository (singleton)."""
    settings = get_settings()
    embedding_service = get_embedding_service()
    return VectorRepository(
        api_key=settings.pinecone_api_key,
        index_name=settings.pinecone_index_name,
        dimension=embedding_service.get_embedding_dimension()
    )


# ==================== HANDLERS ====================

@lru_cache
def get_document_handler() -> DocumentHandler:
    """Get document handler (singleton)."""
    return DocumentHandler(
        chunking_service=get_chunking_service(),
        embedding_service=get_embedding_service(),
        vector_repository=get_vector_repository()
    )


@lru_cache
def get_chat_handler() -> ChatHandler:
    """Get chat handler (singleton)."""
    return ChatHandler(
        embedding_service=get_embedding_service(),
        llm_service=get_llm_service(),
        vector_repository=get_vector_repository()
    )


# ==================== SERVICES ====================

@lru_cache
def get_document_service() -> DocumentService:
    """Get document service (singleton)."""
    return DocumentService(
        document_handler=get_document_handler()
    )


@lru_cache
def get_chat_service() -> ChatService:
    """Get chat service (singleton)."""
    return ChatService(
        chat_handler=get_chat_handler()
    )
