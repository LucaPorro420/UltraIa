# UltraIa — Deploy gratuito (2026)

Guía de hosting sin costo para publicar UltraIa (Next.js 15 + FastAPI webhooks).
Basado en plataformas free-tier vigentes: Vercel, Netlify, Render, Cloudflare
Pages, GitHub Pages.

---

## Opción rápida

```bash
python start.py --deploy   # build de producción + instrucciones en pantalla
```

## Plataformas gratuitas

### 1. Vercel (recomendado para Next.js)
- Free tier personal: despliegues ilimitados, SSL, CDN global, preview por PR.
- Comandos:
  ```bash
  npx vercel            # primer deploy (login una vez)
  npx vercel --prod     # deploys siguientes
  ```
- Alternativa: conectar el repo GitHub en https://vercel.com → auto-deploy.
- Build command: `npm run build` · Output dir: `apps/web/.next`
- Variables de entorno: pega tus API keys (OPENAI/ELEVENLABS/RUNWAY/FAL) en
  Settings → Environment Variables.

### 2. Netlify
- Free: builds automáticos desde GitHub, funciones serverless, SSL.
  ```bash
  npx netlify deploy    # preview
  npx netlify deploy --prod
  ```
- Build command: `npm run build` · Publish dir: `apps/web/.next`

### 3. Render
- Free tier (el servicio "duerme" tras inactividad, se reactiva al recibir tráfico).
- New Web Service → repo → Build: `npm run build` → Start: `npm start`
- Útil también para el webhook server FastAPI (web service de Python).

### 4. Cloudflare Pages
- Free: CDN global, ancho de banda ilimitado, integración con GitHub/GitLab.
  ```bash
  npm run build
  npx wrangler pages deploy apps/web/out --project-name ultraia
  ```
- Requiere export estático: `next.config.ts` → `output: "export"` (revisa que la
  app no use API routes/server features).

### 5. GitHub Pages
- Free, estático. Exporta con `output: "export"` y sube a `gh-pages`:
  ```bash
  npm run build
  npx gh-pages -d apps/web/out
  ```
- La web arrancará en `https://<user>.github.io/ultraia/`.

## Webhook server (FastAPI, :8000)
- No encaja en hosting estático. Opciones free: Render (web service Python),
  Railway (free tier con límites), o un túnel temporal para pruebas:
  ```bash
  npx localtunnel --port 8000
  ```
- El health check de `start.py` acepta 404, así que apuntar el webhook a un
  host sin ruta `/` funciona igual.

## Recordatorios
- Nunca subas `.env` ni API keys al repositorio (`.gitignore` ya los excluye).
- Las variables de entorno se pegan en el panel de cada plataforma.
- `AUTH_SECRET` debe ser un secreto largo y estable por entorno.
- `WEBHOOK_SECRET`: si no está, el webhook server genera un token aleatorio
  que cambia en cada reinicio — defínelo fijo para producción.
