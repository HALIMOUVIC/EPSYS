import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FolderIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const FileManager = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchDocumentsWithFiles();
  }, []);

  const fetchDocumentsWithFiles = async () => {
    try {
      const response = await axios.get('/documents');
      // Filter only documents that have files attached and are from file manager
      const documentsWithFiles = response.data.filter(doc => 
        doc.file_name && (doc.metadata?.source === 'file_manager' || doc.document_type === 'general')
      );
      setDocuments(documentsWithFiles);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setUploadingFile(true);
    try {
      // Use file manager specific upload endpoint
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await axios.post('/file-manager/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Refresh the documents list
      fetchDocumentsWithFiles();
      
      // Show success message
      alert(`Successfully uploaded ${files.length} file(s) to File Manager`);
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert('Failed to upload files');
    } finally {
      setUploadingFile(false);
    }
  };

  const deleteDocument = async (documentId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await axios.delete(`/documents/${documentId}`);
        setDocuments(documents.filter(doc => doc.id !== documentId));
      } catch (error) {
        console.error('Failed to delete document:', error);
        alert('Failed to delete file');
      }
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconClass = "w-8 h-8";
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
      return <DocumentIcon className={`${iconClass} text-green-500`} />;
    } else if (['pdf'].includes(extension)) {
      return <DocumentIcon className={`${iconClass} text-red-500`} />;
    } else if (['doc', 'docx'].includes(extension)) {
      return <DocumentIcon className={`${iconClass} text-blue-500`} />;
    } else if (['xls', 'xlsx'].includes(extension)) {
      return <DocumentIcon className={`${iconClass} text-green-600`} />;
    } else {
      return <DocumentIcon className={`${iconClass} text-gray-500`} />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc =>
    doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FolderIcon className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">File Manager</h1>
            <p className="text-gray-600">Manage your files and documents</p>
          </div>
        </div>
        
        <label className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors">
          <CloudArrowUpIcon className="w-5 h-5 mr-2" />
          {uploadingFile ? 'Uploading...' : 'Upload File'}
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploadingFile}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
          />
        </label>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Files Grid */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search terms.' : 'Upload your first file to get started.'}
              </p>
              <label className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors">
                <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                Upload File
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocuments.map((document) => (
                <div key={document.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3 mb-3">
                    {getFileIcon(document.file_name)}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {document.file_name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {document.title}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{document.file_size ? formatFileSize(document.file_size) : 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span>{document.mime_type || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uploaded:</span>
                      <span>{new Date(document.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-gray-100">
                    <a
                      href={`/documents/${document.id}`}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      View
                    </a>
                    
                    <a
                      href={`${process.env.REACT_APP_BACKEND_URL}/uploads/${document.file_path?.split('/').pop()}`}
                      download={document.file_name}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                      Download
                    </a>
                    
                    <button
                      onClick={() => deleteDocument(document.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileManager;