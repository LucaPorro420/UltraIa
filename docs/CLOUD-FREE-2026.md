# Cloud Gratuito 2026 — Guía de registro, deploy y app reviews

> Fecha: 17/08/2026 · Datos de free tiers **verificados por búsqueda web** (fuentes en cada
> sección; fechas de verificación de cada fuente entre paréntesis). Revisar
> `supabase.com/pricing` / `cloudflare.com/plans` antes de arquitectar sobre límites exactos.

## Por qué esto existe

El proyecto UltraIa corre 100% local y gratis hoy (keyless-first). Este documento es la hoja de
ruta para llevarlo a **dominios y clouds gratuitos** en 3 pasos: (1) registra las cuentas (~5 min
por servicio), (2) pega las claves en `.env` (plantillas al final), (3) desplegamos. El agente
**no puede crear cuentas por ti** (requieren tu email + verificación) — pero todo el código y la
config quedan listos para que el deploy sea pegar y listo.

## Tabla de stacks (verificada 17/08/2026)

| Proveedor | Plan gratis | Qué incluye | Alerta | Fuente (verificación) |
|---|---|---|---|---|
| **Cloudflare** | Free | Workers 100k req/día, D1 5 GB, R2 10 GB con **egress $0**, KV, Pages, dominio `.pages.dev`, C3 | Ninguna: estable, sin cláusula de uso comercial | buildmvpfast.com blog (2026-07-04) |
| **Vercel** | Hobby | 100 GB bandwidth, ~1M invocations, 6000 build min, 10s serverless timeout | ⚠️ **Cláusula "no commercial use"** — solo personal/learning | promptstoproduct.com (2026-05-06) |
| **Supabase** | Free | 500 MB Postgres, 1 GB files, 5 GB egress, 50k MAU, 500k edge invocations/mes, 2 proyectos | ⚠️ **Auto-pausa tras 7 días de inactividad** + sin backups | automationatlas.io (2026-06-08) / stackrev.net (2026-07-27) |
| **Render** | Hobby | 512 MB RAM, 100 GB bandwidth, 500 build min | ⚠️ **Spin-down 15 min** + cold start 30-60 s + **Postgres gratis expira a los 30 días** | agentdeals.dev (2026-06-22) |

**Recomendación (coste mínimo absoluto): Cloudflare todo-en-uno** — Pages (web Next.js
standalone), Worker (API + webhooks, port del server Python :8000), D1 (cola Publication/
TopicBrief), R2 (media/videos con egress $0) y dominio `.pages.dev`. El render/screenflow queda
local en tu máquina. Infra ≈ **$0/mes**, sin proceso siempre-activo.

---

## Parte 1 — Cloudflare (recomendado, 10 min)

1. **Registra**: ve a `dash.cloudflare.com/sign-up` → email + contraseña + verificación por email.
2. **Activa R2**: en el dashboard → *R2* → *Create bucket* → nombre `ultraia-media` (región `auto`).
   - *Settings* → *Public access* → crea un dominio público `media.<tu-usuario>.pages.dev` o usa
     el endpoint custom. El public access es lo que da las URLs hotlinkables con egress $0.
3. **API token**: *My Profile* → *API Tokens* → *Create Token* → plantilla "Edit Cloudflare Workers"
   (o "R2 Admin" para el bucket). Guarda el token en `.env` como `CLOUDFLARE_R2_TOKEN`.
4. **Deploy del Worker** (ya incluido en `cloudflare/`): instala wrangler una vez
   (`npm i -g wrangler`), luego:
   ```
   cd cloudflare
   npx wrangler login          # abre el navegador — autorización con tu cuenta
   npx wrangler secret put CLOUD_TOKEN   # pega el token R2 (se guarda cifrado)
   npx wrangler deploy         # publica el Worker en tu dominio .workers.dev
   ```
   El Worker expone `GET/PUT/DELETE /files*` contra R2 con `Authorization: Bearer CLOUD_TOKEN`.
   Copia la URL resultante (`https://cloud-<tu-usuario>.workers.dev`) a `.env` como
   `CLOUDFLARE_R2_WORKER_URL`.
5. **Dominio gratuito**: tu Worker ya tiene `<sub>.workers.dev`. Para `.pages.dev` (web), sube la
   app Next.js con `npx wrangler pages deploy out` (o conecta el repo en *Workers & Pages* →
   *Create* → *Pages* → *Connect to Git*). Cada deploy te da `https://<proyecto>.pages.dev`.

Límites free: 100k requests/día por Worker, 10 GB R2 (egress $0), 5 GB D1, 500 KV ops/día.
Para un canal de publicación de 1-2 posts/día + webhooks, sobra de largo.

## Parte 2 — Vercel (alternativa/previews)

1. `vercel.com` → *Sign up* → GitHub (o email) → *Continue*.
2. `npm i -g vercel` → en la raíz del repo: `npx vercel` → acepta defaults (framework Next.js
   autodetectado). Env vars: `npx vercel env add SUPABASE_URL` (etc.) y `npx vercel env pull`.
3. ⚠️ **Hobby = sin uso comercial** (solo personal/learning). Úsalo para **previews** del producto
   y demos; el producto real va en Cloudflare Pages. Fuente: promptstoproduct.com (2026-05-06).

## Parte 3 — Supabase (opcional: DB Postgres + auth + storage)

1. `supabase.com` → *Start your project* → login GitHub → *New project* → región + contraseña DB.
2. Te da `SUPABASE_URL` (https://<ref>.supabase.co) y la clave `service_role` (*Settings* → *API*).
   Son 2 de los 2 proyectos free permitidos por organización.
3. ⚠️ **Auto-pausa**: un proyecto free con 0 requests durante 7 días se pausa solo (los datos se
   conservan; se reactiva a mano o con un keep-alive: un cron diario que llame al healthcheck).
   Fuentes: automationatlas.io (2026-06-08), jetadmin.io (2026-07-24).
4. Migración de la cola: `packages/core` ya usa Prisma; el datasource apunta a SQLite local —
   cambiar `DATABASE_URL` a la de Supabase y `npx prisma db push`. (Prisma + Postgres ya soportado.)

## Parte 4 — Render (no recomendado para webhooks)

Free: 512 MB RAM + spin-down a los 15 min (cold start 30-60 s) + **Postgres free expira a los
30 días**. Sirve para demos, no para el webhook server siempre-activo. Fuente:
agentdeals.dev (2026-06-22). Si algún día necesitas un proceso siempre-vivo sin sleep:
Render Starter $7/mes o el Worker con Cron Triggers de Cloudflare (gratis).

---

## Parte 5 — App reviews y APIs de publicación (verificado 17/08/2026)

| Plataforma | Publicar en tu propia cuenta | Review necesario | Límites free | Fuente |
|---|---|---|---|---|
| **YouTube Shorts** | ✅ OAuth 2.0 (ya implementado en `publish.ts`, RF-12) | ❌ No (consent screen sin verificación para tu canal) | 10k units/día (Data API gratis) | docs oficiales |
| **TikTok** | ✅ Direct Post 2 pasos (ya implementado) | ⚠️ **Sí: solicitud de aprobación** del Content Posting API (trámite humano en developers.tiktok.com → "Request Access") | 0 (API gratuita con límite de 10 videos/día aprox.) | developers.tiktok.com |
| **Meta / Instagram** | ✅ Instagram Graph API — cuenta **Business/Creator** + FB Page vinculada | ❌ **NO para negocio propio**: "My app is only for a business I own or manage" → Standard Access → App Review **Not required** (docs oficiales, updated 2026-06-30). El review de 2-4 semanas solo aplica a Advanced Access (SaaS de terceros) | Permisos `instagram_business_content_publish` + `instagram_basic`; límite de publicación **duplicado en 2026** (100 posts/día aprox.); container flow: create → poll → publish | developers.facebook.com (2026-06-30), netrows.com (2026-06-26), blotato.com (2026-08-06) |
| **X API v2** | ✅ v2 create tweet | ❌ No (developer project + OAuth) | **17 posts/24h POR APP** (el "1,500/mes" era API 1.1 legacy; Basic $100/mes para más) | devcommunity.x.com (2024-11 + 2026-01-23) |
| **LinkedIn** | ⚠️ Pendiente de verificar (Community Management API / Share on LinkedIn) | Posible (verificación de la org) | — | — |

**Conclusión práctica**: para las cuentas propias del negocio, **solo TikTok exige un trámite
humano** (solicitud de acceso). Meta NO exige app review en el escenario "negocio que posees".
X free sirve para 1 post/día. El orden de canales recomendado queda: YouTube + TikTok (ya
implementados) → Instagram (sin review, solo permisos) → X (1/día) → blog propio (sin API).

### Checklist app review (lo que el humano debe hacer — el agente prepara todo lo demás)
- [ ] **TikTok**: developers.tiktok.com → app → *Content Posting API* → solicitar acceso con
      screencast del flujo (2-3 días típico). El adaptador `createTikTokAdapter` ya está listo.
- [ ] **Meta**: developers.facebook.com → *Create App* (Business) → añadir *Instagram Graph API* →
      *Add permissions*: `instagram_business_content_publish` + `instagram_basic` → conectar la
      cuenta IG Business/Creator + FB Page. Sin App Review (Standard Access, negocio propio).
      Nota: Instagram Login (sin FB Page) es la ruta nueva de 2026 para cuentas solo-IG.
- [ ] **X**: developer.x.com → crear app → OAuth 2.0 → token en `X_ACCESS_TOKEN`/`X_ACCESS_TOKEN_SECRET`.
- [ ] **YouTube**: Google Cloud Console → credenciales OAuth → `YOUTUBE_ACCESS_TOKEN` (refresh).

---

## Parte 6 — Plantilla `.env` (copiar a `.env`; el repo ignora env files)

```env
# ── Cloudflare (recomendado) ───────────────────────────────────────────
CLOUDFLARE_R2_WORKER_URL=https://cloud-<tu-usuario>.workers.dev   # tras `wrangler deploy`
CLOUDFLARE_R2_TOKEN=<API token con scope R2/Workers>               # dash.cloudflare.com → API Tokens
CLOUDFLARE_R2_PUBLIC_URL=https://media.<tu-usuario>.pages.dev      # Public access del bucket (opcional)

# ── Supabase (opcional: DB Postgres + storage) ────────────────────────
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key — secreto>
# DATABASE_URL=<postgres de Supabase>  # solo si migras la cola Prisma de SQLite a Postgres

# ── Vercel (previews) ─────────────────────────────────────────────────
# VERCEL_URL=https://<proyecto>.vercel.app   # autodetectada en deploy

# ── Canales (AutoPub) ─────────────────────────────────────────────────
YOUTUBE_ACCESS_TOKEN=<token OAuth YouTube>
TIKTOK_ACCESS_TOKEN=<token Direct Post>
# IG/Meta: IG_ACCESS_TOKEN=<token página con ig_business_content_publish>
# X: X_ACCESS_TOKEN=<...>
```

## Parte 7 — Presupuesto mensual ($0) y al crecer

| Recurso | Free | Al crecer (primera escala) |
|---|---|---|
| Web + API | Cloudflare Pages/Workers | Workers Paid $5/mes (10M req) |
| Media (R2) | 10 GB | $0.015/GB-mes + egress $0 |
| DB (D1/Supabase) | 5 GB / 500 MB | D1 $5/mes o Supabase Pro $25/mes |
| Webhooks | Worker Cron (gratis) | igual |

Regla del proyecto: **keyless-first y degradación elegante** — si un provider se cae o expira,
la app sigue funcionando con el fallback local. Ningún límite free debe tumbar el producto.

## Referencias verificadas (17/08/2026)
- Cloudflare free stack: buildmvpfast.com/blog (Cloudflare Workers/Hono/D1/R2, 2026-07-04).
- Vercel Hobby + cláusula no-comercial: promptstoproduct.com (2026-05-06).
- Supabase: automationatlas.io/answers/supabase-free-tier-limits-2026 (2026-06-08);
  stackrev.net/en/hosting-platforms/supabase-pricing (2026-07-27); jetadmin.io (2026-07-24);
  saasturf.com (2026-07-14); costbench.com (2026-07-24).
- Render: agentdeals.dev/vendor/render (2026-06-22).
- X API free 17/24h: devcommunity.x.com/t/specifics-about-the-new-free-tier-rate-limits (2024-11-12)
  y /t/free-tier-rate-limits (2026-01-23).
- Meta IG: developers.facebook.com/documentation/instagram-platform/app-review (updated 2026-06-30);
  netrows.com (2026-06-26); blotato.com (2026-08-06); getphyllo.com (2026-07-20).