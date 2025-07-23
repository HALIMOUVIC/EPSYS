import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  PlusIcon,
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const Messages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessage, setNewMessage] = useState({
    subject: '',
    content: '',
    recipient_id: ''
  });

  useEffect(() => {
    fetchMessages();
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get('/messages');
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/messages', newMessage);
      setNewMessage({ subject: '', content: '', recipient_id: '' });
      setShowNewMessage(false);
      fetchMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await axios.put(`/messages/${messageId}/read`);
      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const getMessageClass = (message) => {
    const baseClass = "p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50";
    if (message.recipient_id === user.id && !message.is_read) {
      return `${baseClass} border-purple-200 bg-purple-50`;
    }
    return `${baseClass} border-gray-200 bg-white`;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ChatBubbleLeftIcon className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600">Communication center</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowNewMessage(true)}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Message
        </button>
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send New Message</h3>
            
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To
                </label>
                <select
                  value={newMessage.recipient_id}
                  onChange={(e) => setNewMessage({ ...newMessage, recipient_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select recipient</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your message"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <PaperAirplaneIcon className="w-4 h-4 inline mr-2" />
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewMessage(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <ChatBubbleLeftIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-600">Start a conversation by sending a message.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={getMessageClass(message)}
                  onClick={() => {
                    if (message.recipient_id === user.id && !message.is_read) {
                      markAsRead(message.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {message.sender_id === user.id ? 'You' : 'User'}
                        </span>
                        {message.recipient_id === user.id && !message.is_read && (
                          <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-base font-medium text-gray-900 mb-2">
                        {message.subject}
                      </h4>
                      
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                        {message.content}
                      </p>
                      
                      <div className="flex items-center text-xs text-gray-500">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {new Date(message.created_at).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {message.sender_id === user.id ? (
                        <span className="text-xs text-gray-500">Sent</span>
                      ) : (
                        <span className="text-xs text-gray-500">Received</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;