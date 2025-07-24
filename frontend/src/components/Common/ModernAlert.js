import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ModernAlert = {
  show: (type, title, message, duration = 5000) => {
    const event = new CustomEvent('showModernAlert', {
      detail: { type, title, message, duration }
    });
    window.dispatchEvent(event);
  },

  success: (title, message, duration) => ModernAlert.show('success', title, message, duration),
  error: (title, message, duration) => ModernAlert.show('error', title, message, duration),
  warning: (title, message, duration) => ModernAlert.show('warning', title, message, duration),
  info: (title, message, duration) => ModernAlert.show('info', title, message, duration),

  confirm: (title, message) => {
    return new Promise((resolve) => {
      const event = new CustomEvent('showModernConfirm', {
        detail: { title, message, resolve }
      });
      window.dispatchEvent(event);
    });
  }
};

const ModernAlertContainer = () => {
  const [alerts, setAlerts] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    const handleShowAlert = (event) => {
      const { type, title, message, duration } = event.detail;
      const id = Date.now() + Math.random();
      
      const newAlert = { id, type, title, message };
      setAlerts(prev => [...prev, newAlert]);

      if (duration > 0) {
        setTimeout(() => {
          setAlerts(prev => prev.filter(alert => alert.id !== id));
        }, duration);
      }
    };

    const handleShowConfirm = (event) => {
      const { title, message, resolve } = event.detail;
      setConfirmModal({ title, message, resolve });
    };

    window.addEventListener('showModernAlert', handleShowAlert);
    window.addEventListener('showModernConfirm', handleShowConfirm);

    return () => {
      window.removeEventListener('showModernAlert', handleShowAlert);
      window.removeEventListener('showModernConfirm', handleShowConfirm);
    };
  }, []);

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-600" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />;
      case 'info':
        return <InformationCircleIcon className="w-6 h-6 text-blue-600" />;
      default:
        return <InformationCircleIcon className="w-6 h-6 text-gray-600" />;
    }
  };

  const getAlertColors = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const handleConfirm = (result) => {
    if (confirmModal) {
      confirmModal.resolve(result);
      setConfirmModal(null);
    }
  };

  return (
    <>
      {/* Alert Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`${getAlertColors(alert.type)} border rounded-lg shadow-lg p-4 transform transition-all duration-300 animate-pulse`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold">{alert.title}</h4>
                <p className="text-sm mt-1 opacity-90">{alert.message}</p>
              </div>
              <button
                onClick={() => removeAlert(alert.id)}
                className="flex-shrink-0 ml-2 opacity-60 hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform scale-100 transition-transform">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{confirmModal.title}</h3>
                </div>
              </div>
              
              <p className="text-gray-600 mb-6 leading-relaxed">{confirmModal.message}</p>
              
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => handleConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { ModernAlert, ModernAlertContainer };