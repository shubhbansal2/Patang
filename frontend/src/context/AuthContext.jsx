import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!token && !!user;

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const userData = { _id: data._id, name: data.name, email: data.email, roles: data.roles, captainOf: data.captainOf };
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(data.token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, confirmPassword) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password, confirmPassword });
      return { success: true, data };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email, otp) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp });
      const userData = { _id: data._id, name: data.name, email: data.email, roles: data.roles, captainOf: data.captainOf };
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(data.token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Verification failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, register, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
