import React, { useRef, useState } from 'react';
import axios from 'axios';

function ResumeUpload({ candidateId, onParsed }) {
  const fileInputRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    setError(null);
    const file = fileInputRef.current.files[0];
    if (!file) {
      setError("Please select a file.");
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PDF or Word document.");
      return;
    }

    const formData = new FormData();
    formData.append('resume_file', file);

    setIsLoading(true);
    try {
      const response = await axios.post(
        `/api/candidates/${candidateId}/upload-resume`,
        formData,
        { 
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload Progress: ${percentCompleted}%`);
          }
        }
      );
      
      if (response.data.ok) {
        if (onParsed) onParsed(response.data.parsed_info);
        // Clear the file input
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload/parse resume.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".pdf,.doc,.docx" 
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>
        
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}
        
        <button 
          type="submit" 
          disabled={isLoading}
          className={`px-4 py-2 rounded text-white ${
            isLoading 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isLoading ? 'Uploading...' : 'Upload & Parse Resume'}
        </button>
      </form>
    </div>
  );
}

export default ResumeUpload; 