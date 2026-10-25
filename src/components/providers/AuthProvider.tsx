'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAppDispatch } from '@/lib/hooks';
import { setUserVaultStats } from '@/lib/features/vault/vaultSlice';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  vaultBalance: number;
  totalPointsEarned: number;
  currentStreak: number;
  streakFreezesCount: number;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    unlockedAt: Date;
    icon: string;
  }>;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync to Redux
  const syncToRedux = useCallback((userData: AuthUser) => {
    dispatch(
      setUserVaultStats({
        vaultBalance: userData.vaultBalance,
        totalPointsEarned: userData.totalPointsEarned,
        streakFreezesCount: userData.streakFreezesCount,
        badges: userData.badges,
      })
    );
  }, [dispatch]);

  // Fetch session on load
  useEffect(() => {
    let ignore = false;

    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!ignore && data?.success && data.user) {
          setUser(data.user);
          syncToRedux(data.user);
        }
      })
      .catch(() => {
        // Not logged in or offline
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [syncToRedux]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        syncToRedux(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch {
      return { success: false, error: 'Network error. Could not connect to server.' };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        syncToRedux(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Signup failed' };
    } catch {
      return { success: false, error: 'Network error. Could not connect to server.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

