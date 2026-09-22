import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { saveAuth, clearAuth, getCurrentUser } from '../utils/helpers';

const AuthContext = createContext(null);

/**
 * AuthProvider
 * Global authentication state for SmartCampus ITCare.
 * Wraps the entire application to provide auth state and actions.
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Verify token on mount / page refresh
  useEffect(() => {
    const token = localStorage.getItem('itcare_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setUser(res.data.user);
      localStorage.setItem('itcare_user', JSON.stringify(res.data.user));
    } catch {
      clearAuth();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const register = useCallback(async (formData) => {
    setError(null);
    const res = await api.post('/auth/register', formData);
    saveAuth(res.data.token, res.data.user);
    setUser(res.data.user);
    return res.data;
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    const res = await api.post('/auth/login', { email, password });
    saveAuth(res.data.token, res.data.user);
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Silently fail — clear local state regardless
    } finally {
      clearAuth();
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    const res = await api.put('/auth/profile', data);
    setUser(res.data.user);
    localStorage.setItem('itcare_user', JSON.stringify(res.data.user));
    return res.data;
  }, []);

  const changePassword = useCallback(async (data) => {
    const res = await api.put('/auth/change-password', data);
    saveAuth(res.data.token, res.data.user);
    setUser(res.data.user);
    return res.data;
  }, []);

  // Role helpers
  const isAdmin   = user?.role === 'admin';
  const isStaff   = user?.role === 'it_staff';
  const isUser    = user?.role === 'user';
  const isLoggedIn = !!user;

  const value = {
    user,
    loading,
    error,
    isLoggedIn,
    isAdmin,
    isStaff,
    isUser,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth hook — consume AuthContext in any component.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
