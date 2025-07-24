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
      // Regenerate printable document using the exact same template
      const printContent = `
        <!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ordre de Mission Interne</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
              }
              
              .a4 {
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                padding: 20px;
                box-sizing: border-box;
              }
              
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                border-bottom: 2px solid #000;
                padding-bottom: 15px;
              }
              
              .logo {
                width: 80px;
                height: 80px;
                object-fit: contain;
              }
              
              .header-text {
                flex: 1;
                text-align: left;
                margin-left: 20px;
              }
              
              .linelft {
                margin: 2px 0;
                font-weight: bold;
                font-size: 11px;
              }
              
              .direct-text {
                text-align: right;
              }
              
              .direct-text h3 {
                margin: 0;
                font-size: 14px;
              }
              
              .ftntbl {
                white-space: nowrap;
                vertical-align: middle;
                padding-right: 5px;
                font-weight: bold;
              }
              
              .blueTable {
                width: 100%;
                table-layout: fixed;
                border-collapse: collapse;
                margin: 20px 0;
              }
              
              .blueTable td {
                vertical-align: middle;
                padding: 8px 4px;
                border: 1px solid #000;
                font-size: 11px;
              }
              
              .blueTable td:first-child {
                width: 20%;
                background-color: #f0f0f0;
              }
              
              .blueTable td:nth-child(2) {
                width: 40%;
              }
              
              .blueTable td:nth-child(3) {
                width: 20%;
                background-color: #f0f0f0;
              }
              
              .blueTable td:nth-child(4) {
                width: 20%;
              }
              
              .action-row .action-label {
                vertical-align: top;
                padding-top: 4px;
              }
              
              .blueTable2 {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              
              .blueTable2 th,
              .blueTable2 td {
                border: 1px solid #000;
                padding: 20px 10px;
                text-align: center;
                font-weight: bold;
                font-size: 11px;
              }
              
              .blueTable2 thead th {
                background-color: #f0f0f0;
                padding: 10px;
              }
              
              .blueTable2 tbody th {
                height: 60px;
              }
              
              .PRF {
                margin-top: 30px;
                font-size: 10px;
              }
              
              .PRF u {
                font-weight: bold;
              }
              
              .PRF p {
                margin: 10px 0;
                text-align: justify;
              }
              
              @media print {
                body { margin: 0; }
                .a4 { margin: 0; padding: 15mm; }
              }
            </style>
          </head>
          <body>
            <div class="a4">
              <div class="header">
                <div style="width: 80px; height: 80px; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold;">LOGO</div>
                <div class="header-text">
                  <div class="linelft">Activité Exploration-Production</div>
                  <div class="linelft">Division Production</div>
                  <div class="linelft">Direction Regionale In Amenas</div>
                  <div class="linelft">Division .......ENP...</div>
                </div>
                <div class="direct-text">
                  <h3><strong>Monsieur le Directeur Régional</strong></h3>
                </div>
              </div>
              
              <br><br><br><br>
              
              <div>
                <h4><u>Objet:</u><span> Demande d'approbation de départ en mission</span></h4>
              </div>
              
              <div class="content">
                <table class="blueTable">
                  <tbody>
                    <tr>
                      <td class="ftntbl">Monsieur :</td>
                      <td>${document.metadata.fullName}</td>
                      <td class="ftntbl">Matricule :</td>
                      <td>${document.metadata.matricule}</td>
                    </tr>
                    <tr>
                      <td class="ftntbl">Fonction :</td>
                      <td>${document.metadata.jobTitle}</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                    <tr>
                      <td class="ftntbl">Structure :</td>
                      <td>${document.metadata.division}</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                    <tr>
                      <td class="ftntbl">Itinéraire :</td>
                      <td>${document.metadata.itineraire}</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                    <tr>
                      <td class="ftntbl">Mission :</td>
                      <td>du&nbsp;<span>${new Date(document.metadata.dateDepart).toLocaleDateString('fr-FR')}</span>&nbsp;au&nbsp;<span>${new Date(document.metadata.dateRetour).toLocaleDateString('fr-FR')}</span></td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                    <tr>
                      <td class="ftntbl">Transport :</td>
                      <td>${document.metadata.transport}</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                    <tr class="action-row">
                      <td class="ftntbl action-label">Action à réaliser :</td>
                      <td colspan="3">
                        ${(() => {
                          const text = document.metadata.objet;
                          const words = text.split(' ');
                          const firstLine = [];
                          const secondLine = [];
                          let charCount = 0;
                          
                          // Approximately determine first line (adjust number as needed)
                          words.forEach(word => {
                            if(charCount < 60) { // Approximate character limit for first line
                              firstLine.push(word);
                              charCount += word.length + 1;
                            } else {
                              secondLine.push(word);
                            }
                          });
                          
                          let result = firstLine.join(' ');
                          if(secondLine.length > 0) {
                            result += '<br>' + secondLine.join(' ');
                          }
                          return result;
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <br>
                
                <table class="blueTable2">
                  <thead>
                    <tr>
                      <th>Le Chef de Division EP</th>
                      <th>Avis de Monsieur Le Directeur Régional</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th><span></span></th>
                      <th><span></span></th>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <th><span class="ftntbl">Date :</span><span>${new Date().toLocaleDateString('fr-FR')}</span></th>
                      <th><span></span></th>
                    </tr>
                  </tfoot>
                </table>
                
                <br>
                
                <div class="PRF">
                  <span><u>NB</u></span>
                  <p>Toute demande doit être adressée à la Direction Régionale soixante-douze (72) heures à l'avance sauf cas express.</p>
                  <br><br>
                  <p>(*) Enumérer les actions à réaliser lors de la mission.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      // Use a more reliable approach for printing
      try {
        // Open a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (printWindow) {
          printWindow.document.write(printContent);
          printWindow.document.close();
          
          // Wait for content to load, then print
          printWindow.onload = function() {
            setTimeout(() => {
              printWindow.print();
              // Close window after printing
              setTimeout(() => {
                printWindow.close();
              }, 1000);
            };
          };
        } else {
          // Fallback: create a blob and download  
          const blob = new Blob([printContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const link = window.document.createElement('a');
          link.href = url;
          link.download = `Ordre_Mission_${document.metadata.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
          window.document.body.appendChild(link);
          link.click();
          window.document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Print error:', error);
        alert('Erreur lors de l\'impression. Veuillez réessayer.');
      }
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