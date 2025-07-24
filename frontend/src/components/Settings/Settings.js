import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  KeyIcon,
  ChartBarIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const { user, updateSessionTimeout, getRemainingTime, sessionTimeout, forceSessionExpiry, getSessionStatus } = useAuth();
  const { t, changeLanguage, currentLanguage, syncWithUserSettings } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState(null);
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
    
    // Update remaining time every 10 seconds
    const interval = setInterval(() => {
      if (getRemainingTime) {
        setRemainingTime(getRemainingTime());
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [user, getRemainingTime]);

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/settings`);
      setSettings(response.data);
      
      // Sync language with user settings
      if (response.data.language) {
        syncWithUserSettings(response.data.language);
      }
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
    
    // Handle language change specially
    if (key === 'language') {
      changeLanguage(value);
    }
    
    // Handle session timeout update
    if (key === 'session_timeout_minutes') {
      updateSessionTimeout(parseInt(value));
    }
    
    // Update local state immediately for better UX
    setSettings({...settings, [key]: value});
    
    // Debounced update to backend
    clearTimeout(window.settingsTimeout);
    window.settingsTimeout = setTimeout(() => {
      updateSettings({ [key]: value });
    }, 500);
  };

  const handleSignupToggle = async (enabled) => {
    try {
      const response = await axios.put(`${backendUrl}/api/settings/signup-toggle?enabled=${enabled}`);
      showAlert('success', 'Succès', `Inscription ${enabled ? 'autorisée' : 'bloquée'} avec succès`);
      fetchSystemInfo(); // Refresh system info
    } catch (error) {
      console.error('Failed to toggle signup:', error);
      showAlert('error', 'Erreur', 'Échec de la modification du paramètre');
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
                min="1"
                max="480"
                value={settings.session_timeout_minutes}
                onChange={(e) => handleInputChange('session_timeout_minutes', parseInt(e.target.value))}
                onBlur={(e) => handleInputChange('session_timeout_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="mt-2 text-xs text-gray-600">
                <p>La session expirera automatiquement après {settings.session_timeout_minutes} minute(s) d'inactivité.</p>
                {remainingTime !== null && remainingTime > 0 && (
                  <p className="text-blue-600 font-medium mt-1">
                    ⏱️ Temps restant: {remainingTime} minute(s)
                  </p>
                )}
                {remainingTime !== null && remainingTime <= 0 && (
                  <p className="text-red-600 font-medium mt-1">
                    ⚠️ Session expirée - Vous serez déconnecté(e)
                  </p>
                )}
              </div>
              
              {/* Test Button for Session Expiry */}
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={forceSessionExpiry}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  🧪 Tester l'expiration de session
                </button>
                
                <button
                  onClick={() => {
                    const status = getSessionStatus();
                    if (status) {
                      alert(`Debug Info:\n- Timeout: ${status.sessionTimeout}min\n- Last Activity: ${status.lastActivity}\n- Time Since: ${status.timeSinceLastActivity}s\n- Remaining: ${status.remainingSeconds}s\n- Should Expire: ${status.shouldExpire}`);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔍 Debug Session Status
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Test buttons: Red = Force logout, Blue = Show debug info
              </p>
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
              <label className="block font-medium text-gray-900 mb-2">{t('language')}</label>
              <select
                value={currentLanguage}
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

        {/* System Information & Document Counters (Admin Only) */}
        {user?.role === 'admin' && systemInfo && (
          <>
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

            {/* Document Counters Management */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center space-x-2 mb-6">
                <DocumentTextIcon className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900">Gestion des numérotations</h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          DEP-{systemInfo.document_counters?.current_year}-{String(systemInfo.document_counters?.courrier_depart || 0).padStart(3, '0')}
                        </div>
                        <div className="text-sm text-blue-600">Courrier Départ</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {systemInfo.document_counters?.courrier_depart || 0}
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          ARR-{systemInfo.document_counters?.current_year}-{String(systemInfo.document_counters?.courrier_arrive || 0).padStart(3, '0')}
                        </div>
                        <div className="text-sm text-green-600">Courrier Arrivé</div>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {systemInfo.document_counters?.courrier_arrive || 0}
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          DRID-{systemInfo.document_counters?.current_year}-{String(systemInfo.document_counters?.dri_depart || 0).padStart(4, '0')}
                        </div>
                        <div className="text-sm text-purple-600">DRI Départ</div>
                      </div>
                      <div className="text-2xl font-bold text-purple-600">
                        {systemInfo.document_counters?.dri_depart || 0}
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-lg font-bold text-orange-600">
                          OM-{systemInfo.document_counters?.current_year}-{String(systemInfo.document_counters?.om_approval || 0).padStart(3, '0')}
                        </div>
                        <div className="text-sm text-orange-600">Approbation OM</div>
                      </div>
                      <div className="text-2xl font-bold text-orange-600">
                        {systemInfo.document_counters?.om_approval || 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">Auto-remise à zéro des compteurs</h3>
                    <span className="text-sm text-green-600 font-medium">Activé</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Les compteurs de numérotation se remettent automatiquement à zéro au début de chaque nouvelle année.
                    Par exemple: DEP-2025-125 → DEP-2026-001
                  </p>
                </div>
              </div>
            </div>

            {/* System Control */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center space-x-2 mb-6">
                <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900">Contrôle système</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Inscription des nouveaux utilisateurs</h3>
                    <p className="text-sm text-gray-600">Autoriser ou bloquer l'inscription de nouveaux comptes</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium ${systemInfo.system_settings?.signup_enabled ? 'text-green-600' : 'text-red-600'}`}>
                      {systemInfo.system_settings?.signup_enabled ? 'Autorisé' : 'Bloqué'}
                    </span>
                    <input
                      type="checkbox"
                      checked={systemInfo.system_settings?.signup_enabled || false}
                      onChange={(e) => handleSignupToggle(e.target.checked)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
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