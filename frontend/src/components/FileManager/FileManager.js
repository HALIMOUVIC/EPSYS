import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import {
  FolderIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PencilIcon,
  FolderPlusIcon,
  HomeIcon,
  ChevronRightIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const FileManager = () => {
  const { user } = useContext(AuthContext);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showEditFolder, setShowEditFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderName, setFolderName] = useState('');

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchFolderContents(currentFolder);
  }, [currentFolder]);

  const fetchFolderContents = async (folderId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = folderId 
        ? `${backendUrl}/api/file-manager/folders?parent_id=${folderId}`
        : `${backendUrl}/api/file-manager/folders`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFolders(response.data.folders || []);
      setFiles(response.data.files || []);
      setCurrentPath(response.data.current_path || '/');
      setSearchResults(null);
    } catch (error) {
      console.error('Failed to fetch folder contents:', error);
      alert('Failed to load folder contents');
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
      const token = localStorage.getItem('token');
      const response = await axios.get(`${backendUrl}/api/file-manager/search?query=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed');
    }
  };

  const createFolder = async () => {
    if (!folderName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${backendUrl}/api/file-manager/folders`, {
        name: folderName,
        parent_id: currentFolder
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFolders([...folders, response.data]);
      setFolderName('');
      setShowCreateFolder(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create folder';
      alert(errorMessage);
    }
  };

  const editFolder = async () => {
    if (!folderName.trim() || !editingFolder) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${backendUrl}/api/file-manager/folders/${editingFolder.id}`, {
        name: folderName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFolders(folders.map(f => f.id === editingFolder.id ? response.data : f));
      setFolderName('');
      setShowEditFolder(false);
      setEditingFolder(null);
    } catch (error) {
      console.error('Failed to edit folder:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to edit folder';
      alert(errorMessage);
    }
  };

  const deleteFolder = async (folder) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le dossier "${folder.name}" et tout son contenu ?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${backendUrl}/api/file-manager/folders/${folder.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFolders(folders.filter(f => f.id !== folder.id));
    } catch (error) {
      console.error('Failed to delete folder:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete folder';
      alert(errorMessage);
    }
  };

  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (!selectedFiles.length) return;

    setUploadingFile(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      if (currentFolder) {
        formData.append('folder_id', currentFolder);
      }
      
      const response = await axios.post(`${backendUrl}/api/file-manager/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      // Refresh the current folder contents
      fetchFolderContents(currentFolder);
      
      alert(`Successfully uploaded ${selectedFiles.length} file(s)`);
    } catch (error) {
      console.error('Failed to upload files:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to upload files';
      alert(errorMessage);
    } finally {
      setUploadingFile(false);
    }
  };

  const deleteFile = async (file) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le fichier "${file.name}" ?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${backendUrl}/api/file-manager/files/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFiles(files.filter(f => f.id !== file.id));
    } catch (error) {
      console.error('Failed to delete file:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete file';
      alert(errorMessage);
    }
  };

  const downloadFile = async (file) => {
    try {
      const token = localStorage.getItem('token');
      window.open(`${backendUrl}/api/file-manager/download/${file.id}?token=${token}`, '_blank');
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file');
    }
  };

  const navigateToFolder = (folder) => {
    setCurrentFolder(folder.id);
  };

  const navigateToRoot = () => {
    setCurrentFolder(null);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FolderIcon className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestionnaire de Fichiers</h1>
            <p className="text-gray-600">Gérez vos fichiers et dossiers</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FolderPlusIcon className="w-5 h-5 mr-2" />
            Nouveau Dossier
          </button>
          
          <label className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer transition-colors">
            <CloudArrowUpIcon className="w-5 h-5 mr-2" />
            {uploadingFile ? 'Téléchargement...' : 'Télécharger Fichier'}
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

      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl p-4 shadow-lg">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <button
            onClick={navigateToRoot}
            className="flex items-center space-x-1 hover:text-purple-600 transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            <span>Racine</span>
          </button>
          {currentPath !== '/' && (
            <>
              <ChevronRightIcon className="w-4 h-4" />
              <span className="font-medium text-gray-900">{currentPath}</span>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher des fichiers et dossiers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Rechercher
          </button>
          {searchResults && (
            <button
              onClick={() => {
                setSearchResults(null);
                setSearchTerm('');
              }}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6">
          {displayFolders.length === 0 && displayFiles.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchResults ? 'Aucun résultat trouvé' : 'Aucun fichier trouvé'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchResults 
                  ? 'Essayez d\'ajuster vos termes de recherche.' 
                  : 'Créez votre premier dossier ou téléchargez un fichier pour commencer.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Folders */}
              {displayFolders.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FolderIcon className="w-5 h-5 mr-2" />
                    Dossiers ({displayFolders.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayFolders.map((folder) => (
                      <div key={folder.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <FolderIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <h4 
                                className="font-medium text-gray-900 truncate cursor-pointer hover:text-purple-600"
                                onClick={() => navigateToFolder(folder)}
                              >
                                {folder.name}
                              </h4>
                            </div>
                          </div>
                          {canModifyItem(folder) && (
                            <div className="flex space-x-1">
                              <button
                                onClick={() => startEditFolder(folder)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteFolder(folder)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <UserIcon className="w-3 h-3" />
                            <span>Créé par: {folder.created_by_name || 'Inconnu'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="w-3 h-3" />
                            <span>Créé le: {formatDate(folder.created_at)}</span>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <DocumentIcon className="w-5 h-5 mr-2" />
                    Fichiers ({displayFiles.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayFiles.map((file) => (
                      <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-3 mb-3">
                          {getFileIcon(file.name)}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </h4>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs text-gray-500 mb-4">
                          <div className="flex justify-between">
                            <span>Taille:</span>
                            <span>{formatFileSize(file.file_size)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <UserIcon className="w-3 h-3" />
                            <span>Par: {file.uploaded_by_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="w-3 h-3" />
                            <span>Le: {formatDate(file.created_at)}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => downloadFile(file)}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs"
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

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Créer un nouveau dossier</h3>
            <input
              type="text"
              placeholder="Nom du dossier"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateFolder(false);
                  setFolderName('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={createFolder}
                disabled={!folderName.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Folder Modal */}
      {showEditFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Renommer le dossier</h3>
            <input
              type="text"
              placeholder="Nouveau nom du dossier"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && editFolder()}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditFolder(false);
                  setFolderName('');
                  setEditingFolder(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={editFolder}
                disabled={!folderName.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
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