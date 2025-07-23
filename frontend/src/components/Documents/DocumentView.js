import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  DocumentIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  UserIcon,
  CalendarIcon,
  TagIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const DocumentView = () => {
  const { documentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`/documents/${documentId}`);
      setDocument(response.data);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await axios.delete(`/documents/${documentId}`);
        navigate(-1);
      } catch (error) {
        console.error('Failed to delete document:', error);
        alert('Failed to delete document');
      }
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await axios.put(`/documents/${documentId}`, { status: newStatus });
      setDocument({ ...document, status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getDocumentTypeName = (type) => {
    const names = {
      outgoing_mail: 'Outgoing Mail',
      incoming_mail: 'Incoming Mail',
      om_approval: 'OM Approval',
      dri_deport: 'DRI Déport',
      general: 'General Document'
    };
    return names[type] || 'Document';
  };

  const canEdit = user?.role === 'admin' || user?.id === document?.created_by;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => navigate(-1)}
          className="text-purple-600 hover:text-purple-800"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Document not found</h3>
        <button
          onClick={() => navigate(-1)}
          className="text-purple-600 hover:text-purple-800"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
            <p className="text-gray-600">{getDocumentTypeName(document.document_type)}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(document.status)}`}>
            {document.status}
          </span>

          {canEdit && (
            <>
              <Link
                to={`/documents/${documentId}/edit`}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
              </Link>

              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Document Details */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          {/* Meta Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <DocumentIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium">{getDocumentTypeName(document.document_type)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <UserIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created By</p>
                <p className="text-sm font-medium">You</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm font-medium">
                  {new Date(document.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {document.due_date && (
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className="text-sm font-medium text-red-600">
                    {new Date(document.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {document.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{document.description}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <TagIcon className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* File Attachment */}
          {document.file_name && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Attached File</h3>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{document.file_name}</p>
                      <p className="text-sm text-gray-500">
                        {document.file_size && `${Math.round(document.file_size / 1024)} KB`}
                        {document.mime_type && ` • ${document.mime_type}`}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`${process.env.REACT_APP_BACKEND_URL}/uploads/${document.file_path?.split('/').pop()}`}
                    download={document.file_name}
                    className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Status Actions */}
          {user?.role === 'admin' && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Status Actions</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => updateStatus('pending')}
                  disabled={document.status === 'pending'}
                  className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Mark Pending
                </button>
                <button
                  onClick={() => updateStatus('approved')}
                  disabled={document.status === 'approved'}
                  className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus('rejected')}
                  disabled={document.status === 'rejected'}
                  className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => updateStatus('completed')}
                  disabled={document.status === 'completed'}
                  className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Complete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentView;