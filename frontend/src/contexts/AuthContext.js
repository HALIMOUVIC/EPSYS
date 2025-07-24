import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios defaults
axios.defaults.baseURL = API;

// Add request interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(30); // Default 30 minutes
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    checkAuthStatus();
    loadSessionTimeout();
    setupActivityTracking();
    startSessionTimer();
  }, []);

  useEffect(() => {
    // Update session timeout when user changes
    if (user) {
      loadSessionTimeout();
    }
  }, [user]);

  const loadSessionTimeout = async () => {
    try {
      if (user) {
        const response = await axios.get('/settings');
        const timeoutMinutes = response.data.session_timeout_minutes || 30;
        setSessionTimeout(timeoutMinutes);
      }
    } catch (error) {
      console.error('Failed to load session timeout:', error);
    }
  };

  const setupActivityTracking = () => {
    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Cleanup function
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  };

  const startSessionTimer = () => {
    const checkSessionExpiry = () => {
      if (user && sessionTimeout > 0) {
        const now = Date.now();
        const timeoutMs = sessionTimeout * 60 * 1000; // Convert minutes to milliseconds
        const timeSinceLastActivity = now - lastActivity;

        if (timeSinceLastActivity >= timeoutMs) {
          console.log(`Session expired after ${sessionTimeout} minutes of inactivity`);
          logout();
          alert(`Votre session a expiré après ${sessionTimeout} minute(s) d'inactivité. Veuillez vous reconnecter.`);
        }
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkSessionExpiry, 30000);
    
    return () => clearInterval(interval);
  };

  const updateSessionTimeout = (newTimeout) => {
    setSessionTimeout(newTimeout);
    setLastActivity(Date.now()); // Reset activity timer when timeout is updated
  };

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
        
        // Verify token is still valid
        const response = await axios.get('/me');
        if (response.data) {
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await axios.post('/login', credentials);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setLastActivity(Date.now()); // Initialize activity tracking
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/register', userData);
      return { success: true, user: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setLastActivity(Date.now());
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    updateSessionTimeout,
    sessionTimeout,
    lastActivity,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};