//! Mobile orchestrator client — connects Expo app to the unified orchestrator.
// Tracks learning events, syncs state, and provides real-time metrics.
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const TOKEN_KEY = 'ultraia_session_token';

/** Resolve the orchestrator API base URL. */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }
  return 'http://localhost:3000';
}

/** Get auth headers. */
async function getHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'x-ultraia-session': token } : {}),
  };
}

/** Register the mobile app with the orchestrator. */
export async function registerMobileApp(): Promise<boolean> {
  try {
    const base = resolveBaseUrl();
    const headers = await getHeaders();
    const res = await fetch(`${base}/api/orchestrator`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'register_app',
        app: {
          type: 'mobile',
          id: `mobile-${Date.now()}`,
          status: 'connected',
          lastSeen: Date.now(),
          version: '1.0.0',
          capabilities: ['learning', 'metrics', 'sync'],
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Track a learning event from mobile. */
export async function trackLearningEvent(event: {
  category: 'improvement' | 'bug' | 'feature' | 'insight' | 'error';
  description: string;
  source?: string;
  impact: 'low' | 'medium' | 'high';
}): Promise<boolean> {
  try {
    const base = resolveBaseUrl();
    const headers = await getHeaders();
    const res = await fetch(`${base}/api/orchestrator`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'track_learning',
        event: {
          id: `mobile-learn-${Date.now()}`,
          app: 'mobile',
          timestamp: Date.now(),
          ...event,
          verified: false,
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Get dashboard summary from orchestrator. */
export async function getDashboard(): Promise<Record<string, unknown> | null> {
  try {
    const base = resolveBaseUrl();
    const headers = await getHeaders();
    const res = await fetch(`${base}/api/orchestrator/dashboard`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Record a metric from mobile. */
export async function recordMetric(metric: {
  name: string;
  value: number;
  unit: string;
}): Promise<boolean> {
  try {
    const base = resolveBaseUrl();
    const headers = await getHeaders();
    const res = await fetch(`${base}/api/orchestrator`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'record_metric',
        metric: { ...metric, app: 'mobile' },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
