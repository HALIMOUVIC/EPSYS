import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserIcon,
  CameraIcon,
  ShieldCheckIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const Profile = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Alert system
  const [alert, setAlert] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/settings`);
      setSettings(response.data);
      if (response.data.avatar_url) {
        setImagePreview(response.data.avatar_url);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      showAlert('error', 'Erreur', 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates) => {
    try {
      setSaving(true);
      const response = await axios.put(`${backendUrl}/api/settings`, updates);
      setSettings(response.data);
      showAlert('success', 'Succès', 'Profil mis à jour avec succès');
    } catch (error) {
      console.error('Failed to update settings:', error);
      const errorMessage = error.response?.data?.detail || 'Échec de la mise à jour du profil';
      showAlert('error', 'Erreur', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = async (key, value) => {
    if (!settings) return;
    
    // Update local state immediately for better UX
    setSettings({...settings, [key]: value});
    
    // Debounced update to backend
    clearTimeout(window.profileTimeout);
    window.profileTimeout = setTimeout(() => {
      updateSettings({ [key]: value });
    }, 500);
  };

  const handlePrivacyChange = async (key) => {
    if (!settings) return;
    const newValue = key === 'show_online_status' ? !settings[key] : settings[key];
    
    // Update local state immediately for better UX
    setSettings({...settings, [key]: newValue});
    
    // Update backend
    await updateSettings({ [key]: newValue });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showAlert('error', 'Erreur', 'L\'image ne doit pas dépasser 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        showAlert('error', 'Erreur', 'Veuillez sélectionner une image valide');
        return;
      }

      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        // Convert to base64 and save
        handleInputChange('avatar_url', e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showAlert('error', 'Erreur', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      showAlert('error', 'Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      await axios.post(`${backendUrl}/api/settings/change-password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      
      setShowPasswordModal(false);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      showAlert('success', 'Succès', 'Mot de passe modifié avec succès');
    } catch (error) {
      console.error('Failed to change password:', error);
      const errorMessage = error.response?.data?.detail || 'Échec de la modification du mot de passe';
      showAlert('error', 'Erreur', errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Impossible de charger le profil</p>
      </div>
    );
  }

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

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <UserIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mon Profil</h1>
              <p className="text-blue-100">Gérez vos informations personnelles</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <UserIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Informations personnelles</h2>
          </div>

          {/* Profile Picture */}
          <div className="flex items-center space-x-6 mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full cursor-pointer hover:bg-purple-700 transition-colors">
                <CameraIcon className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{settings.full_name}</h3>
              <p className="text-gray-600">{settings.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Cliquez sur l'icône appareil photo pour changer votre photo de profil
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
              <input
                type="text"
                value={settings.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={settings.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
              <input
                type="tel"
                value={settings.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Biographie</label>
              <textarea
                value={settings.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Parlez-nous de vous..."
              />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ShieldCheckIcon className="w-4 h-4 mr-2" />
                Changer le mot de passe
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Confidentialité</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Visibilité du profil</label>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="public"
                    name="profile_visibility"
                    value="public"
                    checked={settings.profile_visibility === 'public'}
                    onChange={(e) => handleInputChange('profile_visibility', e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <label htmlFor="public" className="ml-3">
                    <div className="text-sm font-medium text-gray-900">Public</div>
                    <div className="text-xs text-gray-600">Visible par tous les utilisateurs</div>
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="internal"
                    name="profile_visibility"
                    value="internal"
                    checked={settings.profile_visibility === 'internal'}
                    onChange={(e) => handleInputChange('profile_visibility', e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <label htmlFor="internal" className="ml-3">
                    <div className="text-sm font-medium text-gray-900">Utilisateurs internes uniquement</div>
                    <div className="text-xs text-gray-600">Visible uniquement par les employés de l'entreprise</div>
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="private"
                    name="profile_visibility"
                    value="private"
                    checked={settings.profile_visibility === 'private'}
                    onChange={(e) => handleInputChange('profile_visibility', e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <label htmlFor="private" className="ml-3">
                    <div className="text-sm font-medium text-gray-900">Privé</div>
                    <div className="text-xs text-gray-600">Visible uniquement par vous</div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div>
                <div className="text-sm font-medium text-gray-900">Afficher le statut en ligne</div>
                <div className="text-xs text-gray-600">Permettre aux autres de voir si vous êtes en ligne</div>
              </div>
              <input
                type="checkbox"
                checked={settings.show_online_status}
                onChange={() => handlePrivacyChange('show_online_status')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Paramètres de sécurité avancés</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Dernière connexion</span>
                  <span className="font-medium">Aujourd'hui, 14:32</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Appareil de connexion</span>
                  <span className="font-medium">Navigateur Web</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Authentification 2FA</span>
                  <span className={`font-medium ${settings.two_factor_enabled ? 'text-green-600' : 'text-red-600'}`}>
                    {settings.two_factor_enabled ? 'Activée' : 'Désactivée'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Statistics */}
        <div className="bg-white rounded-xl p-6 shadow-lg lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques du compte</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-blue-600">Documents créés</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-green-600">Fichiers téléchargés</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-sm text-purple-600">Événements créés</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">Membre depuis</div>
              <div className="text-sm text-orange-600">2025</div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Changer le mot de passe</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors"
                >
                  Changer le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;