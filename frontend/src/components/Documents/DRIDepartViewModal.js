import React, { useState } from 'react';
import { XMarkIcon, DocumentTextIcon, UserIcon, CalendarIcon, PaperAirplaneIcon, BuildingOfficeIcon, EyeIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const DRIDepartViewModal = ({ document, isOpen, onClose }) => {
  const [previewFile, setPreviewFile] = useState(null);
  
  if (!isOpen || !document) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getFileIcon = (extension) => {
    switch (extension?.toLowerCase()) {
      case 'pdf':
        return 'fas fa-file-pdf text-red-500';
      case 'doc':
      case 'docx':
        return 'fas fa-file-word text-blue-500';
      case 'xls':
      case 'xlsx':
        return 'fas fa-file-excel text-green-500';
      default:
        return 'fas fa-file text-gray-500';
    }
  };

  const downloadFile = async (filePath, originalName) => {
    try {
      const response = await fetch(`/api/documents/download/${encodeURIComponent(filePath)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', originalName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Erreur lors du téléchargement du fichier');
    }
  };

  const canPreview = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'md'].includes(extension);
  };

  const handlePreview = async (file) => {
    try {
      console.log('Attempting to preview file:', file.original_name);
      
      const response = await fetch(`/api/documents/download/${encodeURIComponent(file.file_path)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        console.log('Preview URL created:', url);
        console.log('File type:', blob.type);
        
        setPreviewFile({
          name: file.original_name,
          url: url,
          type: blob.type || getContentType(file.original_name)
        });
      } else {
        console.error('Failed to fetch file for preview:', response.status);
        alert('Erreur lors du chargement du fichier pour la prévisualisation');
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      alert('Erreur lors de la prévisualisation du fichier');
    }
  };

  const getContentType = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'txt':
        return 'text/plain';
      case 'md':
        return 'text/markdown';
      default:
        return 'application/octet-stream';
    }
  };

  const closePreview = () => {
    if (previewFile?.url) {
      window.URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full h-[85vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <DocumentTextIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Détails du Courrier DRI</h2>
                  <p className="text-indigo-100 text-sm">Référence: {document.reference}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all duration-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content - No scroll, fixed height */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Left Column - Document Info */}
              <div className="space-y-4 overflow-y-auto">
                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <PaperAirplaneIcon className="w-5 h-5 text-indigo-600" />
                      <label className="text-sm font-semibold text-gray-700">Référence</label>
                    </div>
                    <p className="text-gray-900 font-medium">{document.reference}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <CalendarIcon className="w-5 h-5 text-blue-600" />
                      <label className="text-sm font-semibold text-gray-700">Date Départ</label>
                    </div>
                    <p className="text-gray-900">{formatDate(document.metadata.date)}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <UserIcon className="w-5 h-5 text-green-600" />
                      <label className="text-sm font-semibold text-gray-700">Expéditeur</label>
                    </div>
                    <p className="text-gray-900">{document.metadata.expediteur}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <DocumentTextIcon className="w-5 h-5 text-purple-600" />
                      <label className="text-sm font-semibold text-gray-700">Réf. Expéditeur</label>
                    </div>
                    <p className="text-gray-900">{document.metadata.expediteur_reference}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <CalendarIcon className="w-5 h-5 text-orange-600" />
                      <label className="text-sm font-semibold text-gray-700">Date Courrier</label>
                    </div>
                    <p className="text-gray-900">{formatDate(document.metadata.expediteur_date)}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <BuildingOfficeIcon className="w-5 h-5 text-teal-600" />
                      <label className="text-sm font-semibold text-gray-700">Destinataire</label>
                    </div>
                    <p className="text-gray-900">{document.metadata.destinataire}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                      <label className="text-sm font-semibold text-gray-700">Objet</label>
                    </div>
                    <p className="text-gray-900 leading-relaxed">{document.metadata.objet}</p>
                  </div>
                </div>

                {/* Files */}
                {document.metadata.files && document.metadata.files.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <DocumentTextIcon className="w-5 h-5 text-green-600" />
                      <label className="text-sm font-semibold text-gray-700">Fichiers Joints</label>
                    </div>
                    <div className="space-y-2">
                      {document.metadata.files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex-shrink-0">
                            <i className={`${getFileIcon(file.original_name.split('.').pop())} text-lg`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.original_name}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            {canPreview(file.original_name) && (
                              <button
                                onClick={() => handlePreview(file)}
                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                title="Prévisualiser"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => downloadFile(file.file_path, file.original_name)}
                              className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors"
                              title="Télécharger"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Creation Info */}
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <UserIcon className="w-5 h-5 text-indigo-600" />
                    <label className="text-sm font-semibold text-indigo-700">Informations de création</label>
                  </div>
                  <div className="text-sm text-indigo-600">
                    <p>Créé par: <span className="font-medium">{document.created_by_name || 'Utilisateur'}</span></p>
                    <p>Date de création: <span className="font-medium">{formatDate(document.created_at)}</span></p>
                  </div>
                </div>
              </div>

              {/* Right Column - File Preview */}
              <div className="bg-gray-50 rounded-lg flex flex-col">
                {previewFile ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{previewFile.name}</h3>
                      <button
                        onClick={closePreview}
                        className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 p-4">
                      {previewFile.type.includes('pdf') ? (
                        <iframe
                          src={previewFile.url}
                          className="w-full h-full rounded border"
                          title={previewFile.name}
                        />
                      ) : previewFile.type.includes('image') ? (
                        <img
                          src={previewFile.url}
                          alt={previewFile.name}
                          className="max-w-full max-h-full object-contain mx-auto"
                        />
                      ) : previewFile.type.includes('text') ? (
                        <iframe
                          src={previewFile.url}
                          className="w-full h-full rounded border bg-white"
                          title={previewFile.name}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <p>Aperçu non disponible pour ce type de fichier</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <EyeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Aperçu des fichiers</p>
                      <p className="text-sm">Cliquez sur l'icône de prévisualisation pour voir un fichier</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200 flex-shrink-0">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="max-w-7xl max-h-full w-full h-full p-8">
            <div className="bg-white rounded-lg h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">{previewFile.name}</h3>
                <button
                  onClick={closePreview}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-full"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 p-4">
                {previewFile.type.includes('pdf') ? (
                  <iframe
                    src={previewFile.url}
                    className="w-full h-full"
                    title={previewFile.name}
                  />
                ) : previewFile.type.includes('image') ? (
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-w-full max-h-full object-contain mx-auto"
                  />
                ) : (
                  <iframe
                    src={previewFile.url}
                    className="w-full h-full bg-white"
                    title={previewFile.name}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DRIDepartViewModal;