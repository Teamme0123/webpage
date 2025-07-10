import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext'; // For auth token and user info
import { FaDownload, FaTrash, FaSearch, FaFilePdf, FaFileVideo, FaFileAudio, FaFileImage, FaFileAlt, FaFileWord, FaFileExcel, FaFilePowerpoint } from 'react-icons/fa'; // Example icons

const FileIcon = ({ mimeType }) => {
  if (!mimeType) return <FaFileAlt className="text-gray-500" />;
  if (mimeType.startsWith('image/')) return <FaFileImage className="text-blue-500" />;
  if (mimeType.startsWith('video/')) return <FaFileVideo className="text-red-500" />;
  if (mimeType.startsWith('audio/')) return <FaFileAudio className="text-purple-500" />;
  if (mimeType === 'application/pdf') return <FaFilePdf className="text-red-700" />;
  if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword') return <FaFileWord className="text-blue-700" />; // .docx, .doc
  if (mimeType.includes('spreadsheetml') || mimeType === 'application/vnd.ms-excel') return <FaFileExcel className="text-green-700" />; // .xlsx, .xls
  if (mimeType.includes('presentationml') || mimeType === 'application/vnd.ms-powerpoint') return <FaFilePowerpoint className="text-orange-500" />; // .pptx, .ppt
  return <FaFileAlt className="text-gray-500" />;
};


const FileListPage = () => {
  // const { user, tokens, loadingAuth } = useAuth(); // Use from context
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true); // For file fetching specifically
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Simulate AuthContext for now (remove when AuthContext is fully integrated and used)
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    const storedToken = localStorage.getItem('authToken');
    if (storedUser) setAuthUser(JSON.parse(storedUser));
    if (storedToken) setAuthToken(storedToken);
    setAuthLoading(false); // Finished attempting to load auth info
  }, []);


  const fetchFiles = useCallback(async () => {
    if (authLoading || !authToken) { // Don't fetch if auth is still loading or no token
      if (!authLoading && !authToken) setError("Authentication required. Please log in.");
      setLoading(false); // Not loading files if auth isn't ready
      return;
    }

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      // TODO: Add pagination params like params.append('page', currentPage);

      const response = await axios.get(`/api/files/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      // Assuming backend uses DRF's default pagination or returns an array directly
      // If paginated, response.data will be like { count, next, previous, results }
      setFiles(response.data.results || response.data);
    } catch (err) {
      console.error("Error fetching files:", err);
      if (err.response?.status === 401) {
        setError('Your session may have expired. Please log in again.');
      } else {
        setError('Failed to load files. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [authToken, searchTerm, categoryFilter, authLoading]); // Add authLoading dependency

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]); // fetchFiles is memoized and includes its own dependencies


  const handleDelete = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete the file "${fileName}"? This action cannot be undone.`)) {
      return;
    }
    if (!authToken) { setError("Authentication required."); return; }
    try {
      await axios.delete(`/api/files/${fileId}/`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setFiles(files.filter(file => file.id !== fileId));
      alert(`File "${fileName}" deleted successfully.`);
    } catch (err) {
      console.error("Error deleting file:", err);
      const errorDetail = err.response?.data?.detail || `Failed to delete file "${fileName}". You may not have permission or the file is already deleted.`;
      setError(errorDetail);
    }
  };

  const handleDownload = async (fileId, originalFilename) => {
    if (!authToken) { setError("Authentication required."); return; }
    try {
        const response = await axios.get(`/api/files/${fileId}/download/`, {
            headers: { Authorization: `Bearer ${authToken}` },
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', originalFilename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Error downloading file:", err);
        let errorMsg = `Failed to download file "${originalFilename}".`;
        if (err.response && err.response.data) {
            try {
                const errorBlobText = await err.response.data.text(); // Try to read blob as text
                const errorJson = JSON.parse(errorBlobText);
                if (errorJson.detail || errorJson.error) {
                    errorMsg = errorJson.detail || errorJson.error;
                }
            } catch (e) { /* Not a JSON error response, or failed to parse blob */ }
        }
        setError(errorMsg);
    }
  };

  const categories = ["Sermon Video", "Sermon Audio", "Event Photo", "Newsletter", "Financial Report", "Meeting Minutes", "Member Database", "General Document", "Other"];

  // Show auth loading state or login prompt if not authenticated
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-300px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-church-primary"></div>
        <p className="ml-4 text-lg text-gray-600">Authenticating...</p>
      </div>
    );
  }
  if (!authToken && !authLoading) { // Check after authLoading is false
    return (
      <div className="text-center py-10 bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
        <h2 className="text-2xl font-semibold text-red-600 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-6">You need to be logged in to view this page.</p>
        <Link to="/login" className="bg-church-primary text-white px-6 py-2 rounded-md hover:bg-opacity-90 transition-colors">
          Go to Login
        </Link>
      </div>
    );
  }

  // Main content rendering after auth check
  if (loading) { // This is for file fetching loading state
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-300px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-church-primary"></div>
        <p className="ml-4 text-lg text-gray-600">Loading Files...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-church-dark-text">Church Files</h1>
        <Link
            to="/upload"
            className="mt-4 sm:mt-0 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
            Upload New File
        </Link>
      </div>

      {error && ( // Display error related to file fetching or operations
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
        </div>
      )}

      <div className="mb-8 p-6 bg-gray-50 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Files</label>
            <div className="relative">
              <input type="text" id="search" className="input-field w-full pl-10" placeholder="Name, description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
            <select id="categoryFilter" className="input-field w-full" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          {/* Apply filters button removed in favor of useEffect re-fetching on change */}
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-10 bg-white p-8 rounded-lg shadow-md">
          <FaFileAlt className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-500">No files found matching your criteria.</p>
          {(!searchTerm && !categoryFilter) && <p className="text-gray-400 mt-2">Why not <Link to="/upload" className="text-church-primary hover:underline">upload the first file</Link>?</p>}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow-xl rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name & Description</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Category</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Uploaded By</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Size</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-4 py-4 whitespace-nowrap text-2xl"><FileIcon mimeType={file.mime_type} /></td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-xs" title={file.original_filename}>{file.original_filename}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs" title={file.description || ''}>{file.description || <span className="italic">No description</span>}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{file.category || <span className="italic">N/A</span>}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">{file.uploaded_by_details?.username || 'Unknown'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                    {new Date(file.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(file.size_bytes / (1024 * 1024)).toFixed(2)} MB
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleDownload(file.id, file.original_filename)} title="Download" className="text-green-600 hover:text-green-800 transition-colors p-1 mr-2"><FaDownload size={18}/></button>
                    {(authUser?.id === file.uploaded_by || authUser?.is_staff) && (
                      <button onClick={() => handleDelete(file.id, file.original_filename)} title="Delete" className="text-red-600 hover:text-red-800 transition-colors p-1"><FaTrash size={16}/></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* TODO: Add pagination controls here based on API response (count, next, previous) */}
      <style jsx global>{`
        .input-field {
          @apply appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-church-primary focus:border-church-primary sm:text-sm;
        }
      `}</style>
    </div>
  );
};

export default FileListPage;
