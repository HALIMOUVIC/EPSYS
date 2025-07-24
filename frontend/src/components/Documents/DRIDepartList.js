import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import DRIDepartForm from './DRIDepartForm';
import DRIDepartViewModal from './DRIDepartViewModal';
import { PlusIcon, HashtagIcon, WrenchScrewdriverIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

const DRIDepartList = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const fetchDocuments = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(`/documents/dri-depart?page=${page}&limit=${pagination.limit}`);
      setDocuments(response.data.documents);
      setPagination({
        page: response.data.page,
        limit: response.data.limit,
        total: response.data.total,
        pages: response.data.pages
      });
    } catch (error) {
      console.error('Error fetching DRI depart documents:', error);
      setError('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (documentId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      try {
        await axios.delete(`/documents/${documentId}`);
        fetchDocuments(pagination.page);
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Erreur lors de la suppression du document');
      }
    }
  };

  const handleEdit = (document) => {
    setEditingDocument(document);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    fetchDocuments(pagination.page);
    setShowForm(false);
    setEditingDocument(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDocument(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
  };

  const getFileIcon = (extension) => {
    switch (extension) {
      case 'pdf':
        return 'fas fa-file-pdf text-red-500';
      case 'doc':
      case 'docx':
        return 'fas fa-file-word text-blue-500';
      case 'xls':
      case 'xlsx':
        return 'fas fa-file-excel text-green-500';
      default:
        return 'fas fa-file text-gray-500';
    }
  };

  const downloadFile = async (filePath, originalName) => {
    try {
      const response = await axios.get(`/documents/download/${encodeURIComponent(filePath)}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Erreur lors du téléchargement du fichier');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DRI Départ</h1>
          <p className="text-gray-600">Gestion des courriers DRI départ</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
        >
          <i className="fas fa-plus mr-2"></i>
          Nouveau Courrier
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-screen overflow-y-auto">
            <DRIDepartForm
              document={editingDocument}
              onClose={handleFormClose}
              onSuccess={handleFormSuccess}
            />
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 border-b border-indigo-800">
          <h3 className="text-xl font-bold text-white flex items-center">
            <i className="fas fa-file-alt mr-3 text-indigo-200"></i>
            Liste des Courriers DRI Départ
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-indigo-100/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Date Départ
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Expéditeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Réf. Expéditeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Date Courrier
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Destinataire
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Objet
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Fichiers
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-indigo-100">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-inbox text-4xl text-indigo-400"></i>
                      </div>
                      <p className="text-xl font-semibold text-gray-600">Aucun courrier trouvé</p>
                      <p className="text-gray-500 max-w-md text-center">
                        Vous n'avez pas encore de courriers DRI départ enregistrés. Commencez par en ajouter un nouveau.
                      </p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-2 px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Ajouter un courrier
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((document, index) => (
                  <tr key={document.id} className={`hover:bg-indigo-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-indigo-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-indigo-700 flex items-center">
                        <span className="bg-indigo-100 p-1.5 rounded-lg mr-2 flex items-center justify-center w-8 h-8">
                          <i className="fas fa-hashtag text-indigo-600"></i>
                        </span>
                        <span>{document.reference}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700 flex items-center">
                        <span className="bg-blue-100 p-1 rounded-md mr-2 text-blue-600">
                          <i className="far fa-calendar-alt"></i>
                        </span>
                        {formatDate(document.metadata.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {document.metadata.expediteur}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {document.metadata.expediteur_reference}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {formatDate(document.metadata.expediteur_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {document.metadata.destinataire}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {document.metadata.objet}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {document.metadata.files && document.metadata.files.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {document.metadata.files.map((file, fileIndex) => (
                            <button
                              key={fileIndex}
                              onClick={() => downloadFile(file.file_path, file.original_name)}
                              className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
                              title={`Télécharger ${file.original_name}`}
                            >
                              <i className={getFileIcon(file.original_name)}></i>
                              <span className="max-w-20 truncate">{file.original_name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Aucun fichier</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(document)}
                          className="text-indigo-600 hover:text-white bg-indigo-100 hover:bg-indigo-600 p-2 rounded-full transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md"
                          title="Modifier ce courrier"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(document.id)}
                          className="text-red-600 hover:text-white bg-red-100 hover:bg-red-600 p-2 rounded-full transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md"
                          title="Supprimer ce courrier"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 bg-indigo-50 border-t border-indigo-100">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full mb-4 md:mb-0 shadow-inner">
                <span className="font-medium">
                  Affichage de {((pagination.page - 1) * pagination.limit) + 1} à {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>
                <span className="text-indigo-500"> sur {pagination.total} entrées</span>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => fetchDocuments(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    pagination.page === 1
                      ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md transition-all duration-200 hover:scale-110'
                  }`}
                >
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>

                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => fetchDocuments(page)}
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      pagination.page === page
                        ? 'bg-indigo-600 text-white shadow-lg font-bold scale-110'
                        : 'bg-white text-indigo-700 hover:bg-indigo-100 shadow transition-all duration-200 hover:scale-110'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => fetchDocuments(Math.min(pagination.pages, pagination.page + 1))}
                  disabled={pagination.page === pagination.pages}
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    pagination.page === pagination.pages
                      ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md transition-all duration-200 hover:scale-110'
                  }`}
                >
                  <i className="fas fa-chevron-right text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DRIDepartList;