import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import CourrierArriveeForm from './CourrierArriveeForm';
import CourrierArriveeViewModal from './CourrierArriveeViewModal';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  InboxIcon,
  ArrowDownTrayIcon,
  PaperClipIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';
import { ModernAlert } from '../Common/ModernAlert';

const CourrierArriveeList = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/documents`, {
        params: { document_type: 'incoming_mail' }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching courrier arrivee documents:', error);
      setError('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId) => {
    const confirmed = await ModernAlert.confirm(
      'Supprimer le document', 
      'Êtes-vous sûr de vouloir supprimer ce courrier arrivé ? Cette action est irréversible.'
    );
    
    if (confirmed) {
      try {
        await axios.delete(`/documents/${documentId}`);
        ModernAlert.success('Succès', 'Courrier supprimé avec succès');
        fetchDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
        ModernAlert.error('Erreur', 'Erreur lors de la suppression du courrier');
      }
    }
  };

  const handleFormSave = () => {
    fetchDocuments();
    setShowForm(false);
    setEditingDocument(null);
  };

  const handleEdit = (document) => {
    setEditingDocument(document);
    setShowForm(true);
  };

  const handleView = (document) => {
    setViewingDocument(document);
    setShowViewModal(true);
  };

  const handleViewClose = () => {
    setShowViewModal(false);
    setViewingDocument(null);
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
      console.log('Downloading file:', originalName);
      console.log('File path:', filePath);
      
      // Extract relative path from absolute path if needed
      let relativePath = filePath;
      if (filePath.includes('/uploads/')) {
        relativePath = filePath.split('/uploads/')[1];
      }
      
      console.log('Using relative path:', relativePath);
      
      const response = await axios.get(`/documents/download/${encodeURIComponent(relativePath)}`, {
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
      
      ModernAlert.success('Téléchargement', `Fichier "${originalName}" téléchargé avec succès`);
    } catch (error) {
      console.error('Error downloading file:', error);
      console.error('Error details:', error.response?.data || error.message);
      ModernAlert.error('Erreur', 'Erreur lors du téléchargement du fichier');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const searchLower = searchTerm.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(searchLower) ||
      doc.metadata?.expediteur?.toLowerCase().includes(searchLower) ||
      doc.metadata?.destinataire?.toLowerCase().includes(searchLower) ||
      doc.metadata?.objet?.toLowerCase().includes(searchLower) ||
      doc.metadata?.reference_expediteur?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courrier Arrivé</h1>
          <p className="text-gray-600">Gestion des courriers entrants</p>
        </div>
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
            <CourrierArriveeForm
              isEdit={!!editingDocument}
              documentId={editingDocument?.id}
              onClose={handleFormClose}
              onSave={handleFormSave}
            />
          </div>
        </div>
      )}

      {/* View Modal */}
      <CourrierArriveeViewModal
        document={viewingDocument}
        isOpen={showViewModal}
        onClose={handleViewClose}
      />

      {/* Search */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par expéditeur, destinataire, objet, référence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-green-600 to-emerald-600 border-b border-green-800">
          <h3 className="text-xl font-bold text-white flex items-center">
            <i className="fas fa-inbox mr-3 text-green-200"></i>
            Liste des Courriers Arrivés
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-green-100/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 uppercase tracking-wider">
                  Date Réception
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 uppercase tracking-wider">
                  Expéditeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 uppercase tracking-wider">
                  Réf. Expéditeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 uppercase tracking-wider">
                  Date Courrier
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 uppercase tracking-wider">
                  Destinataire
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 uppercase tracking-wider">
                  Objet
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-green-700 uppercase tracking-wider">
                  Fichiers
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-green-100">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-inbox text-4xl text-green-400"></i>
                      </div>
                      <p className="text-xl font-semibold text-gray-600">
                        {searchTerm ? 'Aucun résultat trouvé' : 'Aucun courrier arrivé'}
                      </p>
                      <p className="text-gray-500 max-w-md text-center">
                        {searchTerm ? 'Essayez avec des termes de recherche différents.' : 'Vous n\'avez pas encore de courriers arrivés enregistrés. Commencez par en ajouter un nouveau.'}
                      </p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="mt-2 px-6 py-3 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Ajouter un courrier
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc, index) => (
                  <tr key={doc.id} className={`hover:bg-green-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-green-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-700 flex items-center">
                        <HashtagIcon className="w-4 h-4 text-green-600 mr-2" />
                        <span>{doc.reference || `ARR-${new Date(doc.created_at).getFullYear()}-${String(doc.id).padStart(3, '0')}`}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700 flex items-center">
                        <span className="bg-blue-100 p-1 rounded-md mr-2 text-blue-600">
                          <i className="far fa-calendar-alt"></i>
                        </span>
                        {doc.metadata?.date_reception ? formatDate(doc.metadata.date_reception) : formatDate(doc.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {doc.metadata?.expediteur || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {doc.metadata?.reference_expediteur || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        {doc.metadata?.date_courrier ? formatDate(doc.metadata.date_courrier) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {doc.metadata?.destinataire || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {doc.metadata?.objet || doc.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {doc.metadata?.files && doc.metadata.files.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {doc.metadata.files.map((file, fileIndex) => (
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
                      ) : doc.file_name ? (
                        <button
                          onClick={() => downloadFile(doc.file_path, doc.file_name)}
                          className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
                          title={`Télécharger ${doc.file_name}`}
                        >
                          <i className={getFileIcon(doc.file_name)}></i>
                          <span className="max-w-20 truncate">{doc.file_name}</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">Aucun fichier</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleView(doc)}
                          className="text-blue-600 hover:text-white bg-blue-100 hover:bg-blue-600 p-2 rounded-full transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md"
                          title="Voir les détails"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(doc)}
                          className="text-green-600 hover:text-white bg-green-100 hover:bg-green-600 p-2 rounded-full transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md"
                          title="Modifier ce courrier"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:text-white bg-red-100 hover:bg-red-600 p-2 rounded-full transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md"
                          title="Supprimer ce courrier"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center z-40 group"
        title="Nouveau Courrier Arrivé"
      >
        <PlusIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </div>
  );
};

export default CourrierArriveeList;