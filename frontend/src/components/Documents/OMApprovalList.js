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
      // Regenerate printable document using the exact A4 template
      const printContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ordre de Mission Interne</title>
            <style>
                /************************************************/
                body{
                    padding: 0;
                    margin: 0;
                    font-family:Arial,sans-serif;
                    background-color:#f5f5f5;
                }
                /************************************************/
                .a4{
                    width: 210mm; /* A4 width in millimeters */
                    height: 297mm; /* A4 height in millimeters */
                    margin: auto; /* Centering the paper on the page */
                    margin:auto;
                    padding: 20mm;
                    background-color:white;
                    border: 1px solid #ddd;
                    border-image:none;
                    box-shadow: 0 0 5mm rgba(0,0,0,.1);
                    font-family: Arial, sans-serif;
                }
                /************************************************/
                .header{
                    display: flex;
                    justify-content: left;
                    align-items: start;
                    text-align: center;
                }
                .logo{
                    width:100px;
                    height: auto;
                    margin-left: 0px;
                }
                /************************************************/
                .header-text{
                    position: absolute;
                    margin-top: 90px;
                    text-align: center;
                    line-height: 1px;
                    font-size: 16px;
                }
                /********************************************/
                .linelft{
                    margin: 19px 0;
                    display: flex;
                    justify-content: space-between;
                }
                .direct-text{
                margin: 10% 0 0 50%;    
                }
                .objetomi h4{
                    font-size: 18px;
                    padding: 5% 0;
                }
                /************************************************/
                .content{
                    margin-left:0;
                    margin-bottom:.520833333in;
                    margin-top:.520833333in;
                    font-size:1.125pc;
                }
                table.blueTable {
                    width: 100%;
                    text-align: left;
                    border-collapse: collapse;
                    text-transform: uppercase;
                  }
                  table.blueTable td, table.blueTable th {
                    padding: 8px 1px;
                  }
                  table.blueTable tbody td {
                    font-size: 16px;
                  }
                  table.blueTable tfoot td {
                    font-size: 16px;
                  }
                  table.blueTable tfoot .links {
                    text-align: right;
                  }
                  table.blueTable tfoot .links a{
                    display: inline-block;
                    background: #1C6EA4;
                    color: #FFFFFF;
                    padding: 2px 8px;
                    border-radius: 5px;
                  }
                table{
                    width: 100%;
                    border-collapse: collapse;
                }
                table tbody tr td{
                    padding: 8px;
                }
                .ftntbl{
                    font-weight: bold;
                    text-transform: none;
                    white-space: nowrap;
                    vertical-align: middle;
                    padding-right: 5px;
                }
                /*sign*/
                .blueTable2{
                    overflow: auto;
                    width: 100%;
                }
                .blueTable2 thead th{
                    border: #000 1px solid;
                }
                .blueTable2 tbody th{
                    border-top: #000 1px solid ;
                    border-right: #000 1px solid ;
                    border-bottom: none ;
                    border-left: #000 1px solid ;
                }
                .blueTable2 tbody th span{
                    display: block;
                    height: 180px;
                    margin: 5px;
                    text-align: right;
                }
                .blueTable2 tfoot th{
                    border-top: none ;
                    border-right: #000 1px solid ;
                    border-bottom: #000 1px solid ;
                    border-left: #000 1px solid ;
                    text-align: left;
                }
                .PRF{
                    padding: 5px;
                    margin: 5px;
                }
                .PRF span{
                    font-size: 16px;
                    font-weight: bold;
                }
                .PRF p{
                    display: inline;
                    font-size: 14px;
                    padding-bottom: 1rem;
                }
                
                /* Ensure table cells have consistent height */
                .blueTable td {
                    vertical-align: middle;
                    padding: 4px;
                }
                
                /* Fix for the Matricule alignment */
                #Matricule {
                    vertical-align: middle;
                }
                
                /* Custom handling for Action à réaliser content */
                .action-container {
                    display: inline-block;
                    vertical-align: middle;
                    max-width: 100%;
                }
                
                /* Making sure table has proper width */
                .blueTable {
                    width: 100%;
                    table-layout: fixed;
                    border-collapse: collapse;
                }
                
                /* Set widths for better layout */
                .blueTable td:first-child {
                    width: 20%;
                }
                
                .blueTable td:nth-child(2) {
                    width: 40%;
                }
                
                .blueTable td:nth-child(3) {
                    width: 20%;
                }
                
                .blueTable td:nth-child(4) {
                    width: 20%;
                }
                
                /* Specific styling for the action row */
                .action-row .action-label {
                    vertical-align: top;
                    padding-top: 4px;
                }
                
                @media print {
                    body { 
                        background-color: white !important;
                        margin: 0;
                        padding: 0;
                    }
                    .a4 { 
                        margin: 0; 
                        padding: 15mm;
                        border: none;
                        box-shadow: none;
                        width: 210mm;
                        height: 297mm;
                    }
                }
            </style>
        </head>
        <body>
            <div class="a4">
                <div class="header">
                    <img src="https://images.seeklogo.com/logo-png/40/2/sonatrach-logo-png_seeklogo-409789.png" alt="Sonatrach Logo" class="logo" style="width: 100px; height: 80px; object-fit: contain;">
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
                                <td id="fullName">${document.metadata.fullName}</td>
                                <td class="ftntbl">Matricule :</td>
                                <td id="Matricule">${document.metadata.matricule}</td>
                            </tr>
                            <tr>
                                <td class="ftntbl">Fonction :</td>
                                <td id="jobTitle">${document.metadata.jobTitle}</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                            <tr>
                                <td class="ftntbl">Structure :</td>
                                <td id="division">${document.metadata.division}</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                            <tr>
                                <td class="ftntbl">Itinéraire :</td>
                                <td id="itineraire">${document.metadata.itineraire}</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                            <tr>
                                <td class="ftntbl">Mission :</td>
                                <td>du&nbsp;<span id="date-depart">${new Date(document.metadata.dateDepart).toLocaleDateString('fr-FR')}</span>&nbsp;au&nbsp;<span id="date-retour">${new Date(document.metadata.dateRetour).toLocaleDateString('fr-FR')}</span></td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                            <tr>
                                <td class="ftntbl">Transport :</td>
                                <td id="transport">${document.metadata.transport}</td>
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
                                <th><span class="ftntbl">Date :</span><span id="Date">${new Date().toLocaleDateString('fr-FR')}</span></th>
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

                <script>
                window.addEventListener('beforeprint', function() {
                    const footer = document.createElement('div');
                    footer.style.position = 'fixed';
                    footer.style.bottom = '30px'; // Distance from the bottom
                    footer.style.right = '35px'; // Moved 25px to the left
                    footer.style.fontSize = '8px'; // Smallest font size
                    footer.style.color = '#000'; // Black color
                    footer.style.margin = '0';
                    footer.style.textAlign = 'right';
                    footer.innerText = 'Approbation Printed by ENP Application @2025';

                    document.body.appendChild(footer);
                });

                window.addEventListener('afterprint', function() {
                    const footer = document.querySelector('div[style*="position: fixed"]');
                    if (footer) {
                        document.body.removeChild(footer);
                    }
                });
                </script>
            </div>
        </body>
        </html>
      `;

      // Use a more reliable approach for printing
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(printContent);
        newWindow.document.close();
        newWindow.focus();
        
        // Trigger print dialog
        setTimeout(() => {
          newWindow.print();
        }, 1000);
      } else {
        // Fallback: create downloadable HTML file  
        const blob = new Blob([printContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ordre_Mission_${document.metadata.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Document téléchargé. Ouvrez le fichier HTML pour l\'imprimer.');
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