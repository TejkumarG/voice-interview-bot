'use client';

import { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api, UploadResponse } from '@/lib/api';

interface FileUploadProps {
  onUploadSuccess: (response: UploadResponse) => void;
  isInterviewMode?: boolean;
}

export default function FileUpload({ onUploadSuccess, isInterviewMode = false }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isInterview, setIsInterview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      setError('Only .txt files are supported');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.uploadDocument(file, isInterview);
      setSuccess(`Uploaded: ${response.title}${isInterview ? ' (Interview Doc)' : ''}`);
      onUploadSuccess(response);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsInterview(false);

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to upload document';
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <label
        htmlFor="file-upload"
        className={`
          flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed rounded-lg
          transition-all duration-200 cursor-pointer
          ${uploading
            ? 'border-gray-300 bg-gray-50 cursor-wait'
            : 'border-primary-300 bg-primary-50 hover:bg-primary-100 hover:border-primary-400'
          }
        `}
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
            <span className="text-sm font-medium text-primary-700">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-primary-600" />
            <span className="text-sm font-medium text-primary-700">
              Upload Document (.txt)
            </span>
          </>
        )}
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isInterview}
          onChange={(e) => setIsInterview(e.target.checked)}
          disabled={uploading}
          className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
        />
        <span className="text-sm text-gray-700">Mark as Interview Document</span>
      </label>

      <input
        ref={fileInputRef}
        id="file-upload"
        type="file"
        accept=".txt"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
    </div>
  );
}
