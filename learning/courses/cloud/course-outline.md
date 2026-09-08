# Cloud Course — UltraIa Learning

## Course Overview
Cloud infrastructure course covering free-tier cloud platforms, storage, deployment, and cost optimization. Based on verified learning from UltraIa's cloud-free-2026 research.

## Module 1: Cloud-Free 2026 Verified Landscape (from `docs/CLOUD-FREE-2026.md`)
### 1.1 Cloudflare Workers + D1 + R2 + Pages
- **Cost**: $0 estable SIN cláusula comercial
- **Recursos**: 100k req/día + D1 5GB + R2 10GB egress
- **Dominio**: `.pages.dev` gratis
- **Limitaciones**: Sin cláusula comercial, gratuito para uso no comercial

### 1.2 Vercel Hobby
- **Cost**: Gratis
- **Cláusula importante**: `"no commercial use"` — NO para uso comercial
- **Recomendación**: Solo para proyectos personales/no comerciales

### 1.3 Supabase Free
- **Postgres**: 500MB gratis
- **Files**: 1GB files gratis
- **Egress**: 5GB gratis
- **MAU**: 50k gratis
- **Auto-pausa**: Después de 7 días sin actividad
- **Backups**: Sin backups gratuitos
- **Expira**: A los 30 días (Postgres free expa a los 30 días)

### 1.4 Render Free
- **Spin-down**: Después de 15 minutos inactivo
- **Cold starts**: 30-60 segundos
- **Postgres gratis**: Expira a los 30 días
- **Cold start penalty**: Significant delay on wake

### 1.5 X API v2
- **Free tier**: 17 posts/24h POR APP (no por cuenta)
- **Legacy**: 1,500/mes era API 1.1 legacy (ya no disponible)
- **Requirement**: App review NO requerida para negocio propio (Standard Access, docs updated 2026-06-30)
- **Capabilidades**: `instagram_business_content_publish` + `instagram_basic`

### 1.6 Meta/IG (Instagram & Threads)
- **App review NO requerida**: Para negocio propio (Standard Access)
- **Acceso estándar**: `instagram_business_content_publish` + `instagram_basic`
- **Límite de duplicados**: Subió en 2026
- **Threads**: Graph API v1.0: threads→threads_publish, text cap 500

### 1.7 TikTok Content Posting API
- **Requiere**: Aprobación humana
- **Free tier**: No especificado (requiere review)
- **Status**: Pending verification (se mencionó en enlaces.txt 811)

### 1.8 YouTube OAuth
- **Canal propio**: OK, sin requisitos adicionales
- **API**: YouTube Data API v3 gratis con YOUTUBE_API_KEY
- **Cuota**: 10k/day

### 1.9 LinkedIn
- **Status**: Pending verification
- **Mención**: En enlaces.txt 811 (solo referencia)

## Module 2: Cost and Budget Management
### 2.1 Budget Limits Verified (17/08/2026)
| Platform | Monthly Cost | Key Limitation |
|----------|-------------|----------------|
| Cloudflare | $0 | Sin cláusula comercial, $0 estable |
| Vercel Hobby | $0 | "no commercial use" |
| Supabase | $0 (hasta 7d) | Auto-pausa 7 días, expira 30d |
| Render | $0 ( limitado) | Spin-down 15min, cold start 30-60s, expira 30d |
| X API v2 | $0 | 17 posts/24h por app |
| Meta/IG | $0 | Standard Access, sin app review para negocio propio |
| TikTok | ? | Aprobación humana requerida |
| YouTube | $0 (con key) | 10k/day quota |

### 2.2 Free Tier Decision Matrix
- **Personal projects**: Cloudflare + Vercel (if no commercial use)
- **Side business**: Supabase (hasta 7d) o Cloudflare a largo plazo
- **Commercial projects**: Need paid tier or Cloudflare (verified $0 stable)
- **Side projects < 7 days**: Supabase free tier viable
- **Long-term projects**: Cloudflare Workers + D1 + R2 + Pages

### 2.3 Cost Optimization Strategies
- **Multi-cloud**: Use Cloudflare for static + Supabase for DB + Render for compute (when free)
- **Resource tagging**: Track which projects use which free tier
- **Auto-pausa management**: Wake up Supabase before 7d auto-pause
- **Cold start mitigation**: Keep services warm or accept 30-60s delay
- **Egress monitoring**: Track R2/D1 egress to stay within free limits

## Module 3: Repository Own and Vault Integration (from `vault.ts`)
### 3.1 Local Vault (.ultraia/vault/)
- **Layout**: `.ultraia/vault/<kind>/` — data, files, creations, tests, prototypes, pdfs
- **Manifest**: `manifest.json` (version 1, conteos por kind, totalBytes, entradas)
- **Classification**: `classifyVaultKind` — test/prototype → tests/prototypes; media/datos → creations/data; `.pdf` → pdfs; resto → files

### 3.2 Cloud Sync Strategies
- **vaultToCloud**: CloudStorageAdapter (R2 if env, si no local `.ultraia/cloud`)
- **planVaultSync**: Diff determinista local vs cloud (toUpload/toRemove)
- **exportVaultToGitHub**: Contents API por archivo, fail-soft sin GH_TOKEN/GITHUB_TOKEN

### 3.3 R2 Cloud Adapter (from `cloudflare/worker.ts`)
- **Contrato**: GET/HEAD/PUT/DELETE `/files*`, Bearer CLOUD_TOKEN, CORS, límite 100 MiB
- **Deploy**: `npx wrangler deploy`
- **`.env.cloud.example`**: Todo comentado, nada obligatorio
- **.gitignore**: `.ultraia/cloud/`

### 3.4 Local Cloud Adapter
- **InMemoryCloudAdapter**: Solo en memoria (para testing)
- **LocalCloudAdapter**: Escritura atómica tmp+rename, fail-soft list/read/stat
- **list recursivo**: ≤4 niveles de profundidad
- **validateUpload**: Límite 100 MiB, tipos permitidos EXT_TYPES (42 extensiones en 7 categorías)

### 3.5 Upload Limits and Types
- **MAX_UPLOAD_BYTES**: 100 MiB (unidades binarias: KiB/MiB/GiB/TiB)
- **humanSize**: 100 MiB no es "100 MB" — si divides por 1024 las unidades son binarias
- **EXT_TYPES**: 42 extensiones en 7 categorías
- **MIME_BY_EXT**: MIME type por extensión
- **sanitizeFileName**: Espacios→guiones, quita guiones antes Y después de puntos, slice 240

## Module 4: API Integration Patterns (from `tools/cloud.ts`)
### 4.1 Web Routes (auth-protected)
- **GET /api/cloud/status**: Estado de proveedores local/r2/supabase/vercel, NUNCA secretos, presupuesto $0/mes
- **GET|DELETE /api/cloud/files**: Lista + manifest; DELETE body {path}
- **POST /api/cloud/upload**: Multipart File + dir, 413 >100 MiB

### 4.2 Client-side (/cloud page)
- **cloud-client.tsx**: Drag&drop, stats (archivos/almacenado/tipos), copiar ruta, borrar
- **3 guías**: Cloudflare, Vercel, Supabase, Render, X API, Meta/IG, TikTok, YouTube
- **humanSize duplicado local**: cloud.ts usa `node:*` → NO importable desde client bundle

### 4.3 Cloud Service Operations
- **upload→drafts por defecto**: List/manifest/remove/stat
- **validateUpload**: 413 >100 MiB,EXT_TYPES check
- **humanSize**: Duplicar local en client (no importable desde bundle)
- **classifyFile**: Por extensión
- **normalizeCloudPath**: Canónico minúsculas, sin `..`/`\\`/nulos

## Module 5: Deployment and Migration Patterns
### 5.1 Migration from Other Platforms
- **From Vercel**: Export functions, adjust for Cloudflare Workers syntax
- **From Supabase**: Adjust RLS policies, migrate storage buckets
- **From Render**: Adjust port configurations, environment variables

### 5.2 Multi-Region Considerations
- **CDN**: Cloudflare Workers automatically edge-distributed
- **Database region**: D1 region selection, Supabase region planning
- **Latency optimization**: Edge vs node runtime selection

### 5.3 Monitoring and Health Checks
- **GET /api/cloud/status**: Health endpoint
- **Provider status**: local/r2/supabase/vercel availability
- **Budget alerts**: When approaching free tier limits
- **Auto-retry**: Fail-soft with clear error messages