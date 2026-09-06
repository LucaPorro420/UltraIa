// social-connect.ts — capability `social-connect` (conexiones sociales + inicio de sesión)
//
// Implementación ORIGINAL de UltraIa (iter-179). Estado unificado de conexión por red,
// guías de login/OAuth y contrato de sesión de navegador para navegación autenticada.
//
// REGLAS DE SEGURIDAD (vinculantes):
// - Este módulo NUNCA persiste ni imprime valores de tokens: solo nombres de variables
//   de entorno y listas de faltantes.
// - Los tokens viven en el env del proceso o en la DB cifrada de `domain/connections.ts`.
// - La sesión de navegador (cookies) la importa el HUMANO (cookies de SU sesión); el agente
//   jamás pide ni guarda passwords. Ver `docs/CANALES-CONFIG-2026.md` § conexión.

import { z } from 'zod';

// ─── Red social ─────────────────────────────────────────────────────────────

export const socialAuthSchema = z.enum(['oauth2', 'token', 'webhook', 'app']);
export type SocialAuth = z.infer<typeof socialAuthSchema>;

export interface SocialNetwork {
  /** Id estable (coincide con PublishPlatform donde aplica). */
  id: string;
  nombre: string;
  auth: SocialAuth;
  /** Variables de entorno requeridas (nombres, NUNCA valores). */
  envVars: string[];
  /** Dónde el humano crea la credencial / inicia sesión. */
  loginUrl: string;
  scopes: string[];
  /** ¿Tiene adapter de publicación en `publish.ts`? */
  publish: boolean;
  notas: string;
}

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  { id: 'telegram', nombre: 'Telegram', auth: 'token', envVars: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'], loginUrl: 'https://t.me/BotFather', scopes: [], publish: true, notas: 'GRATIS total, sin OAuth ni aprobación. BotFather → /newbot → token; el chat id con @userinfobot.' },
  { id: 'discord', nombre: 'Discord', auth: 'webhook', envVars: ['DISCORD_WEBHOOK_URL'], loginUrl: 'https://discord.com', scopes: [], publish: true, notas: 'Webhook de canal (Ajustes canal → Integraciones → Webhooks). Límite 10 MiB (25 con boost).' },
  { id: 'slack', nombre: 'Slack', auth: 'token', envVars: ['SLACK_BOT_TOKEN', 'SLACK_CHANNEL'], loginUrl: 'https://api.slack.com/apps', scopes: ['files:write', 'chat:write'], publish: true, notas: 'Crear app → bot token xoxb- → invitar el bot al canal. Límite 1 GiB.' },
  { id: 'youtube', nombre: 'YouTube', auth: 'oauth2', envVars: ['YOUTUBE_ACCESS_TOKEN'], loginUrl: 'https://console.cloud.google.com', scopes: ['youtube.upload', 'youtube.force-ssl'], publish: true, notas: 'OAuth2 del canal propio (YouTube Data API v3). Analytics gratis con YOUTUBE_API_KEY.' },
  { id: 'tiktok', nombre: 'TikTok', auth: 'app', envVars: ['TIKTOK_ACCESS_TOKEN'], loginUrl: 'https://developers.tiktok.com', scopes: ['video.upload'], publish: true, notas: 'Content Posting API: Direct Post en 2 pasos. Requiere aprobación humana de la app.' },
  { id: 'x', nombre: 'X', auth: 'oauth2', envVars: ['X_ACCESS_TOKEN'], loginUrl: 'https://developer.x.com', scopes: ['tweet.write', 'media.write'], publish: true, notas: 'Free tier: 17 posts/24h POR APP (verificado 2026). Upload chunked INIT/APPEND/FINALIZE.' },
  { id: 'instagram', nombre: 'Instagram', auth: 'oauth2', envVars: ['IG_ACCESS_TOKEN', 'IG_USER_ID'], loginUrl: 'https://developers.facebook.com', scopes: ['instagram_business_content_publish', 'instagram_basic'], publish: true, notas: 'Graph API v21 (contenedor REELS → media_publish). Sin app review para negocio propio (Standard Access).' },
  { id: 'threads', nombre: 'Threads', auth: 'oauth2', envVars: ['THREADS_ACCESS_TOKEN', 'THREADS_USER_ID'], loginUrl: 'https://developers.facebook.com', scopes: ['threads_basic', 'threads_content_publish'], publish: true, notas: 'Graph API v1.0 (threads → threads_publish). Texto cap 500.' },
  { id: 'facebook', nombre: 'Facebook', auth: 'oauth2', envVars: ['FB_ACCESS_TOKEN', 'FB_PAGE_ID'], loginUrl: 'https://developers.facebook.com', scopes: ['pages_manage_posts', 'pages_read_engagement'], publish: true, notas: 'Publica en Páginas (no perfiles). Page token vía Graph API Explorer o login OAuth.' },
  { id: 'linkedin', nombre: 'LinkedIn', auth: 'oauth2', envVars: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN'], loginUrl: 'https://developer.linkedin.com', scopes: ['w_member_social', 'rw_organization_admin'], publish: true, notas: 'Assets API (registerUpload + PUT) + UGC Posts. Author URN persona u organización.' },
  { id: 'reddit', nombre: 'Reddit', auth: 'oauth2', envVars: ['REDDIT_ACCESS_TOKEN', 'REDDIT_SUBREDDIT'], loginUrl: 'https://www.reddit.com/prefs/apps', scopes: ['submit'], publish: true, notas: 'App tipo script del usuario. Publica en el subreddit configurado.' },
  { id: 'pinterest', nombre: 'Pinterest', auth: 'oauth2', envVars: ['PINTEREST_ACCESS_TOKEN', 'PINTEREST_BOARD_ID'], loginUrl: 'https://developers.pinterest.com', scopes: ['boards:write', 'pins:write'], publish: true, notas: 'Token de la app + board destino.' },
  { id: 'whatsapp', nombre: 'WhatsApp', auth: 'token', envVars: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_TO'], loginUrl: 'https://developers.facebook.com', scopes: [], publish: true, notas: 'Cloud API (gratis dev). Marketing NO gratis en producción ($0.025/msg US).' },
  { id: 'zernio', nombre: 'Zernio', auth: 'token', envVars: ['ZERNIO_API_KEY'], loginUrl: 'https://zernio.com', scopes: [], publish: true, notas: 'Fan-out unificado a 16 plataformas con una sola key.' },
];

export function getNetwork(id: string): SocialNetwork | undefined {
  return SOCIAL_NETWORKS.find((n) => n.id === id);
}

// ─── Estado de conexión ─────────────────────────────────────────────────────

export interface NetworkStatus {
  id: string;
  nombre: string;
  connected: boolean;
  /** Nombres de vars faltantes (nunca valores). */
  missing: string[];
  publishReady: boolean;
}

export interface SocialStatusReport {
  redes: NetworkStatus[];
  conectadas: number;
  total: number;
  listasParaPublicar: string[];
}

/** Estado de conexión por red. `env` inyectable (default process.env) para tests. */
export function socialStatus(env: Record<string, string | undefined> = process.env): SocialStatusReport {
  const redes: NetworkStatus[] = SOCIAL_NETWORKS.map((n) => {
    const missing = n.envVars.filter((v) => !env[v]);
    const connected = missing.length === 0;
    return { id: n.id, nombre: n.nombre, connected, missing, publishReady: connected && n.publish };
  });
  return {
    redes,
    conectadas: redes.filter((r) => r.connected).length,
    total: redes.length,
    listasParaPublicar: redes.filter((r) => r.publishReady).map((r) => r.id),
  };
}

// ─── Guía de login ──────────────────────────────────────────────────────────

export interface LoginGuide {
  id: string;
  nombre: string;
  auth: SocialAuth;
  pasos: string[];
  loginUrl: string;
  envVars: string[];
  scopes: string[];
}

/** Guía paso a paso para que el HUMANO conecte una red. Falla soft si el id no existe. */
export function loginGuide(id: string): { ok: boolean; guide?: LoginGuide; error?: string } {
  const n = getNetwork(id);
  if (!n) return { ok: false, error: `red desconocida: ${id} (validas: ${SOCIAL_NETWORKS.map((s) => s.id).join(', ')})` };
  const pasos =
    n.auth === 'token' || n.auth === 'webhook'
      ? [
          `1. Abre ${n.loginUrl} en tu navegador e inicia sesión con TU cuenta.`,
          `2. Crea la credencial (${n.notas.split('.')[0]}).`,
          `3. Copia ${n.envVars.join(' y ')} a tu archivo .env LOCAL (jamás al repo).`,
          '4. Verifica con la tool social_connect acción status.',
        ]
      : [
          `1. Abre ${n.loginUrl} y crea/entra a tu app (${n.notas.split('.')[0]}).`,
          `2. Activa los scopes: ${n.scopes.length > 0 ? n.scopes.join(', ') : '(no aplica)'}.`,
          '3. Completa el flujo OAuth2 y copia el access token a tu .env LOCAL (jamás al repo).',
          '4. Verifica con la tool social_connect acción status.',
        ];
  return { ok: true, guide: { id: n.id, nombre: n.nombre, auth: n.auth, pasos, loginUrl: n.loginUrl, envVars: n.envVars, scopes: n.scopes } };
}

// ─── Sesión de navegador (navegación autenticada) ───────────────────────────

export const BROWSER_PROFILE_DIR = '.ultraia/browser/profile';
export const BROWSER_SESSION_FILE = '.ultraia/browser/session.json';

export const sessionCookieSchema = z.object({
  domain: z.string().min(3).max(253),
  name: z.string().min(1).max(200),
  value: z.string().min(1).max(8000),
  path: z.string().max(200).optional(),
  secure: z.boolean().optional(),
});
export type SessionCookie = z.infer<typeof sessionCookieSchema>;

/** Valida cookies aportadas por el humano. Nunca acepta passwords ni tokens en campos extra. */
export function validateSessionCookies(input: unknown): { ok: boolean; cookies?: SessionCookie[]; errors?: string[] } {
  const parsed = z.array(sessionCookieSchema).min(1).max(200).safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'cookies'}: ${i.message}`) };
  }
  return { ok: true, cookies: parsed.data };
}

export interface StorageStateCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Lax';
}

/** Construye un storageState de Playwright (determinista, byte-exacto). No toca disco. */
export function buildStorageState(cookies: SessionCookie[]): string {
  const mapped: StorageStateCookie[] = cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain.startsWith('.') ? c.domain : `.${c.domain}`,
    path: c.path ?? '/',
    expires: -1,
    httpOnly: false,
    secure: c.secure ?? true,
    sameSite: 'Lax' as const,
  }));
  return JSON.stringify({ cookies: mapped, origins: [] });
}

// ─── Plan de login con navegador ────────────────────────────────────────────

export interface BrowserLoginStep {
  accion: 'navigate' | 'espera-humana' | 'verificar';
  detalle: string;
  url?: string;
}

/** Plan de acciones para `browser_run`: navega al login y deja la sesión al humano. */
export function planBrowserLogin(id: string): { ok: boolean; steps?: BrowserLoginStep[]; error?: string } {
  const n = getNetwork(id);
  if (!n) return { ok: false, error: `red desconocida: ${id}` };
  return {
    ok: true,
    steps: [
      { accion: 'navigate', detalle: `Abrir la página de login de ${n.nombre}`, url: n.loginUrl },
      { accion: 'espera-humana', detalle: 'El HUMANO inicia sesión en el navegador (el agente nunca opera con tus claves). Luego exporta las cookies a .ultraia/browser/session.json (gitignored).' },
      { accion: 'verificar', detalle: `Validar con social_connect status y navegar libremente con browser_run sobre ${n.loginUrl}` },
    ],
  };
}
