import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Document {
  document_id: string;
  title: string;
  total_chunks: number;
  created_at: string | null;
  is_interview: boolean;
}

export interface ChatMessage {
  message: string;
  document_id?: string;
  interview_mode?: boolean;
}

export interface SourceInfo {
  document_id: string;
  title: string;
  chunk_number: number;
  text: string;
}

export interface ChatResponse {
  response: string;
  status: string;
  sources_used: boolean;
  sources: SourceInfo[];
}

export interface UploadResponse {
  message: string;
  document_id: string;
  title: string;
  chunks_created: number;
  status: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  status: string;
}

export interface DeleteResponse {
  message: string;
  status: string;
}

export const api = {
  uploadDocument: async (file: File, isInterview: boolean = false): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_interview', isInterview.toString());

    const response = await axios.post(`${API_URL}/api/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  chat: async (message: string, documentId?: string, interviewMode?: boolean): Promise<ChatResponse> => {
    const response = await axios.post(`${API_URL}/api/chat`, {
      message,
      document_id: documentId,
      interview_mode: interviewMode,
    });
    return response.data;
  },

  listDocuments: async (page = 1, limit = 10): Promise<DocumentListResponse> => {
    const response = await axios.get(`${API_URL}/api/documents`, {
      params: { page, limit },
    });
    return response.data;
  },

  deleteDocument: async (documentId: string): Promise<DeleteResponse> => {
    const response = await axios.delete(`${API_URL}/api/documents/${documentId}`);
    return response.data;
  },

  deleteAllDocuments: async (): Promise<DeleteResponse> => {
    const response = await axios.delete(`${API_URL}/api/documents`);
    return response.data;
  },
};
