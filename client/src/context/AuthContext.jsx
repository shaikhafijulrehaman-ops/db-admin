import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('erp_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user session exists in localStorage
    const savedUser = localStorage.getItem('erp_user');
    const savedToken = localStorage.getItem('erp_token');
    
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  // API Call Helper with automatic Token attachment
  const apiRequest = async (endpoint, options = {}) => {
    const baseUrl = 'http://localhost:5000/api';
    const url = `${baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      // If unauthorized (token expired), log user out
      if (response.status === 401) {
        logout();
        throw new Error(data.message || 'Session expired. Please login again.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error('API Request error:', error.message);
      throw error;
    }
  };

  const login = async (username, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.success) {
        localStorage.setItem('erp_token', data.token);
        localStorage.setItem('erp_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data.user;
      }
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setToken(null);
    setUser(null);
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      const data = await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      if (data.success) {
        // Update mustChangePassword flag in local state if successful
        const updatedUser = { ...user, mustChangePassword: false };
        localStorage.setItem('erp_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      return data;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updatePassword,
    apiRequest,
    isAuthenticated: !!token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
