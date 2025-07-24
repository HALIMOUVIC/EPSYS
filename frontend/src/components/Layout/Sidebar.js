import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Courrier Départ', href: '/outgoing-mail', icon: PaperAirplaneIcon },
    { name: 'Courrier Arrivé', href: '/incoming-mail', icon: InboxIcon },
    { name: 'Approbation OM', href: '/om-approval', icon: DocumentCheckIcon },
    { name: 'DRI Départ', href: '/dri-depart', icon: ChartBarIcon },
    { name: 'File Manager', href: '/file-manager', icon: FolderIcon },
    { name: 'Messages', href: '/messages', icon: ChatBubbleLeftIcon },
    { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
    { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
  ];

  const adminItems = [
    { name: 'User Management', href: '/user-management', icon: UsersIcon },
    { name: 'Paramètres', href: '/settings', icon: CogIcon },
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

      {/* User Info */}
      <div className="p-4 border-b border-purple-600/30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{user?.full_name}</p>
            <p className="text-purple-200 text-sm capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
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

        {/* Logout */}
        <div className="pt-4">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-purple-200 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;