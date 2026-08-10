// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, authApi, setSessionExpiredHandler } from '../lib/apiClient';
import { residentTokenStorage } from '../lib/tokenStorage';
import { deleteFcmToken, getFcmToken } from '../services/pushNotifications';

type AuthContextType = {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  /**
   * `login`/`logout` no longer take a `role` argument - this whole app IS the
   * resident role, so there's nothing to disambiguate. Compare with the old
   * shared AuthContext which had to juggle three roles' tokens at once.
   */
  login: (token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    setSessionExpiredHandler(() => setIsAuthenticated(false));
    return () => setSessionExpiredHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await residentTokenStorage.getAccessToken();
        if (token) {
          setIsAuthenticated(true);
          refreshBackendFcmToken().catch(() => undefined);
        }
      } finally {
        setIsAuthLoading(false);
      }
    })();
  }, []);

  const refreshBackendFcmToken = async () => {
    const fcmToken = await getFcmToken();
    if (!fcmToken) return;
    await api.patch('/resident-profile', { fcm_token: fcmToken });
  };

  const login = async (token: string, refreshToken: string) => {
    await residentTokenStorage.setTokens({ accessToken: token, refreshToken });
    setIsAuthenticated(true);
    refreshBackendFcmToken().catch(() => undefined);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.warn('Could not clear backend session on logout:', error);
    }
    try {
      await deleteFcmToken();
    } catch (error) {
      console.warn('Could not delete local FCM token:', error);
    }
    await residentTokenStorage.clear();
    setIsAuthenticated(false);
  };

  const getToken = () => residentTokenStorage.getAccessToken();

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAuthLoading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
