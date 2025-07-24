import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CourrierDepartForm from './CourrierDepartForm';
import CourrierDepartViewModal from './CourrierDepartViewModal';
import { PlusIcon, HashtagIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <PaperAirplaneIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion du Courrier Départ</h1>
            <p className="text-gray-600">Gestion des courriers sortants</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Nouveau Courrier
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-screen overflow-y-auto">
            <CourrierDepartForm
              isEdit={!!editingDocument}
              documentId={editingDocument?.id}
              onClose={() => {
                setShowForm(false);
                setEditingDocument(null);
              }}
              onSave={handleFormSave}
            />
          </div>
        </div>
      )}

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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Liste des Courriers Départ</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Départ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expéditeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destinataire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Objet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fichiers
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {doc.reference || `DEP-${new Date(doc.created_at).getFullYear()}-${String(doc.id).padStart(3, '0')}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.metadata?.date_depart ? formatDate(doc.metadata.date_depart) : formatDate(doc.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.metadata?.expediteur || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.metadata?.destinataire || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {doc.metadata?.objet || doc.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {doc.file_name ? (
                      <div className="flex items-center space-x-2">
                        <PaperClipIcon className="w-4 h-4 text-gray-400" />
                        <a
                          href={`${process.env.REACT_APP_BACKEND_URL}/uploads/${doc.file_path?.split('/').pop()}`}
                          download={doc.file_name}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {doc.file_name}
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Aucun fichier</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => window.open(`/documents/${doc.id}`, '_blank')}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                        title="Voir"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(doc)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Modifier"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      {doc.file_name && (
                        <a
                          href={`${process.env.REACT_APP_BACKEND_URL}/uploads/${doc.file_path?.split('/').pop()}`}
                          download={doc.file_name}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Télécharger"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Supprimer"
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

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <PaperAirplaneIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun courrier départ</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Aucun résultat pour votre recherche.' : 'Commencez par créer votre premier courrier départ.'}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Nouveau Courrier
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourrierDepartList;