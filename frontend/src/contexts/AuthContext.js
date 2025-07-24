import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
  
  // Use useRef to avoid re-renders when updating last activity
  const lastActivityRef = useRef(Date.now());
  const sessionTimerRef = useRef(null);
  const activityEventsSetup = useRef(false);

  useEffect(() => {
    checkAuthStatus();
    loadSessionTimeout();
    setupActivityTracking();
    startSessionTimer();
    
    return () => {
      // Cleanup on unmount
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
      cleanupActivityTracking();
    };
  }, []);

  useEffect(() => {
    // Update session timeout when user changes
    if (user) {
      loadSessionTimeout();
    }
  }, [user]);

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

  const updateLastActivity = () => {
    lastActivityRef.current = Date.now();
  };

  const setupActivityTracking = () => {
    if (activityEventsSetup.current) return;
    
    // Track various user activities without causing re-renders
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateLastActivity, { passive: true, capture: true });
    });
    
    activityEventsSetup.current = true;
  };

  const cleanupActivityTracking = () => {
    if (!activityEventsSetup.current) return;
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.removeEventListener(event, updateLastActivity, { capture: true });
    });
    
    activityEventsSetup.current = false;
  };

  const startSessionTimer = () => {
    // Clear existing timer
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }
    
    console.log(`Starting session timer with timeout: ${sessionTimeout} minutes`);
    
    // Check session expiry every 5 seconds for very responsive logout
    sessionTimerRef.current = setInterval(() => {
      if (user && sessionTimeout > 0) {
        const now = Date.now();
        const timeoutMs = sessionTimeout * 60 * 1000; // Convert minutes to milliseconds
        const timeSinceLastActivity = now - lastActivityRef.current;
        const remainingMs = timeoutMs - timeSinceLastActivity;
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

        console.log(`🔍 Session check: ${Math.floor(timeSinceLastActivity / 1000)}s since last activity, timeout: ${sessionTimeout}min, remaining: ${remainingMinutes}min`);

        if (timeSinceLastActivity >= timeoutMs) {
          console.log(`🚨 SESSION EXPIRED! ${sessionTimeout} minutes of inactivity reached - TRIGGERING LOGOUT NOW`);
          
          // Clear the timer before logout to prevent multiple calls
          if (sessionTimerRef.current) {
            clearInterval(sessionTimerRef.current);
            sessionTimerRef.current = null;
          }
          
          // Perform logout immediately
          handleSessionExpiry();
        }
      } else {
        console.log(`⏸️ Session timer paused - user: ${!!user}, timeout: ${sessionTimeout}`);
      }
    }, 5000); // Check every 5 seconds for faster response
  };

  const handleSessionExpiry = () => {
    console.log('handleSessionExpiry called - starting logout process');
    
    // Clean logout
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    
    // Show alert
    alert(`Votre session a expiré après ${sessionTimeout} minute(s) d'inactivité. Veuillez vous reconnecter.`);
    
    // Force redirect to login page
    window.location.href = '/login';
  };

  const updateSessionTimeout = (newTimeout) => {
    setSessionTimeout(newTimeout);
    lastActivityRef.current = Date.now(); // Reset activity timer when timeout is updated
    
    // Restart session timer with new timeout
    startSessionTimer();
  };

  const getRemainingTime = () => {
    if (!user || sessionTimeout <= 0) return null;
    
    const now = Date.now();
    const timeoutMs = sessionTimeout * 60 * 1000;
    const timeSinceLastActivity = now - lastActivityRef.current;
    const remainingMs = timeoutMs - timeSinceLastActivity;
    
    if (remainingMs <= 0) return 0;
    
    return Math.ceil(remainingMs / (60 * 1000)); // Return remaining minutes
  };

  const login = async (credentials) => {
    try {
      const response = await axios.post('/login', credentials);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      lastActivityRef.current = Date.now(); // Initialize activity tracking
      
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
    console.log('Manual logout called');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    lastActivityRef.current = Date.now();
    
    // Redirect to login
    window.location.href = '/login';
  };

  const forceSessionExpiry = () => {
    console.log('Force session expiry triggered for testing');
    handleSessionExpiry();
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    updateSessionTimeout,
    sessionTimeout,
    getRemainingTime,
    forceSessionExpiry, // For testing
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};