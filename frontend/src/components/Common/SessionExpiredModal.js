import React, { useEffect, useState } from 'react';
import { ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

const SessionExpiredModal = ({ isOpen, sessionTimeout, onLoginRedirect }) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (isOpen) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onLoginRedirect();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, onLoginRedirect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-pulse">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-t-2xl p-6 text-white">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
              <ExclamationTriangleIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Session Expirée</h2>
              <p className="text-red-100 text-sm">Sécurité - Déconnexion automatique</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="bg-orange-50 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <ClockIcon className="w-10 h-10 text-orange-500" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Votre session a expiré
            </h3>
            
            <p className="text-gray-600 leading-relaxed">
              Votre session a expiré après <span className="font-semibold text-orange-600">{sessionTimeout} minute{sessionTimeout > 1 ? 's' : ''}</span> d'inactivité pour des raisons de sécurité.
            </p>
            
            <p className="text-gray-600 mt-2">
              Veuillez vous reconnecter pour continuer.
            </p>
          </div>

          {/* Countdown */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">
                Redirection automatique dans <span className="font-bold text-orange-600">{countdown}</span> seconde{countdown > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onLoginRedirect}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Se reconnecter maintenant
          </button>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 rounded-b-2xl px-6 py-4">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>EPSys - Système de gestion documentaire sécurisé</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredModal;