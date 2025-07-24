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
    fullName: user?.full_name || '',
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

  useEffect(() => {
    // Pre-fill user information
    setFormData(prev => ({
      ...prev,
      fullName: user?.full_name || '',
      // You might want to fetch additional user details like job title and division
      // from user profile or a separate API endpoint
    }));
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
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
        fullName: user?.full_name || '',
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
    // Create printable HTML document
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
            <p>Date: ${new Date(formData.date).toLocaleDateString('fr-FR')}</p>
          </div>
          
          <table>
            <tr>
              <td class="label">Monsieur:</td>
              <td>${formData.fullName}</td>
              <td class="label">Matricule:</td>
              <td>${formData.matricule}</td>
            </tr>
            <tr>
              <td class="label">Fonction:</td>
              <td>${formData.jobTitle}</td>
              <td class="label">Structure:</td>
              <td>${formData.division}</td>
            </tr>
            <tr>
              <td class="label">Itinéraire:</td>
              <td colspan="3">${formData.itineraire}</td>
            </tr>
            <tr>
              <td class="label">Date de Départ:</td>
              <td>${new Date(formData.dateDepart).toLocaleDateString('fr-FR')}</td>
              <td class="label">Date de Retour:</td>
              <td>${new Date(formData.dateRetour).toLocaleDateString('fr-FR')}</td>
            </tr>
            <tr>
              <td class="label">Transport:</td>
              <td colspan="3">${formData.transport}</td>
            </tr>
            <tr>
              <td class="label">Action à réaliser:</td>
              <td colspan="3">${formData.objet}</td>
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
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Matricule *</label>
            <input
              type="text"
              name="matricule"
              value={formData.matricule}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Numéro de matricule"
            />
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Fonction/Poste"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Division/Service"
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