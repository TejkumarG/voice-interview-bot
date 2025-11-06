"""Document router - HTTP layer."""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query, Form
from models.schemas import UploadResponse, DocumentListResponse, DeleteResponse
from services.document_service import DocumentService
from dependencies import get_document_service

router = APIRouter(prefix="/api", tags=["document"])


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    is_interview: bool = Form(False),
    service: DocumentService = Depends(get_document_service)
):
    """Upload document endpoint."""
    try:
        # Validate file type
        if not file.filename.endswith('.txt'):
            raise HTTPException(status_code=400, detail="Only .txt files supported")

        # Read file
        content = await file.read()
        text = content.decode('utf-8')

        # Extract filename without extension
        filename = file.filename.rsplit('.', 1)[0] if '.' in file.filename else file.filename

        # Call service
        result = service.process_upload(text, filename, is_interview)

        # Return response
        return UploadResponse(
            message=result["message"],
            document_id=result["document_id"],
            title=result["title"],
            chunks_created=result["chunks_created"],
            status="success"
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    service: DocumentService = Depends(get_document_service)
):
    """List documents with pagination."""
    try:
        result = service.list_documents(page, limit)
        return DocumentListResponse(
            documents=result["documents"],
            total=result["total"],
            page=result["page"],
            limit=result["limit"],
            has_more=result["has_more"],
            status="success"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
async def delete_document(
    document_id: str,
    service: DocumentService = Depends(get_document_service)
):
    """Delete a specific document."""
    try:
        result = service.delete_document(document_id)
        return DeleteResponse(
            message=result["message"],
            status="success"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.delete("/documents", response_model=DeleteResponse)
async def delete_all_documents(
    service: DocumentService = Depends(get_document_service)
):
    """Delete all documents from vector store."""
    try:
        result = service.delete_all_documents()
        return DeleteResponse(
            message=result["message"],
            status="success"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
