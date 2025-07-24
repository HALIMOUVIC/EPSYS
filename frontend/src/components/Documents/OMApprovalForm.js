import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  DocumentCheckIcon,
  CalendarIcon,
  MapPinIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

const OMApprovalForm = ({ onClose, onSave }) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    matricule: '',
    date: new Date().toISOString().split('T')[0],
    jobTitle: '',
    division: '',
    itineraire: '',
    dateDepart: '',
    dateRetour: '',
    transport: '',
    objet: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employeeLoading, setEmployeeLoading] = useState(false);

  // Remove the useEffect that pre-fills user information
  // useEffect(() => {
  //   setFormData(prev => ({
  //     ...prev,
  //     fullName: user?.full_name || '',
  //   }));
  // }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
    
    // If matricule changed, fetch employee data
    if (name === 'matricule' && value.trim() !== '') {
      fetchEmployeeData(value.trim());
    } else if (name === 'matricule' && value.trim() === '') {
      // Clear auto-populated fields if matricule is empty (but keep itineraire)
      setFormData(prev => ({
        ...prev,
        fullName: '',
        jobTitle: '',
        division: ''
        // itineraire is kept as user entered
      }));
    }
  };

  const fetchEmployeeData = async (matricule) => {
    setEmployeeLoading(true);
    try {
      const response = await axios.get(`/employees/${matricule}`);
      const employeeData = response.data;
      
      // Auto-populate form fields with employee data (excluding itineraire)
      setFormData(prev => ({
        ...prev,
        fullName: employeeData.fullName,
        jobTitle: employeeData.jobTitle,
        division: employeeData.division
        // itineraire is not auto-populated - user fills it manually
      }));
    } catch (error) {
      console.error('Error fetching employee data:', error);
      if (error.response?.status === 404) {
        // Clear fields if employee not found (excluding itineraire)
        setFormData(prev => ({
          ...prev,
          fullName: '',
          jobTitle: '',
          division: ''
          // itineraire remains as user entered
        }));
        setError('Employé non trouvé pour ce matricule');
      } else {
        setError('Erreur lors de la récupération des données employé');
      }
    } finally {
      setEmployeeLoading(false);
    }
  };

  const validateForm = () => {
    const requiredFields = ['matricule', 'jobTitle', 'division', 'itineraire', 'dateDepart', 'dateRetour', 'transport', 'objet'];
    return requiredFields.every(field => formData[field].trim() !== '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create OM Approval document
      const submitData = {
        title: `Ordre de Mission - ${formData.fullName}`,
        description: `Mission: ${formData.objet} - Itinéraire: ${formData.itineraire}`,
        document_type: 'om_approval',
        metadata: {
          ...formData,
          type: 'om_approval'
        }
      };

      const response = await axios.post('/documents', submitData);
      
      // Generate and print the document
      generatePrintableDocument();
      
      // Reset form
      setFormData({
        fullName: '',
        matricule: '',
        date: new Date().toISOString().split('T')[0],
        jobTitle: '',
        division: '',
        itineraire: '',
        dateDepart: '',
        dateRetour: '',
        transport: '',
        objet: ''
      });

      if (onSave) {
        onSave();
      }

      alert('Ordre de mission enregistré avec succès!');
    } catch (error) {
      console.error('Failed to save OM approval:', error);
      setError(error.response?.data?.detail || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const generatePrintableDocument = () => {
    // Create printable HTML document matching the PHP template exactly
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
                    <td>${formData.fullName}</td>
                    <td class="ftntbl">Matricule :</td>
                    <td>${formData.matricule}</td>
                  </tr>
                  <tr>
                    <td class="ftntbl">Fonction :</td>
                    <td>${formData.jobTitle}</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                  <tr>
                    <td class="ftntbl">Structure :</td>
                    <td>${formData.division}</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                  <tr>
                    <td class="ftntbl">Itinéraire :</td>
                    <td>${formData.itineraire}</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                  <tr>
                    <td class="ftntbl">Mission :</td>
                    <td>du&nbsp;<span>${new Date(formData.dateDepart).toLocaleDateString('fr-FR')}</span>&nbsp;au&nbsp;<span>${new Date(formData.dateRetour).toLocaleDateString('fr-FR')}</span></td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                  <tr>
                    <td class="ftntbl">Transport :</td>
                    <td>${formData.transport}</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                  <tr class="action-row">
                    <td class="ftntbl action-label">Action à réaliser :</td>
                    <td colspan="3">
                      ${(() => {
                        const text = formData.objet;
                        const words = text.split(' ');
                        const firstLine = [];
                        const secondLine = [];
                        let charCount = 0;
                        
                        words.forEach(word => {
                          if(charCount < 60) {
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
          
          <div style="position: fixed; bottom: 30px; right: 35px; font-size: 8px; color: #000;">
            Approbation Printed by ENP Application @2025
          </div>
        </body>
      </html>
    `;

    // Simple and reliable approach - open in new tab for printing
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
      a.download = `Ordre_Mission_${formData.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Document téléchargé. Ouvrez le fichier HTML pour l\'imprimer.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <DocumentCheckIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Approbation Ordre de Mission
            </h3>
            <p className="text-gray-600 text-sm">Demande d'ordre de mission</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Monsieur</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
              placeholder="Nom sera rempli automatiquement"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Matricule *</label>
            <div className="relative">
              <input
                type="text"
                name="matricule"
                value={formData.matricule}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Saisir le matricule"
              />
              {employeeLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none"
            />
          </div>
        </div>

        {/* Job Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Fonction *</label>
            <input
              type="text"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              required
              readOnly={formData.matricule && formData.jobTitle}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                formData.matricule && formData.jobTitle ? 'bg-gray-50' : ''
              }`}
              placeholder="Fonction sera remplie automatiquement"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Structure *</label>
            <input
              type="text"
              name="division"
              value={formData.division}
              onChange={handleChange}
              required
              readOnly={formData.matricule && formData.division}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                formData.matricule && formData.division ? 'bg-gray-50' : ''
              }`}
              placeholder="Division sera remplie automatiquement"
            />
          </div>
        </div>

        {/* Mission Details */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center">
            <MapPinIcon className="w-4 h-4 mr-2 text-purple-500" />
            Itinéraire *
          </label>
          <input
            type="text"
            name="itineraire"
            value={formData.itineraire}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Lieu de la mission"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2 text-purple-500" />
              Date de Départ *
            </label>
            <input
              type="date"
              name="dateDepart"
              value={formData.dateDepart}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2 text-purple-500" />
              Date de Retour *
            </label>
            <input
              type="date"
              name="dateRetour"
              value={formData.dateRetour}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center">
            <TruckIcon className="w-4 h-4 mr-2 text-purple-500" />
            Transport *
          </label>
          <input
            type="text"
            name="transport"
            value={formData.transport}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Moyen de transport"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center">
            <ClipboardDocumentListIcon className="w-4 h-4 mr-2 text-purple-500" />
            Action à réaliser *
          </label>
          <textarea
            name="objet"
            value={formData.objet}
            onChange={handleChange}
            required
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Description de la mission à accomplir"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <PrinterIcon className="w-4 h-4 mr-2" />
            {loading ? 'Enregistrement...' : 'Enregistrer et Imprimer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OMApprovalForm;