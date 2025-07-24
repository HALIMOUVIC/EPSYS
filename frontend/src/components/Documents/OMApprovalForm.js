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
    // Create printable HTML document using the exact A4 template provided
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
                              <td id="fullName">${formData.fullName}</td>
                              <td class="ftntbl">Matricule :</td>
                              <td id="Matricule">${formData.matricule}</td>
                          </tr>
                          <tr>
                              <td class="ftntbl">Fonction :</td>
                              <td id="jobTitle">${formData.jobTitle}</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                          </tr>
                          <tr>
                              <td class="ftntbl">Structure :</td>
                              <td id="division">${formData.division}</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                          </tr>
                          <tr>
                              <td class="ftntbl">Itinéraire :</td>
                              <td id="itineraire">${formData.itineraire}</td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                          </tr>
                          <tr>
                              <td class="ftntbl">Mission :</td>
                              <td>du&nbsp;<span id="date-depart">${new Date(formData.dateDepart).toLocaleDateString('fr-FR')}</span>&nbsp;au&nbsp;<span id="date-retour">${new Date(formData.dateRetour).toLocaleDateString('fr-FR')}</span></td>
                              <td>&nbsp;</td>
                              <td>&nbsp;</td>
                          </tr>
                          <tr>
                              <td class="ftntbl">Transport :</td>
                              <td id="transport">${formData.transport}</td>
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