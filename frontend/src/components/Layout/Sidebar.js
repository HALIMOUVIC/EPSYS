import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  HomeIcon,
  PaperAirplaneIcon,
  InboxIcon,
  DocumentCheckIcon,
  ChartBarIcon,
  FolderIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  DocumentChartBarIcon,
  UsersIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { t, isRTL } = useLanguage();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navigationItems = [
    { name: t('dashboard'), href: '/', icon: HomeIcon },
    { name: t('outgoingMail'), href: '/outgoing-mail', icon: PaperAirplaneIcon },
    { name: t('incomingMail'), href: '/incoming-mail', icon: InboxIcon },
    { name: t('omApproval'), href: '/om-approval', icon: DocumentCheckIcon },
    { name: t('driDepart'), href: '/dri-depart', icon: ChartBarIcon },
    { name: t('fileManager'), href: '/file-manager', icon: FolderIcon },
    { name: t('messages'), href: '/messages', icon: ChatBubbleLeftIcon },
    { name: t('calendar'), href: '/calendar', icon: CalendarIcon },
    { name: t('reports'), href: '/reports', icon: DocumentChartBarIcon },
  ];

  const adminItems = [
    { name: t('userManagement'), href: '/user-management', icon: UsersIcon },
    { name: t('settings'), href: '/settings', icon: CogIcon },
  ];

  const userMenuItems = [
    { name: 'Mon Profil', href: '/profile', icon: 'profile' },
    { name: 'Paramètres', href: '/settings', icon: 'settings', adminOnly: false },
  ];

  const isActiveLink = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="w-64 bg-gradient-to-b from-purple-800 via-purple-700 to-indigo-800 text-white h-screen fixed left-0 top-0 overflow-y-auto shadow-2xl">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-purple-600/30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-purple-700 font-bold text-xl">E</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">EPSys</h1>
            <p className="text-purple-200 text-sm">Document Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2 flex-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActiveLink(item.href)
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-purple-200 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          );
        })}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-purple-300 text-xs font-semibold uppercase tracking-wide px-4">
                Administration
              </p>
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActiveLink(item.href)
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-purple-200 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* User Menu at Bottom */}
      <div className="p-4 border-t border-purple-600/30 relative">
        <div 
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-white/10 hover:text-white cursor-pointer transition-all duration-200"
          onMouseEnter={() => setShowUserMenu(true)}
          onMouseLeave={() => setShowUserMenu(false)}
        >
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-xs text-purple-300 capitalize">{user?.role}</p>
          </div>
        </div>

        {/* User Dropdown Menu */}
        {showUserMenu && (
          <div 
            className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-xl border py-2 z-50"
            onMouseEnter={() => setShowUserMenu(true)}
            onMouseLeave={() => setShowUserMenu(false)}
          >
            <NavLink
              to="/profile"
              className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <UserIcon className="w-4 h-4" />
              <span className="text-sm">{t('profile')}</span>
            </NavLink>
            <button
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span className="text-sm">{t('logout')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;