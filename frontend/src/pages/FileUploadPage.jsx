import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
// import { useAuth } from '../contexts/AuthContext'; // If needed for user info or token refresh checks

const FileUploadPage = () => {
  // const { tokens } = useAuth(); // Get tokens if AuthContext is fully integrated
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(''); // Example categories, could be fetched from backend
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState(''); // For success/error messages
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setMessage(`File "${acceptedFiles[0].name}" selected.`);
      setError('');
    } else {
      setSelectedFile(null);
      // Check if it was a rejection
      // For example, if you set file type restrictions in useDropzone
      // you can access fileRejections here.
      // For now, just clear selection if no valid file.
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    multiple: false, // Allow only single file upload
    // Example: accept specific image and video types
    // accept: {
    //   'image/jpeg': [],
    //   'image/png': [],
    //   'video/mp4': [],
    //   'application/pdf': []
    // }
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    setUploadProgress(0);

    const formData = new FormData();
    // The backend FileMetadataViewSet.perform_create expects 'file' in request.FILES
    // and 'description', 'category' in request.data (from FormData).
    formData.append('file', selectedFile);
    formData.append('description', description);
    formData.append('category', category);

    try {
      const authToken = localStorage.getItem('authToken'); // Or from useAuth().tokens.access
      if (!authToken) {
          setError("Authentication token not found. Please log in.");
          setLoading(false);
          return;
      }

      const response = await axios.post('/api/files/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      setMessage(`File "${selectedFile.name}" uploaded successfully! File ID: ${response.data.id}. You can view it in the Files list.`);
      setSelectedFile(null);
      setDescription('');
      setCategory('');
      setUploadProgress(0);
    } catch (err) {
      console.error("File upload error:", err);
      let errorMsg = "Upload failed: ";
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'object') {
            for (const key in err.response.data) {
                // Backend might return errors as { field: ["message"] }
                const messages = Array.isArray(err.response.data[key]) ? err.response.data[key].join(', ') : err.response.data[key];
                errorMsg += `${key}: ${messages} `;
            }
        } else if (err.response.data.detail) {
            errorMsg += err.response.data.detail;
        } else {
            errorMsg += "Please check your input or file format.";
        }
      } else if (err.request) {
        errorMsg = 'Upload failed. No response from server. Check network or server status.';
      } else {
        errorMsg = 'Upload failed. An unexpected error occurred.';
      }
      setError(errorMsg.trim());
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <li key={file.path} className="text-red-600 text-sm">
      {file.path} - {file.size} bytes:
      <ul>
        {errors.map(e => (
          <li key={e.code} className="ml-2">- {e.message}</li>
        ))}
      </ul>
    </li>
  ));

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-2xl">
      <h2 className="text-3xl font-bold text-church-dark-text mb-8 text-center">Upload New File</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">{error}</div>}
      {message && !error && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6" role="alert">{message}</div>}
      {fileRejectionItems.length > 0 && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <p className="font-semibold">Selected file(s) cannot be uploaded:</p>
            <ul>{fileRejectionItems}</ul>
        </div>
      )}


      <div
        {...getRootProps()}
        className={`p-8 border-4 border-dashed rounded-lg text-center cursor-pointer transition-colors
                   ${isDragActive ? 'border-church-primary bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-church-primary text-lg font-semibold">Drop the file here ...</p>
        ) : (
          <div>
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-gray-600 text-lg mt-2 mb-1">Drag 'n' drop a file here, or <span className="text-church-primary font-semibold">click to select</span></p>
            <p className="text-xs text-gray-500">(Single file upload. Max size depends on server config.)</p>
          </div>
        )}
      </div>

      {selectedFile && !fileRejections.length && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md border">
          <h4 className="font-semibold text-gray-700">Selected file:</h4>
          <p className="text-sm text-gray-600">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows="3"
            className="input-field w-full"
            placeholder="Brief description of the file"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
          {/* Using a select dropdown for predefined categories is often better for consistency */}
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field w-full"
          >
            <option value="">Select a category (optional)</option>
            <option value="Sermon Video">Sermon Video</option>
            <option value="Sermon Audio">Sermon Audio</option>
            <option value="Event Photo">Event Photo</option>
            <option value="Newsletter">Newsletter</option>
            <option value="Financial Report">Financial Report</option>
            <option value="Meeting Minutes">Meeting Minutes</option>
            <option value="Member Database">Member Database</option>
            <option value="General Document">General Document</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {loading && uploadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
            <div
              className="bg-church-primary h-4 rounded-full text-xs font-medium text-blue-100 text-center p-0.5 leading-none transition-width duration-150"
              style={{ width: `${uploadProgress}%` }}
            >
              {uploadProgress > 5 && `${uploadProgress}%`} {/* Show text only if progress bar is a bit filled */}
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || loading || fileRejections.length > 0}
          className="w-full group relative flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-church-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-church-primary disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading... {uploadProgress > 0 && `(${uploadProgress}%)`}
            </>
          ) : "Upload File"}
        </button>
      </div>
      <style jsx global>{`
        .input-field {
          @apply appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-church-primary focus:border-church-primary sm:text-sm;
        }
      `}</style>
    </div>
  );
};

export default FileUploadPage;
