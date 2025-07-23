import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="ml-64 min-h-screen">
        <div className="p-6">
          <Header title={title} subtitle={subtitle} />
          
          <main className="space-y-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;