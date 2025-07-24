import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  UserIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  KeyIcon,
  ChartBarIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Alert system
  const [alert, setAlert] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchSettings();
    if (user?.role === 'admin') {
      fetchSystemInfo();
    }
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
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      showAlert('error', 'Erreur', 'Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/settings/system-info`);
      setSystemInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    }
  };

  const updateSettings = async (updates) => {
    try {
      setSaving(true);
      const response = await axios.put(`${backendUrl}/api/settings`, updates);
      setSettings(response.data);
      showAlert('success', 'Succès', 'Paramètres mis à jour avec succès');
    } catch (error) {
      console.error('Failed to update settings:', error);
      const errorMessage = error.response?.data?.detail || 'Échec de la mise à jour des paramètres';
      showAlert('error', 'Erreur', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = async (key) => {
    if (!settings) return;
    const newValue = !settings[key];
    
    // Update local state immediately for better UX
    setSettings({...settings, [key]: newValue});
    
    // Update backend
    await updateSettings({ [key]: newValue });
  };

  const handleInputChange = async (key, value) => {
    if (!settings) return;
    
    // Update local state immediately for better UX
    setSettings({...settings, [key]: value});
    
    // Debounced update to backend
    clearTimeout(window.settingsTimeout);
    window.settingsTimeout = setTimeout(() => {
      updateSettings({ [key]: value });
    }, 500);
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
        <p className="text-gray-600">Impossible de charger les paramètres</p>
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
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <CogIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Paramètres</h1>
              <p className="text-purple-100">Configuration du système et préférences utilisateur</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <UserIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Profil</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
              <input
                type="text"
                value={settings.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                onBlur={(e) => handleInputChange('full_name', e.target.value)}
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
                onBlur={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Biographie</label>
              <textarea
                value={settings.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                onBlur={(e) => handleInputChange('bio', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <BellIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Notifications email</h3>
                <p className="text-sm text-gray-600">Recevoir les notifications par email</p>
              </div>
              <input
                type="checkbox"
                checked={settings.email_notifications}
                onChange={() => handleNotificationChange('email_notifications')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Notifications push</h3>
                <p className="text-sm text-gray-600">Notifications dans le navigateur</p>
              </div>
              <input
                type="checkbox"
                checked={settings.push_notifications}
                onChange={() => handleNotificationChange('push_notifications')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Mises à jour documents</h3>
                <p className="text-sm text-gray-600">Notifier lors des modifications de documents</p>
              </div>
              <input
                type="checkbox"
                checked={settings.document_update_notifications}
                onChange={() => handleNotificationChange('document_update_notifications')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Alertes messages</h3>
                <p className="text-sm text-gray-600">Notifier lors de nouveaux messages</p>
              </div>
              <input
                type="checkbox"
                checked={settings.message_notifications}
                onChange={() => handleNotificationChange('message_notifications')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Rappels calendrier</h3>
                <p className="text-sm text-gray-600">Recevoir les rappels d'événements</p>
              </div>
              <input
                type="checkbox"
                checked={settings.calendar_reminders}
                onChange={() => handleNotificationChange('calendar_reminders')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Sécurité</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Authentification à deux facteurs</h3>
                <p className="text-sm text-gray-600">Ajouter une couche de sécurité supplémentaire</p>
              </div>
              <input
                type="checkbox"
                checked={settings.two_factor_enabled}
                onChange={() => handleNotificationChange('two_factor_enabled')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">Expiration de session (minutes)</label>
              <input
                type="number"
                min="5"
                max="480"
                value={settings.session_timeout_minutes}
                onChange={(e) => handleInputChange('session_timeout_minutes', parseInt(e.target.value))}
                onBlur={(e) => handleInputChange('session_timeout_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <KeyIcon className="w-4 h-4 mr-2" />
                Changer le mot de passe
              </button>
            </div>
          </div>
        </div>

        {/* System Preferences */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <GlobeAltIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Préférences système</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-medium text-gray-900 mb-2">Langue</label>
              <select
                value={settings.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">Fuseau horaire</label>
              <select
                value={settings.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Europe/Paris">Paris (GMT+1)</option>
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">New York (GMT-5)</option>
                <option value="America/Chicago">Chicago (GMT-6)</option>
                <option value="America/Los_Angeles">Los Angeles (GMT-8)</option>
                <option value="Europe/London">Londres (GMT+0)</option>
                <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">Format de date</label>
              <select
                value={settings.date_format}
                onChange={(e) => handleInputChange('date_format', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-gray-900 mb-2">Thème</label>
              <select
                value={settings.theme}
                onChange={(e) => handleInputChange('theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="light">Clair</option>
                <option value="dark">Sombre</option>
                <option value="auto">Automatique</option>
              </select>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <UserIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Confidentialité</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-medium text-gray-900 mb-2">Visibilité du profil</label>
              <select
                value={settings.profile_visibility}
                onChange={(e) => handleInputChange('profile_visibility', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="public">Public</option>
                <option value="internal">Utilisateurs internes uniquement</option>
                <option value="private">Privé</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Afficher le statut en ligne</h3>
                <p className="text-sm text-gray-600">Permettre aux autres de voir si vous êtes en ligne</p>
              </div>
              <input
                type="checkbox"
                checked={settings.show_online_status}
                onChange={() => handleNotificationChange('show_online_status')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* System Information (Admin Only) */}
        {user?.role === 'admin' && systemInfo && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-2 mb-6">
              <ChartBarIcon className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Informations système</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{systemInfo.database_stats.total_users}</div>
                  <div className="text-sm text-blue-600">Utilisateurs</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{systemInfo.database_stats.total_documents}</div>
                  <div className="text-sm text-green-600">Documents</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{systemInfo.database_stats.total_folders}</div>
                  <div className="text-sm text-purple-600">Dossiers</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{systemInfo.database_stats.total_events}</div>
                  <div className="text-sm text-orange-600">Événements</div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between mb-2">
                    <span>Statut système:</span>
                    <span className="text-green-600 font-medium">{systemInfo.system_status.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span className="font-medium">{systemInfo.system_status.version}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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

export default Settings;