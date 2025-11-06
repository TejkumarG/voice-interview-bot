'use client';

import { useState, useEffect } from 'react';
import { FileText, Layers, Loader2 } from 'lucide-react';
import { api, Document } from '@/lib/api';

interface DocumentListProps {
  selectedDocId: string | null;
  onSelectDoc: (docId: string | null) => void;
  refreshTrigger?: number;
}

export default function DocumentList({ selectedDocId, onSelectDoc, refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.listDocuments();
      setDocuments(response.documents);
    } catch (err: any) {
      setError('Failed to load documents');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => onSelectDoc(null)}
        className={`
          w-full p-4 rounded-lg border-2 transition-all text-left
          ${selectedDocId === null
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <Layers className={`w-5 h-5 ${selectedDocId === null ? 'text-primary-600' : 'text-gray-400'}`} />
          <div className="flex-1">
            <p className={`font-medium ${selectedDocId === null ? 'text-primary-900' : 'text-gray-700'}`}>
              All Documents
            </p>
            <p className="text-sm text-gray-500">
              Search across {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </button>

      {documents.map((doc) => (
        <button
          key={doc.document_id}
          onClick={() => onSelectDoc(doc.document_id)}
          className={`
            w-full p-4 rounded-lg border-2 transition-all text-left
            ${selectedDocId === doc.document_id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50'
            }
          `}
        >
          <div className="flex items-start gap-3">
            <FileText
              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                selectedDocId === doc.document_id ? 'text-primary-600' : 'text-gray-400'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium truncate ${
                  selectedDocId === doc.document_id ? 'text-primary-900' : 'text-gray-700'
                }`}
              >
                {doc.title}
              </p>
              <p className="text-sm text-gray-500">
                {doc.total_chunks} chunk{doc.total_chunks !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
