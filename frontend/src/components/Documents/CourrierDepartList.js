import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CourrierDepartForm from './CourrierDepartForm';
import CourrierDepartViewModal from './CourrierDepartViewModal';
import { PlusIcon, HashtagIcon, EyeIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, PaperAirplaneIcon, ArrowDownTrayIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { ModernAlert } from '../Common/ModernAlert';

const CourrierDepartList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const response = await axios.get('/documents', {
        params: { document_type: 'outgoing_mail' }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId) => {
    const confirmed = await ModernAlert.confirm(
      'Supprimer le document', 
      'Êtes-vous sûr de vouloir supprimer ce courrier ? Cette action est irréversible.'
    );
    
    if (confirmed) {
      try {
        await axios.delete(`/documents/${documentId}`);
        setDocuments(documents.filter(doc => doc.id !== documentId));
        ModernAlert.success('Succès', 'Courrier supprimé avec succès');
      } catch (error) {
        console.error('Failed to delete document:', error);
        ModernAlert.error('Erreur', 'Erreur lors de la suppression');
      }
    }
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

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDocument(null);
    fetchDocuments();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const filteredDocuments = documents.filter(doc => {
    const searchLower = searchTerm.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(searchLower) ||
      doc.metadata?.expediteur?.toLowerCase().includes(searchLower) ||
      doc.metadata?.destinataire?.toLowerCase().includes(searchLower) ||
      doc.metadata?.objet?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courrier Départ</h1>
          <p className="text-gray-600">Gestion des courriers sortants</p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-screen overflow-y-auto">
            <CourrierDepartForm
              document={editingDocument}
              onClose={handleFormClose}
              onSave={handleFormSuccess}
            />
          </div>
        </div>
      )}

      {/* View Modal */}
      <CourrierDepartViewModal
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
            placeholder="Rechercher par expéditeur, destinataire, objet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-100/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Date Départ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Expéditeur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Destinataire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Objet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Fichiers
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-blue-700 flex items-center">
                        <HashtagIcon className="w-4 h-4 text-blue-600 mr-2" />
                        <span>{document.reference}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(document.metadata?.date || document.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {document.metadata?.expediteur || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {document.metadata?.destinataire || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {document.metadata?.objet || document.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {document.metadata?.files && document.metadata.files.length > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {document.metadata.files.length} fichier{document.metadata.files.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Aucun fichier</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleView(document)}
                          className="text-blue-600 hover:text-white bg-blue-100 hover:bg-blue-600 p-2 rounded-full transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md"
                          title="Voir les détails"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(document)}
                          className="text-indigo-600 hover:text-white bg-indigo-100 hover:bg-indigo-600 p-2 rounded-full transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md"
                          title="Modifier ce courrier"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(document.id)}
                          className="text-red-600 hover:text-white bg-red-100 hover:bg-red-600 p-2 rounded-full transition-all duration-300 transform hover:scale-110 shadow-sm hover:shadow-md"
                          title="Supprimer ce courrier"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center z-40 group"
        title="Nouveau Courrier Départ"
      >
        <PlusIcon className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </div>
  );
};

export default CourrierDepartList;