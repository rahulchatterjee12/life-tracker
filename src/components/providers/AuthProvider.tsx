'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAppDispatch } from '@/lib/hooks';
import { setUserVaultStats } from '@/lib/features/vault/vaultSlice';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isEmailVerified?: boolean;
  vaultBalance: number;
  totalPointsEarned: number;
  currentStreak: number;
  longestStreak?: number;
  streakFreezesCount: number;
  createdAt?: Date | string;
  currencyPeg?: {
    pointsPerUnit: number;
    currencyCode: string;
    symbol: string;
  };
  badges: Array<{
    id: string;
    title: string;
    description: string;
    unlockedAt: Date;
    icon: string;
  }>;
}

export type OtpActionType = 'SIGNUP' | 'FORGOT_PASSWORD' | 'CHANGE_PASSWORD';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<AuthUser>) => void;
  sendOtp: (
    email: string,
    type: OtpActionType,
    name?: string,
    password?: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  verifyOtp: (
    email: string,
    otp: string,
    type: OtpActionType,
    newPassword?: string
  ) => Promise<{ success: boolean; message?: string; error?: string; user?: AuthUser }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: async () => {},
  updateUser: () => {},
  sendOtp: async () => ({ success: false }),
  verifyOtp: async () => ({ success: false }),
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

  const updateUser = useCallback((updated: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      syncToRedux(next);
      return next;
    });
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

  const sendOtp = async (
    email: string,
    type: OtpActionType,
    name?: string,
    password?: string
  ) => {
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type, name, password }),
      });
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          message: data.message,
        };
      }
      return { success: false, error: data.error || 'Failed to send verification code' };
    } catch {
      return { success: false, error: 'Network error. Failed to reach verification server.' };
    }
  };

  const verifyOtp = async (
    email: string,
    otp: string,
    type: OtpActionType,
    newPassword?: string
  ) => {
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, type, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.user) {
          setUser(data.user);
          syncToRedux(data.user);
        }
        return {
          success: true,
          message: data.message,
          user: data.user,
        };
      }
      return { success: false, error: data.error || 'Failed to verify code' };
    } catch {
      return { success: false, error: 'Network error. Failed to verify code.' };
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
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        updateUser,
        sendOtp,
        verifyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
