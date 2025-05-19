// client/src/context/AuthContext.js - Context for authentication state management

import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(true); // Default true until we check
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if the authentication system is initialized on load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await api.getAuthStatus();
        setIsInitialized(response.data.initialized);
        
        // If not initialized, we don't need to check authentication
        if (!response.data.initialized) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        // Check if we have auth in localStorage
        const savedAuth = localStorage.getItem('isAuthenticated');
        if (savedAuth === 'true') {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setError('Failed to check auth status');
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // Initialize password for the first time
  const initializePassword = async (password) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.initializePassword(password);
      
      if (response.data.initialized) {
        setIsInitialized(true);
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
      }
      
      setIsLoading(false);
      return { success: true };
    } catch (error) {
      console.error('Error initializing password:', error);
      setError(error.response?.data?.message || 'Failed to initialize password');
      setIsLoading(false);
      return { success: false, error: error.response?.data?.message || 'Failed to initialize password' };
    }
  };
  
  // Login function
  const login = async (password) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.login(password);
      
      if (response.data.isAuthenticated) {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        setIsLoading(false);
        return { success: true };
      }
      
      setIsLoading(false);
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'Login failed');
      setIsLoading(false);
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  };
  
  // Logout function
  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };
  
  // Change password function
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.changePassword(currentPassword, newPassword);
      
      setIsLoading(false);
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Error changing password:', error);
      setError(error.response?.data?.message || 'Failed to change password');
      setIsLoading(false);
      return { success: false, error: error.response?.data?.message || 'Failed to change password' };
    }
  };
  
  // Context value
  const value = {
    isAuthenticated,
    isInitialized,
    isLoading,
    error,
    login,
    logout,
    initializePassword,
    changePassword
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 