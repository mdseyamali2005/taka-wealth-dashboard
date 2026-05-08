import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:3000/api';

interface User {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  budget: number;
  subscriptionStatus: string; // "free" | "active" | "canceled" | "past_due"
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('taka_token'));
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;
  const isSubscribed = user?.subscriptionStatus === 'active';

  // Helper: make authenticated requests
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }, [token]);

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authFetch(`${API_BASE}/auth/me`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token invalid
        setToken(null);
        setUser(null);
        localStorage.removeItem('taka_token');
      }
    } catch {
      // Network error — don't clear session
    }
  }, [token, authFetch]);

  // Check token on mount
  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('taka_token', token);
    } else {
      localStorage.removeItem('taka_token');
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
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
    setUser(data.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
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
    setUser(data.user);
  };

  const googleLogin = async (credential: string) => {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Google login failed');
    }

    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('taka_token');
    localStorage.removeItem('taka_expenses');
  };

  return (
    <AuthContext.Provider value={{
      user, token, isAuthenticated, isSubscribed, isLoading,
      login, register, googleLogin, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Helper: make authenticated API calls
 */
export function useAuthFetch() {
  const { token } = useAuth();

  return useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type for FormData (let browser set multipart boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
  }, [token]);
}
