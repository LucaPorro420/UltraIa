/**
 * AuthProvider — estado de sesión de la app móvil.
 * login/register llaman a la API REST (/api/auth/*), guardan el token en SecureStore
 * y exponen el usuario. Logout limpia token. El arranque valida con /api/auth/me.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, getToken, setToken } from '@/api/client';
import type { AuthUser, LoginResponse, MeResponse } from '@/api/types';

const TOKEN_KEY = 'ultraia_session_token';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;
        const me = await api.get<MeResponse>('/api/auth/me', token);
        setUser(me.user);
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const res = await api.post<LoginResponse>('/api/auth/login', { email, password });
        await setToken(res.token);
        setUser(res.user);
      },
      register: async (email, password, name) => {
        const res = await api.post<LoginResponse>('/api/auth/register', { email, password, name });
        await setToken(res.token);
        setUser(res.user);
      },
      logout: async () => {
        await setToken(null);
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

export { getToken };
