import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

// Language translations
const translations = {
  fr: {
    // Navigation
    dashboard: 'Dashboard',
    outgoingMail: 'Courrier Départ',
    incomingMail: 'Courrier Arrivé',
    omApproval: 'Approbation OM',
    driDepart: 'DRI Départ',
    fileManager: 'File Manager',
    messages: 'Messages',
    calendar: 'Calendar',
    profile: 'Mon Profil',
    reports: 'Reports',
    userManagement: 'User Management',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    
    // Settings
    notifications: 'Notifications',
    security: 'Sécurité',
    systemPreferences: 'Préférences système',
    language: 'Langue',
    theme: 'Thème',
    timezone: 'Fuseau horaire',
    dateFormat: 'Format de date',
    systemControl: 'Contrôle système',
    
    // Profile
    personalInfo: 'Informations personnelles',
    privacy: 'Confidentialité',
    changePassword: 'Changer le mot de passe',
    
    // Common
    save: 'Enregistrer',
    cancel: 'Annuler',
    success: 'Succès',
    error: 'Erreur',
    loading: 'Chargement...'
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    outgoingMail: 'Outgoing Mail',
    incomingMail: 'Incoming Mail',
    omApproval: 'OM Approval',
    driDepart: 'DRI Depart',
    fileManager: 'File Manager',
    messages: 'Messages',
    calendar: 'Calendar',
    profile: 'My Profile',
    reports: 'Reports',
    userManagement: 'User Management',
    settings: 'Settings',
    logout: 'Logout',
    
    // Settings
    notifications: 'Notifications',
    security: 'Security',
    systemPreferences: 'System Preferences',
    language: 'Language',
    theme: 'Theme',
    timezone: 'Timezone',
    dateFormat: 'Date Format',
    systemControl: 'System Control',
    
    // Profile
    personalInfo: 'Personal Information',
    privacy: 'Privacy',
    changePassword: 'Change Password',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    success: 'Success',
    error: 'Error',
    loading: 'Loading...'
  },
  ar: {
    // Navigation
    dashboard: 'لوحة التحكم',
    outgoingMail: 'البريد الصادر',
    incomingMail: 'البريد الوارد',
    omApproval: 'موافقة OM',
    driDepart: 'مغادرة DRI',
    fileManager: 'مدير الملفات',
    messages: 'الرسائل',
    calendar: 'التقويم',
    profile: 'ملفي الشخصي',
    reports: 'التقارير',
    userManagement: 'إدارة المستخدمين',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    
    // Settings
    notifications: 'الإشعارات',
    security: 'الأمان',
    systemPreferences: 'تفضيلات النظام',
    language: 'اللغة',
    theme: 'المظهر',
    timezone: 'المنطقة الزمنية',
    dateFormat: 'تنسيق التاريخ',
    systemControl: 'التحكم في النظام',
    
    // Profile
    personalInfo: 'المعلومات الشخصية',
    privacy: 'الخصوصية',
    changePassword: 'تغيير كلمة المرور',
    
    // Common
    save: 'حفظ',
    cancel: 'إلغاء',
    success: 'نجح',
    error: 'خطأ',
    loading: 'جاري التحميل...'
  },
  es: {
    // Navigation
    dashboard: 'Panel de Control',
    outgoingMail: 'Correo Saliente',
    incomingMail: 'Correo Entrante',
    omApproval: 'Aprobación OM',
    driDepart: 'Salida DRI',
    fileManager: 'Gestor de Archivos',
    messages: 'Mensajes',
    calendar: 'Calendario',
    profile: 'Mi Perfil',
    reports: 'Informes',
    userManagement: 'Gestión de Usuarios',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    
    // Settings
    notifications: 'Notificaciones',
    security: 'Seguridad',
    systemPreferences: 'Preferencias del Sistema',
    language: 'Idioma',
    theme: 'Tema',
    timezone: 'Zona Horaria',
    dateFormat: 'Formato de Fecha',
    systemControl: 'Control del Sistema',
    
    // Profile
    personalInfo: 'Información Personal',
    privacy: 'Privacidad',
    changePassword: 'Cambiar Contraseña',
    
    // Common
    save: 'Guardar',
    cancel: 'Cancelar',
    success: 'Éxito',
    error: 'Error',
    loading: 'Cargando...'
  }
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('fr');
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    // Load language from localStorage or user settings
    const savedLanguage = localStorage.getItem('userLanguage') || 'fr';
    setCurrentLanguage(savedLanguage);
    setIsRTL(savedLanguage === 'ar');
    
    // Apply RTL to document
    if (savedLanguage === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = savedLanguage;
    }
  }, []);

  const changeLanguage = (newLanguage) => {
    setCurrentLanguage(newLanguage);
    setIsRTL(newLanguage === 'ar');
    localStorage.setItem('userLanguage', newLanguage);
    
    // Apply RTL to document
    if (newLanguage === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = newLanguage;
    }
  };

  const t = (key) => {
    return translations[currentLanguage]?.[key] || translations.fr[key] || key;
  };

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    isRTL
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};