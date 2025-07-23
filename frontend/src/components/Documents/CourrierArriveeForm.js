import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  InboxIcon,
  PaperClipIcon,
  XMarkIcon,
  CalendarIcon,
  CloudArrowUpIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const CourrierArriveeForm = ({ isEdit = false, documentId = null, onClose, onSave }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    date_reception: new Date().toISOString().split('T')[0],
    expediteur: '',
    reference_expediteur: '',
    date_courrier: new Date().toISOString().split('T')[0],
    destinataire: '',
    objet: ''
  });
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (isEdit && documentId) {
      fetchDocument();
    }
  }, [isEdit, documentId]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`/documents/${documentId}`);
      const doc = response.data;
      
      setFormData({
        date_reception: doc.metadata?.date_reception || new Date().toISOString().split('T')[0],
        expediteur: doc.metadata?.expediteur || '',
        reference_expediteur: doc.metadata?.reference_expediteur || '',
        date_courrier: doc.metadata?.date_courrier || new Date().toISOString().split('T')[0],
        destinataire: doc.metadata?.destinataire || '',
        objet: doc.title || ''
      });
    } catch (error) {
      console.error('Failed to fetch document:', error);
      setError('Failed to load document');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        title: formData.objet,
        description: `Courrier arrivé - De: ${formData.expediteur} - À: ${formData.destinataire}`,
        document_type: 'incoming_mail',
        metadata: {
          date_reception: formData.date_reception,
          expediteur: formData.expediteur,
          reference_expediteur: formData.reference_expediteur,
          date_courrier: formData.date_courrier,
          destinataire: formData.destinataire,
          objet: formData.objet
        }
      };

      let response;
      if (isEdit) {
        response = await axios.put(`/documents/${documentId}`, submitData);
      } else {
        response = await axios.post('/documents', submitData);
      }

      // Upload files if selected
      if (selectedFiles.length > 0) {
        const formDataFile = new FormData();
        selectedFiles.forEach(file => {
          formDataFile.append('files', file);
        });
        
        const docId = isEdit ? documentId : response.data.id;
        await axios.post(`/documents/${docId}/upload`, formDataFile, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      if (onSave) {
        onSave();
      } else {
        navigate('/incoming-mail');
      }
    } catch (error) {
      console.error('Failed to save document:', error);
      setError(error.response?.data?.detail || 'Failed to save document');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <InboxIcon className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {isEdit ? 'Modifier Courrier Arrivé' : 'Nouveau Courrier Arrivé'}
            </h3>
            <p className="text-gray-600 text-sm">Gestion du courrier entrant</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <CalendarIcon className="w-4 h-4 inline mr-1" />
              Date de réception *
            </label>
            <input
              type="date"
              name="date_reception"
              value={formData.date_reception}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <UserIcon className="w-4 h-4 inline mr-1" />
              Expéditeur *
            </label>
            <input
              type="text"
              name="expediteur"
              value={formData.expediteur}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Nom de l'expéditeur"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Référence Expéditeur
            </label>
            <input
              type="text"
              name="reference_expediteur"
              value={formData.reference_expediteur}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Référence du courrier expéditeur"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <CalendarIcon className="w-4 h-4 inline mr-1" />
              Date du courrier
            </label>
            <input
              type="date"
              name="date_courrier"
              value={formData.date_courrier}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Destinataire *
            </label>
            <input
              type="text"
              name="destinataire"
              value={formData.destinataire}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Nom du destinataire"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Objet *
            </label>
            <input
              type="text"
              name="objet"
              value={formData.objet}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Objet du courrier"
            />
          </div>
        </div>

        {/* File Upload Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            <PaperClipIcon className="w-4 h-4 inline mr-1" />
            Fichiers joints
          </label>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
              dragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="fileInputArrivee"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
            <label htmlFor="fileInputArrivee" className="cursor-pointer">
              <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Glissez et déposez vos fichiers ici ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-gray-500">
                PDF, DOCX, XLSX, PNG, JPG (Max 10MB par fichier)
              </p>
            </label>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Fichiers sélectionnés:</h4>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <PaperClipIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (isEdit ? 'Modification...' : 'Enregistrement...') : (isEdit ? 'Modifier' : 'Enregistrer')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourrierArriveeForm;