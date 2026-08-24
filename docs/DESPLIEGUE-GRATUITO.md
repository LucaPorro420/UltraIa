# Despliegue gratuito: UltraIa en modo nube + servidor (iter-82)

Objetivo: que el proyecto **viva fuera de esta maquina** — que lata, se mida y se
mejore solo — sin pagar nada. Todo lo de aqui usa capas gratuitas permanentes, no
pruebas de 14 dias.

## Mapa de servicios (todo free tier)

| Pieza | Servicio gratis | Limite real | Para que en UltraIa |
|---|---|---|---|
| **Latido / cron** | GitHub Actions | ilimitado en repos publicos · 2.000 min/mes en privados | `.github/workflows/heartbeat.yml` corre gates + `Task/heartbeat.ts` cada dia y commitea el pulso (~7 min/dia ≈ 210 min/mes) |
| **CI** | GitHub Actions | idem | `.github/workflows/ci.yml` en cada push/PR |
| **Web (Next.js)** | Vercel Hobby | 100 GB-h func./mes, 100 GB banda | `apps/web` — dashboard + `/api/health` |
| **Base de datos** | Supabase Free o Neon Free | 500 MB / 0.5 GB | reemplaza `file:./dev.db` en produccion (Prisma) |
| **Memoria vectorial** | Qdrant Cloud Free | 1 GB, 1 cluster | coleccion `memoria_experiencial_v2` (dim 1024 ≈ 4 KB/punto → ~250k docs) |
| **Vault / archivos** | Cloudflare R2 | 10 GB + egreso gratis | `vault_manage` + `CloudStorageAdapter` (`.env.cloud.example`) |
| **Monitor** | UptimeRobot Free | 50 monitores, 5 min | ping a `/api/health`; ademas mantiene la instancia caliente |
| **Modelo LLM** | Ollama local / DeepSeek / Google AI Studio | segun proveedor | `ULTRAIA_PROVIDER` + `ULTRAIA_MODEL` |

> Regla del proyecto que se mantiene: **keyless por defecto**. Sin ninguna clave, el
> sistema sigue funcionando (DDG, pollinations, edge-tts, ffmpeg, Qdrant local).

## 1. Latido autonomo en la nube (lo unico imprescindible)

Ya esta commiteado. Para activarlo:

1. Push del repo a GitHub (`origin` ya apunta a `LucaPorro420/UltraIa`).
2. **Settings → Actions → General → Workflow permissions** → *Read and write* (el
   latido commitea el pulso).
3. **Actions → Latido (heartbeat) → Run workflow** para el primer disparo manual.

Cada corrida deja:

- `resultTask/heartbeat/pulso-<fecha>.md` — parte medico legible (commiteado).
- `resultTask/heartbeat/vitals.json` — mismo estado en JSON (lo lee `/api/health`).
- `.ultraia/vitals/last.json` — latido anterior, para detectar regresiones.
- artifact `pulso-<n>` con los logs de los 4 gates (14 dias de retencion).

El cron esta a las **09:00 UTC = 06:00 Montevideo**. Cambiar en el `cron:` del yml.

## 2. Web en Vercel (modo servidor)

```bash
npm i -g vercel && vercel link            # una vez
vercel env add DATABASE_URL production    # cadena de Supabase/Neon
vercel --prod
```

- **Root Directory**: raiz del monorepo. **Build**: `npm run build`. **Output**: automatico (Next 15).
- Variables minimas: `DATABASE_URL`, `APP_URL`, y las del proveedor LLM que uses.
- Endpoint de vida: `https://<tu-app>.vercel.app/api/health` → `{ ok, entorno, uptimeSegundos, vitals }`.

## 3. Base de datos gratis (Supabase / Neon)

```bash
# .env de produccion
DATABASE_URL="postgresql://...?sslmode=require&pgbouncer=true"
npm run db:generate && npx prisma migrate deploy --schema packages/core/prisma/schema.prisma
```

`file:./dev.db` sigue siendo el default local: no hay que migrar para desarrollar.

## 4. Memoria vectorial gratis (Qdrant Cloud)

1. Crear cluster free en cloud.qdrant.io → copiar URL y API key.
2. Exportar `QDRANT_API_KEY=<clave>` (el cliente la lee del env, o pasarla como 4º
   parámetro de `createQdrantClient`) y sincronizar la verdad verificada:

```bash
npx vite-node Task/sync-qdrant.ts -- --url=https://<cluster>.qdrant.io:6333
npx vite-node Task/sync-qdrant.ts -- --url=https://<cluster>.qdrant.io:6333 --search "area del circulo"
```

La coleccion `memoria_experiencial_v2` se crea sola (`ensureCollection`, size 1024,
Cosine). La v1 dim-4 queda intacta para `sacd_system/nucleo_nasa.py`.

> CERRADO (iter-90): `createQdrantClient` ya envia la cabecera `api-key`
> (parametro opcional + fallback a `QDRANT_API_KEY`); sin key el comportamiento
> es identico al local (retrocompatible, cubierto por tests).

## 5. Monitor gratis

UptimeRobot → *Add New Monitor* → HTTP(s) → `https://<tu-app>.vercel.app/api/health`,
intervalo 5 min. Alerta por email cuando la sonda deja de responder.

## 6. Modo servidor local (sin nube)

```bash
python start.py --web --host 0.0.0.0 --browser chrome   # ya existente (iter-66)
python start.py --lite                                   # PC con <8 GB RAM (iter-92)
npx vite-node Task/heartbeat.ts                          # latido manual
```

> Maquina corta de memoria? Guia completa por presupuesto de RAM (perfiles, headless y
> reparto local↔nube): `docs/INICIO-LOCAL-Y-NUBE.md`.

## Matriz de variables de entorno

| Variable | Donde | Obligatoria | Nota |
|---|---|---|---|
| `DATABASE_URL` | Vercel + CI | si | `file:./dev.db` en local; Postgres en produccion |
| `APP_URL` | Vercel | si | URL publica, para callbacks |
| `ULTRAIA_PROVIDER` / `ULTRAIA_MODEL` | Vercel | no | sin ellas el runtime queda en modo keyless |
| `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` / `GOOGLE_API_KEY` | Vercel | no | solo si se usa ese proveedor |
| `QDRANT_URL` / `QDRANT_API_KEY` | Vercel + Actions | no | memoria externa; sin ellas usa `127.0.0.1:6333` |
| `R2_*` (ver `.env.cloud.example`) | Vercel | no | vault en la nube |

**Nunca** commitear `.env`, `cuentas.txt` ni claves: van en *Vercel → Environment
Variables* y en *GitHub → Settings → Secrets and variables → Actions*.

## Coste total

**USD 0/mes** en todas las piezas anteriores. Los unicos limites que se pueden
tocar con uso real son los 100 GB-h de Vercel y el 1 GB de Qdrant Cloud; el latido
diario cabe de sobra en Actions.
