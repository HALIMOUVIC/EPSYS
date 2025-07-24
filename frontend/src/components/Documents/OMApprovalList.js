import React, { useState, useEffect } from 'react';
import axios from 'axios';
import OMApprovalForm from './OMApprovalForm';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentCheckIcon,
  PrinterIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const OMApprovalList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/documents', {
        params: { document_type: 'om_approval' }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet ordre de mission ?')) {
      try {
        await axios.delete(`/documents/${documentId}`);
        setDocuments(documents.filter(doc => doc.id !== documentId));
        alert('Ordre de mission supprimé avec succès');
      } catch (error) {
        console.error('Failed to delete document:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingDocument(null);
    fetchDocuments();
  };

  const handleEdit = (document) => {
    setEditingDocument(document);
    setShowForm(true);
  };

  const handleReprint = (document) => {
    if (document.metadata) {
      // Regenerate printable document
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ordre de Mission</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .content { margin: 20px 0; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; }
              .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
              .signature-box { width: 200px; text-align: center; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              td { padding: 10px; border: 1px solid #ccc; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>ORDRE DE MISSION</h2>
              <p>Date: ${new Date(document.metadata.date).toLocaleDateString('fr-FR')}</p>
            </div>
            
            <table>
              <tr>
                <td class="label">Monsieur:</td>
                <td>${document.metadata.fullName}</td>
                <td class="label">Matricule:</td>
                <td>${document.metadata.matricule}</td>
              </tr>
              <tr>
                <td class="label">Fonction:</td>
                <td>${document.metadata.jobTitle}</td>
                <td class="label">Structure:</td>
                <td>${document.metadata.division}</td>
              </tr>
              <tr>
                <td class="label">Itinéraire:</td>
                <td colspan="3">${document.metadata.itineraire}</td>
              </tr>
              <tr>
                <td class="label">Date de Départ:</td>
                <td>${new Date(document.metadata.dateDepart).toLocaleDateString('fr-FR')}</td>
                <td class="label">Date de Retour:</td>
                <td>${new Date(document.metadata.dateRetour).toLocaleDateString('fr-FR')}</td>
              </tr>
              <tr>
                <td class="label">Transport:</td>
                <td colspan="3">${document.metadata.transport}</td>
              </tr>
              <tr>
                <td class="label">Action à réaliser:</td>
                <td colspan="3">${document.metadata.objet}</td>
              </tr>
            </table>
            
            <div class="signature-section">
              <div class="signature-box">
                <p>Le Demandeur</p>
                <br><br><br>
                <p>_________________</p>
              </div>
              <div class="signature-box">
                <p>Le Responsable</p>
                <br><br><br>
                <p>_________________</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Create and print iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(printContent);
      doc.close();

      iframe.onload = function() {
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const filteredDocuments = documents.filter(doc => {
    const searchLower = searchTerm.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(searchLower) ||
      doc.metadata?.fullName?.toLowerCase().includes(searchLower) ||
      doc.metadata?.matricule?.toLowerCase().includes(searchLower) ||
      doc.metadata?.itineraire?.toLowerCase().includes(searchLower) ||
      doc.metadata?.objet?.toLowerCase().includes(searchLower)
    );
  });

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
          <DocumentCheckIcon className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Approbation Ordre de Mission</h1>
            <p className="text-gray-600">Gestion des ordres de mission</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Nouvel Ordre de Mission
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-screen overflow-y-auto">
            <OMApprovalForm
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
            placeholder="Rechercher par nom, matricule, itinéraire, action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Liste des Ordres de Mission</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Demandeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matricule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Itinéraire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Départ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Retour
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
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
                    {doc.reference || `OM-${new Date(doc.created_at).getFullYear()}-${String(doc.id).padStart(3, '0')}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.metadata?.fullName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {doc.metadata?.matricule || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {doc.metadata?.itineraire || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.metadata?.dateDepart ? formatDate(doc.metadata.dateDepart) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.metadata?.dateRetour ? formatDate(doc.metadata.dateRetour) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                      doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {doc.status === 'approved' ? 'Approuvé' :
                       doc.status === 'pending' ? 'En attente' :
                       doc.status === 'rejected' ? 'Rejeté' :
                       'Brouillon'}
                    </span>
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
                        className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                        title="Modifier"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReprint(doc)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Imprimer"
                      >
                        <PrinterIcon className="w-4 h-4" />
                      </button>
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
            <DocumentCheckIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun ordre de mission</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Aucun résultat pour votre recherche.' : 'Commencez par créer votre premier ordre de mission.'}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Nouvel Ordre de Mission
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OMApprovalList;