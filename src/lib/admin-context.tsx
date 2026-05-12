import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3000/api';

interface Admin {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface AdminContextType {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('taka_admin_token'));
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!admin && !!token;

  const adminFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }, [token]);

  // Check token on mount
  useEffect(() => {
    if (token) {
      adminFetch(`${API_BASE}/admin/me`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setAdmin(data.admin);
          } else {
            setToken(null);
            setAdmin(null);
            localStorage.removeItem('taka_admin_token');
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist token
  useEffect(() => {
    if (token) {
      localStorage.setItem('taka_admin_token', token);
    } else {
      localStorage.removeItem('taka_admin_token');
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }

    const data = await res.json();
    setToken(data.token);
    setAdmin(data.admin);
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await fetch(`${API_BASE}/admin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }

    const data = await res.json();
    setToken(data.token);
    setAdmin(data.admin);
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('taka_admin_token');
  };

  return (
    <AdminContext.Provider value={{
      admin, token, isAuthenticated, isLoading,
      login, register, logout, adminFetch,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
