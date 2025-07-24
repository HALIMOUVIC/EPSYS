import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    all_day: false,
    color: '#3b82f6',
    location: '',
    attendees: '',
    reminder_minutes: 15,
    category: 'general'
  });

  // Alert system
  const [alert, setAlert] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchEvents();
  }, [currentDate, view]);

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const showConfirm = (title, message, onConfirm, onCancel = null) => {
    setConfirmDialog({
      title,
      message,
      onConfirm,
      onCancel: onCancel || (() => setConfirmDialog(null))
    });
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on current view
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();
      
      const response = await axios.get(`${backendUrl}/api/calendar/events`, {
        params: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        }
      });
      
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      showAlert('error', 'Erreur', 'Impossible de charger les événements');
    } finally {
      setLoading(false);
    }
  };

  const getViewStartDate = () => {
    const date = new Date(currentDate);
    switch (view) {
      case 'month':
        date.setDate(1);
        date.setDate(date.getDate() - date.getDay());
        break;
      case 'week':
        date.setDate(date.getDate() - date.getDay());
        break;
      case 'day':
        break;
      default:
        break;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getViewEndDate = () => {
    const date = new Date(currentDate);
    switch (view) {
      case 'month':
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
        date.setDate(date.getDate() + (6 - date.getDay()));
        break;
      case 'week':
        date.setDate(date.getDate() + 6);
        break;
      case 'day':
        break;
      default:
        break;
    }
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + direction);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction * 7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + direction);
        break;
      default:
        break;
    }
    setCurrentDate(newDate);
  };

  const openEventModal = (date = null, event = null) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        title: event.title,
        description: event.description || '',
        start_date: new Date(event.start_date).toISOString().slice(0, 16),
        end_date: new Date(event.end_date).toISOString().slice(0, 16),
        all_day: event.all_day,
        color: event.color,
        location: event.location || '',
        attendees: event.attendees.join(', '),
        reminder_minutes: event.reminder_minutes,
        category: event.category
      });
    } else {
      setEditingEvent(null);
      const defaultStart = date || new Date();
      const defaultEnd = new Date(defaultStart);
      defaultEnd.setHours(defaultStart.getHours() + 1);
      
      setEventForm({
        title: '',
        description: '',
        start_date: defaultStart.toISOString().slice(0, 16),
        end_date: defaultEnd.toISOString().slice(0, 16),
        all_day: false,
        color: '#3b82f6',
        location: '',
        attendees: '',
        reminder_minutes: 15,
        category: 'general'
      });
    }
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setEditingEvent(null);
    setEventForm({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      all_day: false,
      color: '#3b82f6',
      location: '',
      attendees: '',
      reminder_minutes: 15,
      category: 'general'
    });
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    
    if (!eventForm.title.trim()) {
      showAlert('error', 'Erreur', 'Le titre de l\'événement est requis');
      return;
    }

    try {
      const eventData = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || null,
        start_date: new Date(eventForm.start_date).toISOString(),
        end_date: new Date(eventForm.end_date).toISOString(),
        all_day: eventForm.all_day,
        color: eventForm.color,
        location: eventForm.location.trim() || null,
        attendees: eventForm.attendees ? eventForm.attendees.split(',').map(a => a.trim()).filter(a => a) : [],
        reminder_minutes: parseInt(eventForm.reminder_minutes),
        category: eventForm.category
      };

      if (editingEvent) {
        await axios.put(`${backendUrl}/api/calendar/events/${editingEvent.id}`, eventData);
        showAlert('success', 'Succès', 'Événement mis à jour avec succès');
      } else {
        await axios.post(`${backendUrl}/api/calendar/events`, eventData);
        showAlert('success', 'Succès', 'Événement créé avec succès');
      }

      closeEventModal();
      fetchEvents();
    } catch (error) {
      console.error('Failed to save event:', error);
      const errorMessage = error.response?.data?.detail || 'Échec de la sauvegarde de l\'événement';
      showAlert('error', 'Erreur', errorMessage);
    }
  };

  const deleteEvent = (event) => {
    showConfirm(
      'Supprimer l\'événement',
      `Êtes-vous sûr de vouloir supprimer l'événement "${event.title}" ?`,
      async () => {
        try {
          await axios.delete(`${backendUrl}/api/calendar/events/${event.id}`);
          setConfirmDialog(null);
          showAlert('success', 'Succès', 'Événement supprimé avec succès');
          fetchEvents();
        } catch (error) {
          console.error('Failed to delete event:', error);
          const errorMessage = error.response?.data?.detail || 'Échec de la suppression de l\'événement';
          showAlert('error', 'Erreur', errorMessage);
          setConfirmDialog(null);
        }
      }
    );
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      const checkDate = new Date(date);
      
      // Check if the date falls within the event's date range
      checkDate.setHours(0, 0, 0, 0);
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(23, 59, 59, 999);
      
      return checkDate >= eventStart && checkDate <= eventEnd;
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const renderMonthView = () => {
    const startDate = getViewStartDate();
    const days = [];
    const daysInWeek = 7;
    const weeksToShow = 6;

    // Day headers
    const dayHeaders = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (let week = 0; week < weeksToShow; week++) {
      for (let day = 0; day < daysInWeek; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (week * 7) + day);
        
        const isCurrentMonth = date.getMonth() === currentDate.getMonth();
        const isToday = new Date().toDateString() === date.toDateString();
        const dayEvents = getEventsForDate(date);

        days.push(
          <div
            key={`${week}-${day}`}
            className={`min-h-24 p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
              !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
            onClick={() => openEventModal(date)}
          >
            <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
              {date.getDate()}
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event, index) => (
                <div
                  key={event.id}
                  className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 group relative`}
                  style={{ backgroundColor: event.color + '20', color: event.color, borderLeft: `3px solid ${event.color}` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEventModal(null, event);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate flex-1">{event.title}</span>
                    {(event.created_by === user?.id || user?.role === 'admin') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent(event);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all ml-1"
                      >
                        <TrashIcon className="w-3 h-3 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{dayEvents.length - 3} autres
                </div>
              )}
            </div>
          </div>
        );
      }
    }

    return (
      <div className="bg-white rounded-xl shadow-lg">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {dayHeaders.map(day => (
            <div key={day} className="p-3 text-center font-medium text-gray-700 bg-gray-50">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startDate = getViewStartDate();
    const days = [];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayHeaders = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="p-3 bg-gray-50"></div>
          {days.map((day, index) => {
            const isToday = new Date().toDateString() === day.toDateString();
            return (
              <div key={index} className={`p-3 text-center font-medium ${isToday ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-700'}`}>
                <div>{dayHeaders[index]}</div>
                <div className={`text-lg ${isToday ? 'font-bold' : ''}`}>{day.getDate()}</div>
              </div>
            );
          })}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
              <div className="p-2 text-sm text-gray-500 bg-gray-50 border-r border-gray-200">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {days.map((day, dayIndex) => {
                const dayEvents = getEventsForDate(day).filter(event => {
                  const eventHour = new Date(event.start_date).getHours();
                  return eventHour === hour;
                });
                
                return (
                  <div
                    key={dayIndex}
                    className="p-1 min-h-12 border-r border-gray-100 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      const clickDate = new Date(day);
                      clickDate.setHours(hour);
                      openEventModal(clickDate);
                    }}
                  >
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        className="text-xs p-1 mb-1 rounded truncate cursor-pointer hover:opacity-80 group relative"
                        style={{ backgroundColor: event.color + '20', color: event.color, borderLeft: `2px solid ${event.color}` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEventModal(null, event);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate flex-1">{event.title}</span>
                          {(event.created_by === user?.id || user?.role === 'admin') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEvent(event);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all ml-1"
                            >
                              <TrashIcon className="w-3 h-3 text-red-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate).sort((a, b) => 
      new Date(a.start_date) - new Date(b.start_date)
    );
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Événements du {formatDate(currentDate)}
          </h3>
          
          {dayEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Aucun événement prévu pour cette journée</p>
              <button
                onClick={() => openEventModal(currentDate)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Ajouter un événement
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className="p-4 rounded-lg border-l-4 hover:shadow-md transition-shadow cursor-pointer"
                  style={{ borderColor: event.color, backgroundColor: event.color + '10' }}
                  onClick={() => openEventModal(null, event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          {event.all_day ? 'Toute la journée' : `${formatTime(event.start_date)} - ${formatTime(event.end_date)}`}
                        </div>
                        {event.location && (
                          <div className="flex items-center">
                            <MapPinIcon className="w-4 h-4 mr-1" />
                            {event.location}
                          </div>
                        )}
                        {event.attendees.length > 0 && (
                          <div className="flex items-center">
                            <UserGroupIcon className="w-4 h-4 mr-1" />
                            {event.attendees.length} participant(s)
                          </div>
                        )}
                      </div>
                    </div>
                    {(event.created_by === user?.id || user?.role === 'admin') && (
                      <div className="flex space-x-1 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEventModal(null, event);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEvent(event);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hour grid for day view */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-4 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">Grille horaire</h4>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {hours.map(hour => {
              const hourEvents = dayEvents.filter(event => {
                const eventHour = new Date(event.start_date).getHours();
                return eventHour === hour;
              });
              
              return (
                <div key={hour} className="flex border-b border-gray-100">
                  <div className="w-16 p-2 text-sm text-gray-500 bg-gray-50 border-r border-gray-200">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div
                    className="flex-1 p-2 min-h-12 cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      const clickDate = new Date(currentDate);
                      clickDate.setHours(hour);
                      openEventModal(clickDate);
                    }}
                  >
                    {hourEvents.map(event => (
                      <div
                        key={event.id}
                        className="text-sm p-2 mb-1 rounded cursor-pointer hover:opacity-80 group relative"
                        style={{ backgroundColor: event.color + '20', color: event.color, borderLeft: `3px solid ${event.color}` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEventModal(null, event);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate flex-1">{event.title}</span>
                          {(event.created_by === user?.id || user?.role === 'admin') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEvent(event);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all ml-1"
                            >
                              <TrashIcon className="w-3 h-3 text-red-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
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

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">{confirmDialog.title}</h3>
            </div>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <CalendarIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Calendrier</h1>
              <p className="text-blue-100">Gérez vos événements et rendez-vous</p>
            </div>
          </div>
          
          <button
            onClick={() => openEventModal()}
            className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Nouvel événement
          </button>
        </div>
      </div>

      {/* Navigation and View Controls */}
      <div className="bg-white rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-semibold text-gray-900">
              {view === 'month' && currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              {view === 'week' && `Semaine du ${getViewStartDate().toLocaleDateString('fr-FR')}`}
              {view === 'day' && currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
            
            <button
              onClick={() => navigateDate(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Aujourd'hui
            </button>
            
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['month', 'week', 'day'].map((viewType) => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`px-3 py-1 rounded transition-colors ${
                    view === viewType
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {viewType === 'month' ? 'Mois' : viewType === 'week' ? 'Semaine' : 'Jour'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Views */}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl mx-4 my-8 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
              </h3>
              <button
                onClick={closeEventModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleEventSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date/heure début *
                  </label>
                  <input
                    type="datetime-local"
                    value={eventForm.start_date}
                    onChange={(e) => setEventForm({...eventForm, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date/heure fin *
                  </label>
                  <input
                    type="datetime-local"
                    value={eventForm.end_date}
                    onChange={(e) => setEventForm({...eventForm, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="all-day"
                  checked={eventForm.all_day}
                  onChange={(e) => setEventForm({...eventForm, all_day: e.target.checked})}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="all-day" className="ml-2 text-sm text-gray-700">
                  Événement sur toute la journée
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lieu
                  </label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur
                  </label>
                  <input
                    type="color"
                    value={eventForm.color}
                    onChange={(e) => setEventForm({...eventForm, color: e.target.value})}
                    className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participants (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={eventForm.attendees}
                  onChange={(e) => setEventForm({...eventForm, attendees: e.target.value})}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rappel (minutes avant)
                  </label>
                  <select
                    value={eventForm.reminder_minutes}
                    onChange={(e) => setEventForm({...eventForm, reminder_minutes: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Pas de rappel</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 heure</option>
                    <option value={1440}>1 jour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégorie
                  </label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({...eventForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">Général</option>
                    <option value="meeting">Réunion</option>
                    <option value="deadline">Échéance</option>
                    <option value="holiday">Congé</option>
                    <option value="personal">Personnel</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeEventModal}
                  className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {editingEvent ? 'Mettre à jour' : 'Créer l\'événement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;