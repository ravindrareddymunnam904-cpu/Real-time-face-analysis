import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(getStoredToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const safetyTimer = setTimeout(() => {
      if (active) setLoading(false);
    }, 1200);

    async function checkAuth() {
      if (token) {
        try {
          const freshUser = await api.auth.getMe();
          if (active) setUser(freshUser);
        } catch (err) {
          console.warn('Token validation failed:', err.message);
          if (active) {
            setToken(null);
            setUser(null);
          }
        }
      }
      if (active) setLoading(false);
    }
    checkAuth();

    return () => {
      active = false;
      clearTimeout(safetyTimer);
    };
  }, [token]);

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await api.auth.register(name, email, password);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    api.auth.logout();
    setToken(null);
    setUser(null);
  };

  const updateSettings = async (settings) => {
    const res = await api.auth.updateSettings(settings);
    if (user) {
      const updatedUser = { ...user, settings: res.settings };
      setUser(updatedUser);
      setStoredUser(updatedUser);
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        logout,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
