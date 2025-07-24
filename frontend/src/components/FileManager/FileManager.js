import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  FolderIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PencilIcon,
  FolderPlusIcon,
  HomeIcon,
  ChevronRightIcon,
  UserIcon,
  CalendarIcon,
  ArrowLeftIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const FileManager = () => {
  const { user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [navigationPath, setNavigationPath] = useState([]);
  const [parentFolderId, setParentFolderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showEditFolder, setShowEditFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderName, setFolderName] = useState('');
  
  // Alert system state
  const [alert, setAlert] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchFolderContents(currentFolder);
  }, [currentFolder]);

  // Alert system functions
  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const showConfirm = (title, message, onConfirm, onCancel = null) => {
    setConfirmDialog({
      title,
      message,
      onConfirm,
      onCancel: onCancel || (() => setConfirmDialog(null))
    });
  };

  const fetchFolderContents = async (folderId) => {
    try {
      setLoading(true);
      const url = folderId 
        ? `${backendUrl}/api/file-manager/folders?parent_id=${folderId}`
        : `${backendUrl}/api/file-manager/folders`;
      
      const response = await axios.get(url);
      
      setFolders(response.data.folders || []);
      setFiles(response.data.files || []);
      setCurrentPath(response.data.current_path || '/');
      setNavigationPath(response.data.navigation_path || []);
      setParentFolderId(response.data.parent_folder_id);
      setSearchResults(null);
    } catch (error) {
      console.error('Failed to fetch folder contents:', error);
      showAlert('error', 'Erreur', 'Impossible de charger le contenu du dossier');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      const response = await axios.get(`${backendUrl}/api/file-manager/search?query=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
      showAlert('error', 'Erreur de recherche', 'La recherche a échoué');
    }
  };

  const createFolder = async () => {
    if (!folderName.trim()) return;

    try {
      const response = await axios.post(`${backendUrl}/api/file-manager/folders`, {
        name: folderName,
        parent_id: currentFolder
      });

      setFolders([...folders, response.data]);
      setFolderName('');
      setShowCreateFolder(false);
      showAlert('success', 'Succès', `Dossier "${folderName}" créé avec succès`);
    } catch (error) {
      console.error('Failed to create folder:', error);
      const errorMessage = error.response?.data?.detail || 'Échec de la création du dossier';
      showAlert('error', 'Erreur', errorMessage);
    }
  };

  const editFolder = async () => {
    if (!folderName.trim() || !editingFolder) return;

    try {
      const response = await axios.put(`${backendUrl}/api/file-manager/folders/${editingFolder.id}`, {
        name: folderName
      });

      setFolders(folders.map(f => f.id === editingFolder.id ? response.data : f));
      setFolderName('');
      setShowEditFolder(false);
      setEditingFolder(null);
      showAlert('success', 'Succès', `Dossier renommé en "${folderName}" avec succès`);
    } catch (error) {
      console.error('Failed to edit folder:', error);
      const errorMessage = error.response?.data?.detail || 'Échec de la modification du dossier';
      showAlert('error', 'Erreur', errorMessage);
    }
  };

  const deleteFolder = async (folder) => {
    showConfirm(
      'Supprimer le dossier',
      `Êtes-vous sûr de vouloir supprimer le dossier "${folder.name}" et tout son contenu ? Cette action est irréversible.`,
      async () => {
        try {
          await axios.delete(`${backendUrl}/api/file-manager/folders/${folder.id}`);
          setFolders(folders.filter(f => f.id !== folder.id));
          setConfirmDialog(null);
          showAlert('success', 'Succès', `Dossier "${folder.name}" supprimé avec succès`);
        } catch (error) {
          console.error('Failed to delete folder:', error);
          const errorMessage = error.response?.data?.detail || 'Échec de la suppression du dossier';
          showAlert('error', 'Erreur', errorMessage);
          setConfirmDialog(null);
        }
      }
    );
  };

  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (!selectedFiles.length) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      if (currentFolder) {
        formData.append('folder_id', currentFolder);
      }
      
      const response = await axios.post(`${backendUrl}/api/file-manager/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Refresh the current folder contents
      fetchFolderContents(currentFolder);
      
      showAlert('success', 'Succès', `${selectedFiles.length} fichier(s) téléchargé(s) avec succès`);
    } catch (error) {
      console.error('Failed to upload files:', error);
      const errorMessage = error.response?.data?.detail || 'Échec du téléchargement des fichiers';
      showAlert('error', 'Erreur', errorMessage);
    } finally {
      setUploadingFile(false);
    }
  };

  const deleteFile = async (file) => {
    showConfirm(
      'Supprimer le fichier',
      `Êtes-vous sûr de vouloir supprimer le fichier "${file.name}" ? Cette action est irréversible.`,
      async () => {
        try {
          await axios.delete(`${backendUrl}/api/file-manager/files/${file.id}`);
          setFiles(files.filter(f => f.id !== file.id));
          setConfirmDialog(null);
          showAlert('success', 'Succès', `Fichier "${file.name}" supprimé avec succès`);
        } catch (error) {
          console.error('Failed to delete file:', error);
          const errorMessage = error.response?.data?.detail || 'Échec de la suppression du fichier';
          showAlert('error', 'Erreur', errorMessage);
          setConfirmDialog(null);
        }
      }
    );
  };

  const downloadFile = async (file) => {
    try {
      const token = localStorage.getItem('authToken');
      window.open(`${backendUrl}/api/file-manager/download/${file.id}?token=${token}`, '_blank');
    } catch (error) {
      console.error('Failed to download file:', error);
      showAlert('error', 'Erreur', 'Échec du téléchargement du fichier');
    }
  };

  const navigateToFolder = (folder) => {
    setCurrentFolder(folder.id);
  };

  const navigateToRoot = () => {
    setCurrentFolder(null);
  };

  const navigateToParent = () => {
    setCurrentFolder(parentFolderId);
  };

  const navigateToPath = (pathItem) => {
    setCurrentFolder(pathItem.id);
  };

  const startEditFolder = (folder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setShowEditFolder(true);
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const iconClass = "w-8 h-8";
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
      return <DocumentIcon className={`${iconClass} text-green-500`} />;
    } else if (['pdf'].includes(extension)) {
      return <DocumentIcon className={`${iconClass} text-red-500`} />;
    } else if (['doc', 'docx'].includes(extension)) {
      return <DocumentIcon className={`${iconClass} text-blue-500`} />;
    } else if (['xls', 'xlsx'].includes(extension)) {
      return <DocumentIcon className={`${iconClass} text-green-600`} />;
    } else {
      return <DocumentIcon className={`${iconClass} text-gray-500`} />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const canModifyItem = (item) => {
    return user?.role === 'admin' || item.created_by === user?.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const displayFolders = searchResults ? searchResults.folders : folders;
  const displayFiles = searchResults ? searchResults.files : files;

  return (
    <div className="space-y-6">
      {/* Alert System */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 max-w-md w-full bg-white rounded-lg shadow-lg border-l-4 p-4 transition-all duration-300 ${
          alert.type === 'success' ? 'border-green-500' : 
          alert.type === 'error' ? 'border-red-500' : 'border-blue-500'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {alert.type === 'success' && <CheckIcon className="h-5 w-5 text-green-500" />}
              {alert.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                alert.type === 'success' ? 'text-green-800' : 
                alert.type === 'error' ? 'text-red-800' : 'text-blue-800'
              }`}>
                {alert.title}
              </h3>
              <p className={`mt-1 text-sm ${
                alert.type === 'success' ? 'text-green-700' : 
                alert.type === 'error' ? 'text-red-700' : 'text-blue-700'
              }`}>
                {alert.message}
              </p>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="ml-3 flex-shrink-0"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">{confirmDialog.title}</h3>
            </div>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <FolderIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gestionnaire de Fichiers</h1>
              <p className="text-purple-100">Organisez et gérez vos documents</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
            >
              <FolderPlusIcon className="w-5 h-5 mr-2" />
              Nouveau Dossier
            </button>
            
            <label className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg cursor-pointer transition-colors">
              <CloudArrowUpIcon className="w-5 h-5 mr-2" />
              {uploadingFile ? 'Téléchargement...' : 'Télécharger'}
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation */}
      <div className="bg-white rounded-xl p-4 shadow-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={navigateToRoot}
              className="flex items-center space-x-1 px-3 py-2 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors"
            >
              <HomeIcon className="w-4 h-4" />
              <span>Racine</span>
            </button>
            
            {navigationPath.map((pathItem, index) => (
              <React.Fragment key={pathItem.id}>
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                <button
                  onClick={() => navigateToPath(pathItem)}
                  className="px-3 py-2 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors font-medium"
                >
                  {pathItem.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          
          {parentFolderId !== undefined && (
            <button
              onClick={navigateToParent}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Retour</span>
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Search */}
      <div className="bg-white rounded-xl p-6 shadow-lg border">
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher des fichiers et dossiers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md"
          >
            Rechercher
          </button>
          {searchResults && (
            <button
              onClick={() => {
                setSearchResults(null);
                setSearchTerm('');
              }}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="bg-white rounded-xl shadow-lg border">
        <div className="p-6">
          {displayFolders.length === 0 && displayFiles.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <FolderIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchResults ? 'Aucun résultat trouvé' : 'Dossier vide'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchResults 
                  ? 'Essayez d\'ajuster vos termes de recherche pour trouver ce que vous cherchez.' 
                  : 'Commencez par créer un dossier ou télécharger des fichiers pour organiser vos documents.'}
              </p>
              {!searchResults && (
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowCreateFolder(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FolderPlusIcon className="w-5 h-5 mr-2" />
                    Créer un dossier
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Folders */}
              {displayFolders.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <FolderIcon className="w-6 h-6 mr-3 text-blue-500" />
                      Dossiers ({displayFolders.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayFolders.map((folder) => (
                      <div key={folder.id} className="group bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:scale-105">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="bg-blue-500 bg-opacity-20 p-2 rounded-lg">
                              <FolderIcon className="w-8 h-8 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 
                                className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => navigateToFolder(folder)}
                              >
                                {folder.name}
                              </h4>
                            </div>
                          </div>
                          {canModifyItem(folder) && (
                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditFolder(folder)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteFolder(folder)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2 text-xs text-gray-600">
                          <div className="flex items-center space-x-2">
                            <UserIcon className="w-3 h-3 text-blue-500" />
                            <span>Créé par: <span className="font-medium">{folder.created_by_name || 'Inconnu'}</span></span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="w-3 h-3 text-blue-500" />
                            <span>Le: <span className="font-medium">{formatDate(folder.created_at)}</span></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files */}
              {displayFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <DocumentIcon className="w-6 h-6 mr-3 text-green-500" />
                      Fichiers ({displayFiles.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayFiles.map((file) => (
                      <div key={file.id} className="group bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:scale-105">
                        <div className="flex items-start space-x-3 mb-4">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            {getFileIcon(file.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate text-sm mb-1">
                              {file.name}
                            </h4>
                            <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs text-gray-600 mb-4">
                          <div className="flex items-center space-x-2">
                            <UserIcon className="w-3 h-3 text-green-500" />
                            <span>Par: <span className="font-medium">{file.uploaded_by_name}</span></span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="w-3 h-3 text-green-500" />
                            <span>Le: <span className="font-medium">{formatDate(file.created_at)}</span></span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => downloadFile(file)}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs font-medium"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                            Télécharger
                          </button>
                          
                          {canModifyItem(file) && (
                            <button
                              onClick={() => deleteFile(file)}
                              className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <FolderPlusIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Créer un nouveau dossier</h3>
            </div>
            <input
              type="text"
              placeholder="Nom du dossier"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-6 transition-colors"
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateFolder(false);
                  setFolderName('');
                }}
                className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createFolder}
                disabled={!folderName.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Edit Folder Modal */}
      {showEditFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <PencilIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Renommer le dossier</h3>
            </div>
            <input
              type="text"
              placeholder="Nouveau nom du dossier"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-6 transition-colors"
              onKeyPress={(e) => e.key === 'Enter' && editFolder()}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditFolder(false);
                  setFolderName('');
                  setEditingFolder(null);
                }}
                className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={editFolder}
                disabled={!folderName.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                Renommer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;