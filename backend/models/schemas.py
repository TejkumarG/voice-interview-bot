"""
Pydantic data models for request/response validation.

Purpose:
    Define the structure of API requests and responses.
    Ensures type safety and automatic validation.

Author: Teja
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class UploadRequest(BaseModel):
    """
    Request model for upload metadata.

    Attributes:
        is_interview: Flag to mark this as the interview document
    """
    is_interview: Optional[bool] = Field(False, description="Mark as interview document")


class ChatRequest(BaseModel):
    """
    Request model for chat endpoint.

    Purpose:
        Validate incoming chat messages from frontend.

    Attributes:
        message: User's question or message
        document_id: Optional document hash (searches all if not provided)
        interview_mode: If True, searches only documents with is_interview=True
    """

    message: str = Field(..., min_length=1, max_length=1000, description="User's question")
    document_id: Optional[str] = Field(None, min_length=1, description="Document hash (optional - searches all if omitted)")
    interview_mode: Optional[bool] = Field(False, description="Search only interview documents")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "What is your superpower?",
                "document_id": "64ec88ca00b268e5"
            }
        }


class SourceInfo(BaseModel):
    """
    Source document information.

    Attributes:
        document_id: Document hash
        title: Document title
        chunk_number: Chunk number used
        text: Actual chunk text content
    """
    document_id: str = Field(..., description="Document hash")
    title: str = Field(..., description="Document title")
    chunk_number: int = Field(..., description="Chunk number")
    text: str = Field(..., description="Chunk text content")


class ChatResponse(BaseModel):
    """
    Response model for chat endpoint.

    Purpose:
        Structure the chat API response.

    Attributes:
        response: AI-generated answer
        status: Success/error status
        sources_used: Whether document context was used
        sources: List of source documents used
    """

    response: str = Field(..., description="AI-generated response")
    status: str = Field(default="success", description="Response status")
    sources_used: bool = Field(default=False, description="Whether document context was found")
    sources: List[SourceInfo] = Field(default_factory=list, description="Source documents used")

    class Config:
        json_schema_extra = {
            "example": {
                "response": "My superpower is problem-solving under pressure...",
                "status": "success",
                "sources_used": True,
                "sources": [
                    {
                        "document_id": "64ec88ca00b268e5",
                        "title": "Interview Prep",
                        "chunk_number": 3
                    }
                ]
            }
        }


class UploadResponse(BaseModel):
    """
    Response model for document upload endpoint.

    Purpose:
        Confirm successful document processing.

    Attributes:
        message: Success message
        document_id: Document hash identifier
        title: Document title (extracted from content)
        chunks_created: Number of text chunks created
        status: Success/error status
    """

    message: str = Field(..., description="Status message")
    document_id: str = Field(..., description="Document hash identifier")
    title: str = Field(..., description="Document title")
    chunks_created: int = Field(..., description="Number of chunks created from document")
    status: str = Field(default="success", description="Response status")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Document uploaded and processed successfully",
                "document_id": "64ec88ca00b268e5",
                "title": "Interview Preparation Notes",
                "chunks_created": 15,
                "status": "success"
            }
        }


class DeleteResponse(BaseModel):
    """
    Response model for document deletion endpoint.

    Purpose:
        Confirm successful document deletion.

    Attributes:
        message: Confirmation message
        status: Success/error status
    """

    message: str = Field(..., description="Confirmation message")
    status: str = Field(default="success", description="Response status")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Document deleted successfully",
                "status": "success"
            }
        }


class ErrorResponse(BaseModel):
    """
    Response model for error responses.

    Purpose:
        Standardize error messages across the API.

    Attributes:
        error: Error message
        detail: Additional error details (optional)
        status: Always "error"
    """

    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Additional error details")
    status: str = Field(default="error", description="Response status")

    class Config:
        json_schema_extra = {
            "example": {
                "error": "Document not found",
                "detail": "No document uploaded for this session",
                "status": "error"
            }
        }


class HealthResponse(BaseModel):
    """
    Response model for health check endpoint.

    Purpose:
        Confirm server is running and healthy.

    Attributes:
        status: Health status
        message: Health message
    """

    status: str = Field(default="healthy", description="Health status")
    message: str = Field(default="Server is running", description="Health message")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "message": "Server is running"
            }
        }


class DocumentChunk(BaseModel):
    """
    Internal model representing a document chunk.

    Purpose:
        Structure for storing document chunks with metadata.

    Attributes:
        id: Unique chunk identifier
        text: Chunk text content
        embedding: Vector embedding of the chunk
        metadata: Additional metadata (chunk number, source, etc.)
    """

    id: str = Field(..., description="Unique chunk identifier")
    text: str = Field(..., description="Chunk text content")
    embedding: Optional[List[float]] = Field(None, description="Vector embedding")
    metadata: dict = Field(default_factory=dict, description="Additional metadata")


class DocumentInfo(BaseModel):
    """
    Document information model.

    Purpose:
        Represent a single document in list responses.

    Attributes:
        document_id: Unique document hash
        title: Document title
        total_chunks: Number of chunks
        created_at: Upload timestamp (if available)
        is_interview: Whether this is the interview document
    """

    document_id: str = Field(..., description="Document hash identifier")
    title: str = Field(..., description="Document title")
    total_chunks: int = Field(..., description="Number of chunks")
    created_at: Optional[str] = Field(None, description="Upload timestamp")
    is_interview: bool = Field(False, description="Interview document flag")

    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "64ec88ca00b268e5",
                "title": "Interview Preparation Notes",
                "total_chunks": 15,
                "created_at": "2024-11-07T02:00:00Z",
                "is_interview": True
            }
        }


class DocumentListResponse(BaseModel):
    """
    Response model for document list endpoint.

    Purpose:
        Return paginated list of documents.

    Attributes:
        documents: List of documents
        total: Total number of documents
        page: Current page number
        limit: Items per page
        has_more: Whether more pages exist
        status: Response status
    """

    documents: List[DocumentInfo] = Field(..., description="List of documents")
    total: int = Field(..., description="Total number of documents")
    page: int = Field(..., description="Current page number")
    limit: int = Field(..., description="Items per page")
    has_more: bool = Field(..., description="Whether more pages exist")
    status: str = Field(default="success", description="Response status")

    class Config:
        json_schema_extra = {
            "example": {
                "documents": [
                    {
                        "document_id": "64ec88ca00b268e5",
                        "title": "Interview Prep Notes",
                        "total_chunks": 15,
                        "created_at": "2024-11-07T02:00:00Z"
                    }
                ],
                "total": 1,
                "page": 1,
                "limit": 10,
                "has_more": False,
                "status": "success"
            }
        }
