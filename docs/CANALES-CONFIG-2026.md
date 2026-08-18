# CANALES-CONFIG-2026 — Guía operativa de configuración de los 8 canales AutoPub

> Iteración 44 (17/08/2026). Complementa `docs/APIS-GRATIS-2026.md` (qué es gratis, verificado)
> con el CÓMO de este proyecto: variables exactas, dónde sacar cada token y cómo probar.
> Todos los canales son OPCIONALES — sin valor, los adapters fallan-soft con razón clara
> (`publish_submit` devuelve `{platform, ok:false, error}` por plataforma).

## Resumen de variables (raíz `.env`)

| Canal | Variables | Coste | Dónde se obtiene |
|---|---|---|---|
| YouTube Shorts | `YOUTUBE_ACCESS_TOKEN` | gratis (canal propio) | OAuth2 scopes `youtube.upload` + `youtube.force-ssl` |
| TikTok | `TIKTOK_ACCESS_TOKEN` | gratis (app propia) | developers.tiktok.com → app → tokens |
| X | `X_ACCESS_TOKEN` | gratis (Free tier, 17 posts/24h POR APP) | OAuth2 user context, scope `tweet.write media.write offline.access` |
| Instagram Reels | `IG_ACCESS_TOKEN` + `IG_USER_ID` | gratis (negocio propio) | Meta Graph API v21, Standard Access (sin app review para negocio propio) |
| Threads | `THREADS_ACCESS_TOKEN` + `THREADS_USER_ID` | gratis (negocio propio) | Meta Graph API v1.0 |
| Telegram | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | **GRATIS total** | @BotFather → nuevo bot → token; chat: `getUpdates` o canal |
| Discord | `DISCORD_WEBHOOK_URL` | gratis | Canal → Ajustes → Integraciones → Webhooks → Nuevo |
| Slack | `SLACK_BOT_TOKEN` + `SLACK_CHANNEL` | gratis | api.slack.com/apps → OAuth & Permissions → `xoxb-...` |

## Paso a paso por canal

### 1. Telegram (el más fácil — GRATIS, sin OAuth ni aprobación)
1. En Telegram, habla con **@BotFather** → `/newbot` → nombre + username → te da el token.
2. Crea un canal (o usa un grupo) y añade el bot como ADMIN.
3. `TELEGRAM_CHAT_ID`: para un canal es `@username_del_canal` (o el id numérico negativo
   consultando `https://api.telegram.org/bot<TOKEN>/getUpdates` tras enviar un mensaje).
4. Límites: video ≤50 MB, caption ≤1024 chars, mensajes ilimitados, uso comercial permitido.

### 2. Discord (webhook — sin bot, sin OAuth)
1. En el canal deseado: **Ajustes del canal → Integraciones → Webhooks → Nuevo webhook**.
2. Copia la URL: `https://discord.com/api/webhooks/{id}/{token}` → `DISCORD_WEBHOOK_URL`.
3. Límites: archivo ≤10 MiB gratis (25 MiB con boost Nivel 1), caption ≤2000 chars,
   respuesta 204 = éxito.

### 3. Slack (bot app)
1. api.slack.com/apps → **Create New App** → From scratch → tu workspace.
2. **OAuth & Permissions** → Scopes: `files:write` (+ `chat:write` si quieres texto) →
   **Install to Workspace** → copia el token `xoxb-...` → `SLACK_BOT_TOKEN`.
3. `SLACK_CHANNEL`: `#nombre-del-canal` (invita al bot al canal).
4. Límites: archivo ≤1 GiB, initial_comment ≤4000 chars. Endpoint: `files.upload`.

### 4. YouTube Shorts (OAuth2 del canal propio)
1. Google Cloud Console → proyecto → habilita **YouTube Data API v3** → credenciales OAuth2.
2. Scopes: `youtube.upload`, `youtube.force-ssl`. Flujo para TV/desktop → access token.
3. `YOUTUBE_ACCESS_TOKEN` (corto plazo — para uso real hacer refresh flow; el adapter usa
   el token tal cual, fail-soft si caduca).
4. El upload es **resumable** (POST → Location → PUT). Metadatos bilingües es/ar incluidos.

### 5. TikTok (Direct Post 2 pasos)
1. developers.tiktok.com → crear app → **Content Posting API**.
2. Obtén el access token de la app (flujo OAuth con scopes `video.upload`).
3. `TIKTOK_ACCESS_TOKEN`. El adapter hace init → PUT al upload_url.
4. Nota: la Content Posting API puede requerir revisión humana según el uso.

### 6. X (API v2 — Free tier: 17 posts/24h POR APP, verificado 17/08/2026)
1. developer.x.com → app → **User authentication settings** → OAuth2 con
   scopes `tweet.write`, `media.write`, `offline.access`.
2. Completa el flujo OAuth2 user context → `X_ACCESS_TOKEN`.
3. El adapter sube el video con chunking (5 MiB por APPEND) y publica el tweet.

### 7. Instagram Reels + 8. Threads (Meta — sin app review para negocio propio)
1. business.facebook.com → convierte tu cuenta a **cuenta profesional/negocio** →
   conéctala a una **Meta Business Portfolio**.
2. developers.facebook.com → app → **Instagram Graph API** → **Add Instagram Account**
   → genera el token de largo plazo (`IG_ACCESS_TOKEN`) + `IG_USER_ID`.
3. Threads: activa Threads en el mismo app → `THREADS_ACCESS_TOKEN` + `THREADS_USER_ID`.
4. Verificado 17/08/2026: Standard Access es suficiente para publicar en TU negocio
   (docs de Meta updated 2026-06-30) — no hace falta app review para eso.
5. Límites: IG caption ≤2200 chars (container flow REELS), Threads texto ≤500 chars.

## Cómo probar un canal sin tocar código

La cola + la tool están disponibles vía:
- **API**: `POST /api/publications` con `{paquete, canal}` (canales válidos:
  `youtube_shorts | tiktok | instagram | blog | telegram | discord | slack`) → video = DRAFT
  con aprobación humana; luego `POST /api/publications/[id]/approve` y el calendario
  (`POST /api/publications/publish-due`) lo publica.
- **Tool de agente**: `publish_submit` con `toYoutube/toTiktok/toX/toInstagram/toThreads/
  toTelegram/toDiscord/toSlack` — devuelve un resultado por plataforma; si una no está
  configurada, `ok:false` con la razón exacta (p.ej. `DISCORD_WEBHOOK_URL no configurado`).
- **Prueba rápida de un adapter aislado** (Node):

```js
// node -e  (en packages/core tras npm run build o con vite-node)
import { createDiscordAdapter } from './src/tools/discord.js';
const a = createDiscordAdapter({ webhookUrl: process.env.DISCORD_WEBHOOK_URL });
const res = await a.publish({ videoPath: 'video-final.mp4', metadata: { title: 'Prueba UltraIa' } });
console.log(res); // { platform: 'discord', ok: true, url: ... }
```

## Regla de aprobación humana (recordatorio)

La cola `Publication` auto-aprueba solo **texto/blog**; los canales de video
(`youtube_shorts`, `tiktok`, `instagram`, `telegram`, `discord`, `slack`) quedan **DRAFT**
hasta aprobación humana (`POST /api/publications/[id]/approve`, ADMIN o creador) — decisión
del usuario 15/08/2026 (textos auto; video/imagen por paquete).

## Pendientes documentados

- LinkedIn: pendiente de verificar API gratis (CLOUD-FREE-2026.md).
- X Free tier: 17 posts/24h por app — programar con el calendario teniéndolo en cuenta.
- YouTube OAuth refresh: para producción real implementar refresh flow (hoy token directo).