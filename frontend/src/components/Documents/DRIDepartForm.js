import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const DRIDepartForm = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    expediteur: '',
    expediteur_reference: '',
    expediteur_date: '',
    destinataire: '',
    objet: ''
  });
  
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Add form fields
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      // Add files
      files.forEach(file => {
        formDataToSend.append('files', file);
      });

      await axios.post('/api/documents/dri-depart', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        expediteur: '',
        expediteur_reference: '',
        expediteur_date: '',
        destinataire: '',
        objet: ''
      });
      setFiles([]);

      onSuccess && onSuccess();
      onClose && onClose();
      
    } catch (error) {
      console.error('Error creating DRI depart document:', error);
      setError(error.response?.data?.detail || 'Une erreur est survenue lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl p-0 transition-all duration-300 overflow-hidden transform hover:shadow-[0_15px_35px_rgba(79,70,229,0.15)] border border-indigo-100">
      {/* Form Header */}
      <div className="p-6 bg-gradient-to-r from-indigo-600 to-blue-600 flex justify-between items-center">
        <h3 className="text-xl font-bold text-white flex items-center">
          <i className="fas fa-file-alt mr-3 text-indigo-200"></i>
          <span>Nouveau Courrier DRI Départ</span>
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date de départ */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <i className="far fa-calendar-alt text-indigo-500 mr-2"></i>
              Date de départ
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30"
            />
          </div>

          {/* Expéditeur */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <i className="fas fa-user text-indigo-500 mr-2"></i>
              Expéditeur *
            </label>
            <input
              type="text"
              name="expediteur"
              value={formData.expediteur}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30"
              placeholder="Nom de l'expéditeur"
            />
          </div>

          {/* Référence Expéditeur */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <i className="fas fa-hashtag text-indigo-500 mr-2"></i>
              Référence Expéditeur *
            </label>
            <input
              type="text"
              name="expediteur_reference"
              value={formData.expediteur_reference}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30"
              placeholder="Référence du courrier expéditeur"
            />
          </div>

          {/* Date du courrier */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <i className="far fa-calendar-check text-indigo-500 mr-2"></i>
              Date du courrier
            </label>
            <input
              type="date"
              name="expediteur_date"
              value={formData.expediteur_date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30"
            />
          </div>

          {/* Destinataire */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <i className="fas fa-user-check text-indigo-500 mr-2"></i>
              Destinataire *
            </label>
            <input
              type="text"
              name="destinataire"
              value={formData.destinataire}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30"
              placeholder="Nom du destinataire"
            />
          </div>

          {/* Objet */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 flex items-center">
              <i className="fas fa-pencil-alt text-indigo-500 mr-2"></i>
              Objet *
            </label>
            <input
              type="text"
              name="objet"
              value={formData.objet}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50/30"
              placeholder="Objet du courrier"
            />
          </div>
        </div>

        {/* File Upload Section */}
        <div className="mt-8 border-2 border-dashed border-indigo-300 rounded-xl p-6 text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-all duration-300 group relative overflow-hidden">
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="fileInputDriDepart"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
          />
          <label htmlFor="fileInputDriDepart" className="cursor-pointer block w-full h-full">
            <div className="space-y-3 relative z-10">
              <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 group-hover:bg-indigo-200">
                <i className="fas fa-cloud-upload-alt text-3xl text-indigo-500 group-hover:text-indigo-600 transition-colors"></i>
              </div>
              <p className="text-sm text-gray-600 group-hover:text-indigo-700 transition-colors font-medium">
                Glissez et déposez vos fichiers ici ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-gray-500 flex items-center justify-center">
                <i className="fas fa-info-circle mr-1"></i>
                PDF, DOCX, XLSX (Max 10MB par fichier)
              </p>
            </div>
          </label>
        </div>

        {/* Selected Files Display */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Fichiers sélectionnés:</h4>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-file text-indigo-500"></i>
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4 mt-8 border-t border-gray-100 pt-6">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-300 flex items-center"
            >
              <i className="fas fa-times mr-2"></i>
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enregistrement...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Enregistrer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DRIDepartForm;