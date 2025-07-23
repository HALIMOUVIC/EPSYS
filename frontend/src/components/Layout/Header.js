import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Header = ({ title, subtitle }) => {
  const { user } = useAuth();
  const currentTime = format(new Date(), 'HH:mm');
  const currentDate = format(new Date(), 'EEEE, MMM dd, yyyy');

  return (
    <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white p-6 rounded-2xl shadow-lg mb-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">
            {title || `Welcome Back, ${user?.full_name?.split(' ')[0] || 'User'}`}
          </h1>
          <p className="text-purple-100 text-lg">
            {subtitle || 'Streamline your document workflow with ease'}
          </p>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Search */}
          <div className="relative hidden md:block">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300" />
            <input
              type="text"
              placeholder="Search documents..."
              className="pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-white/20 rounded-lg transition-colors">
            <BellIcon className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
              3
            </span>
          </button>

          {/* Time */}
          <div className="text-right hidden lg:block">
            <p className="text-2xl font-bold">{currentTime}</p>
            <p className="text-purple-200 text-sm">{currentDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;