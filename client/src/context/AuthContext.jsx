import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setWorkspace(res.data.workspace);
      }
    } catch (err) {
      setUser(null);
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      setUser(res.data.user);
      setWorkspace(res.data.workspace);
      return res.data;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('token');
    setUser(null);
    setWorkspace(null);
  };

  return (
    <AuthContext.Provider value={{ user, workspace, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
