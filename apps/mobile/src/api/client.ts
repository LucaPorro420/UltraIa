/**
 * Cliente HTTP de la app móvil. Autenticación: header `x-ultraia-session` con el token
 * de sesión (createSession del web). El token vive en SecureStore.
 *
 * Base URL: EXPO_PUBLIC_API_URL si está definida; si no, deriva el host del dev server
 * de Expo Go (hostUri) y usa el puerto 3000 (web dev). En emulador Android el host
 * del dev server ya es la IP LAN de la máquina (funciona directo).
 */
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const TOKEN_KEY = 'ultraia_session_token';
const AUTH_HEADER = 'x-ultraia-session';

export function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }
  return 'http://localhost:3000';
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  const t = token ?? (await getToken());
  if (t) headers[AUTH_HEADER] = t;

  const res = await fetch(`${resolveBaseUrl()}${path}`, { ...init, headers });
  if (res.status === 401) {
    // Sesión inválida/expirada: el AuthProvider escucha y hace logout.
    throw new ApiError(401, 'Sesión expirada');
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* body no JSON */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>(path, { method: 'GET' }, token),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }, token),
  del: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'DELETE', body: body === undefined ? undefined : JSON.stringify(body) }, token),
};
