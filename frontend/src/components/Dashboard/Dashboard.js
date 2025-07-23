import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  PaperAirplaneIcon,
  InboxIcon,
  ChatBubbleLeftIcon,
  DocumentCheckIcon,
  ChartBarIcon,
  DocumentIcon,
  PlusIcon,
  FolderIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, documentsResponse] = await Promise.all([
        axios.get('/dashboard/stats'),
        axios.get('/documents')
      ]);

      setStats(statsResponse.data);
      setRecentDocuments(documentsResponse.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      name: 'Nouveau OM',
      icon: DocumentIcon,
      color: 'bg-blue-500',
      href: '/documents/new?type=om_approval'
    },
    {
      name: 'Courrier Départ',
      icon: PaperAirplaneIcon,
      color: 'bg-green-500',
      href: '/outgoing-mail'
    },
    {
      name: 'DRI Déport',
      icon: ChartBarIcon,
      color: 'bg-purple-500',
      href: '/dri-deport'
    },
    {
      name: 'Fichiers',
      icon: FolderIcon,
      color: 'bg-gray-600',
      href: '/file-manager'
    },
    {
      name: 'Messages',
      icon: ChatBubbleLeftIcon,
      color: 'bg-indigo-500',
      href: '/messages'
    }
  ];

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getDocumentTypeColor = (type) => {
    const colors = {
      outgoing_mail: 'text-blue-600',
      incoming_mail: 'text-green-600',
      om_approval: 'text-purple-600',
      dri_deport: 'text-indigo-600',
      general: 'text-gray-600'
    };
    return colors[type] || 'text-gray-600';
  };

  const getDocumentTypeName = (type) => {
    const names = {
      outgoing_mail: 'Outgoing Mail',
      incoming_mail: 'Incoming Mail',
      om_approval: 'OM Approval',
      dri_deport: 'DRI Déport',
      general: 'General'
    };
    return names[type] || 'Document';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <PaperAirplaneIcon className="w-5 h-5 text-blue-500" />
                <span className="text-gray-600 text-sm font-medium">Courrier Départ</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.outgoing_mail || 0}</p>
              <div className="flex items-center mt-2">
                <span className="text-blue-600 text-sm font-medium">documents</span>
                <ArrowUpIcon className="w-4 h-4 text-green-500 ml-2" />
                <span className="text-green-600 text-sm">+9%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <InboxIcon className="w-5 h-5 text-green-500" />
                <span className="text-gray-600 text-sm font-medium">Courrier Arrivé</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.incoming_mail || 0}</p>
              <div className="flex items-center mt-2">
                <span className="text-green-600 text-sm font-medium">documents</span>
                <ArrowUpIcon className="w-4 h-4 text-green-500 ml-2" />
                <span className="text-green-600 text-sm">+6%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <ChatBubbleLeftIcon className="w-5 h-5 text-purple-500" />
                <span className="text-gray-600 text-sm font-medium">Messages</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.unread_messages || 0}</p>
              <div className="flex items-center mt-2">
                <span className="text-purple-600 text-sm font-medium">unread</span>
                {stats?.unread_messages > 0 && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Read</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-pink-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <DocumentCheckIcon className="w-5 h-5 text-pink-500" />
                <span className="text-gray-600 text-sm font-medium">Completion</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.efficiency || 0}%</p>
              <div className="flex items-center mt-2">
                <span className="text-pink-600 text-sm font-medium">efficiency</span>
                <ArrowUpIcon className="w-4 h-4 text-green-500 ml-2" />
                <span className="text-green-600 text-sm">5%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="w-5 h-5 text-indigo-500" />
                <span className="text-gray-600 text-sm font-medium">DRI Déport</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.dri_deport || 0}</p>
              <div className="flex items-center mt-2">
                <span className="text-indigo-600 text-sm font-medium">documents</span>
                <ArrowUpIcon className="w-4 h-4 text-green-500 ml-2" />
                <span className="text-green-600 text-sm">10%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <PlusIcon className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.name}
                to={action.href}
                className="flex flex-col items-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-gray-700 font-medium text-center">{action.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Documents Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outgoing Mail */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <PaperAirplaneIcon className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Outgoing Mail</h3>
            </div>
            <Link to="/outgoing-mail" className="text-blue-600 text-sm hover:text-blue-800">
              View All →
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentDocuments
              .filter(doc => doc.document_type === 'outgoing_mail')
              .slice(0, 3)
              .map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(doc.status)}`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            
            {recentDocuments.filter(doc => doc.document_type === 'outgoing_mail').length === 0 && (
              <p className="text-gray-500 text-sm">No outgoing mail documents</p>
            )}
          </div>
        </div>

        {/* DRI Déport */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">DRI Déport</h3>
            </div>
            <Link to="/dri-deport" className="text-indigo-600 text-sm hover:text-indigo-800">
              View All →
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentDocuments
              .filter(doc => doc.document_type === 'dri_deport')
              .slice(0, 3)
              .map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(doc.status)}`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            
            {recentDocuments.filter(doc => doc.document_type === 'dri_deport').length === 0 && (
              <p className="text-gray-500 text-sm">No DRI Déport documents</p>
            )}
          </div>
        </div>

        {/* Incoming Mail */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <InboxIcon className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Incoming Mail</h3>
            </div>
            <Link to="/incoming-mail" className="text-green-600 text-sm hover:text-green-800">
              View All →
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentDocuments
              .filter(doc => doc.document_type === 'incoming_mail')
              .slice(0, 3)
              .map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(doc.status)}`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            
            {recentDocuments.filter(doc => doc.document_type === 'incoming_mail').length === 0 && (
              <p className="text-gray-500 text-sm">No incoming mail documents</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;