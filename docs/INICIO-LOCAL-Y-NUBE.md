# INICIO LOCAL Y NUBE — UltraIa en PCs con menos de 8 GB de RAM

> Guía operativa (iter-92). Cómo arrancar el proyecto **localmente** y **en la nube**
> según la memoria disponible. Datos marcados "medido" son reales del repo; el resto
> son órdenes de magnitud típicas. Referencias cruzadas:
> `docs/DESPLIEGUE-GRATUITO.md` · `DEPLOY.md` · `docs/CLOUD-FREE-2026.md`.

---

## 1. Qué te conviene según tu RAM (decisión en 10 segundos)

| RAM total | Camino recomendado | Comando |
|---|---|---|
| ≤ 4 GB | **Nube-first**: app desplegada en Vercel (el build corre en SU nube, 0 RAM tuya) + local solo el scheduler headless | §3.4 + §4 |
| 4 – 8 GB | **Local modo LITE** (solo web, heap capado) + fábrica por schtasks + nube para lo público | §3.2 + §4 |
| ≥ 8 GB | Local estándar completo cuando quieras; igual puedes usar nube | §3.5 |

> Regla de oro para máquinas cortas de memoria: **nunca ejecutes `npm run build`
> localmente** (pica ~1.5–2+ GB). El build lo hace Vercel gratis (§4).

---

## 2. Instalación única (una sola vez)

```powershell
cd C:\ruta\UltraIa
powershell -ExecutionPolicy Bypass -File scripts\iniciar-local.ps1 -SoloSetup
```

Equivale a `python start.py --install`: instala dependencias npm, crea `.env` si falta,
migra la base SQLite (`dev.db`). Requisitos: Node ≥ 20, Python ≥ 3.10.

---

## 3. Arranque LOCAL

### 3.1 El lanzador inteligente (recomendado)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\iniciar-local.ps1
```

Detecta la RAM total y elige solo:

- **< 6 GB → perfil `minimo`**: `python start.py --lite` con heap escalado
  (≤ 4.5 GB → `--ram-mb=384`; si no → 512).
- **≥ 6 GB → perfil `estandar`**: `python start.py` (web + webhooks + gen-engine).

Overrides útiles:

```powershell
-Perfil minimo        # forzar lite            -Lan           # abrir a la red (probar desde el móvil)
-RamMb 384            # heap manual            -SinNavegador  # no abrir Chrome/Brave
```

### 3.2 Modo LITE (4–8 GB) — qué hace exactamente

`python start.py --lite` (o `--lite --ram-mb=384`):

1. Limita el heap de Node con `NODE_OPTIONS=--max-old-space-size=512` (no pisa un valor que ya tengas).
2. Arranca **solo la web** (:3000); omite webhooks (:8000) y gen-engine (:8100).
3. Imprime consejos anti-RAM en consola.

Lo que pierdes sin webhooks/gen-engine no afecta a la fábrica de contenido: las claves
premium del pipeline árabe y los modelos GPU son opcionales; el ciclo AutoPub usa
proveedores keyless y corre aparte (§3.4).

### 3.3 Presupuesto de memoria por servicio

| Servicio | RAM aproximada | Nota / fuente |
|---|---|---|
| Launcher WebView2 (UI alternativa) | **111 MB medidos** | iter-50 (host 33 + proxy 78), bundle 13.7 MB |
| Webhooks FastAPI (`--hooks`) | ~50–90 MB | uvicorn + FastAPI |
| Gen-Engine local (`--gen-engine`) | ~80–150 MB | sin cargar modelos pesados |
| Scheduler AutoPub (schtasks, sin ventana) | ~250–450 MB pico | vite-node + Prisma, termina solo |
| `next dev` (web) | ~0.9–1.4 GB | con LITE queda acotado por el heap cap |
| `npm run build` | **~1.5–2+ GB pico** | ⚠ evitar local en <8 GB → §4 |

### 3.4 Modo HEADLESS (≤ 4 GB): ni siquiera abras la web

La fábrica autónoma ya vive programada en el Planificador de Tareas (iter-90):

```powershell
Get-ScheduledTask -TaskName 'UltraIA AutoPub*'   # 09:00 / 14:00 / 19:00 — Ready
```

Cada tarea lanza el ciclo (temas → contenido → cola → publica vencidos), escribe el reporte
en `.ultraia/autopub\` y **termina**. No necesita ninguna ventana abierta. Revisas y apruebas
los DRAFT desde la app móvil o desde la web cuando tú quieras (§4).

Comandos manuales equivalentes: `npm run autopub -- --publish-due` (ciclo completo) o
`npm run autopub -- --dry-run` (observador).

### 3.5 Estándar (≥ 8 GB)

```powershell
python start.py          # web + webhooks + gen-engine, health-checks y auto-restart
python start.py --host 0.0.0.0   # accesible desde el móvil en tu LAN
```

### 3.6 UI alternativa ultraligera (WebView2, ~111 MB)

En lugar del navegador + `next dev`, el shell desktop consume una fracción:

```powershell
node desktopFase\launcher\launcher.mjs            # ventana WebView2 contra el dashboard
node desktopFase\launcher\launcher.mjs --check    # health-check JSON y sale 0
```

---

## 4. NUBE GRATIS (build y público fuera de tu PC)

Objetivo: que lo público (blog, dashboard, aprobaciones desde el móvil) corra en infraestructura
gratuita mientras tu PC solo mantiene el scheduler. Paso a paso mínimo:

### 4.1 Subir el repo a GitHub

```powershell
git push origin master        # ya existe remote configurado (LucaPorro420/UltraIa)
```

### 4.2 Desplegar la web en Vercel (el build corre EN LA NUBE = 0 RAM tuya)

1. vercel.com → *Add New Project* → importa `UltraIa`.
2. Framework: detecta **Next.js** solo. Build command default. No toques nada más.
3. Variables de entorno mínimas (Settings → Environment Variables):
   - `DATABASE_URL` → Postgres de Supabase (§4.3) para que la cola sobreviva entre deploys.
     *(Con `file:./dev.db` funciona pero es efímera en serverless.)*
   - `APP_URL` → `https://<tu-proyecto>.vercel.app`
   - Opcionales: `ULTRAIA_PROVIDER`/`ULTRAIA_MODEL`/claves de proveedor; `GEN_ENGINE_URL`.
4. Deploy → URL pública `*.vercel.app` gratis.
   *(Nota verificada: Vercel Hobby dice "non-commercial use"; para uso comercial, Cloudflare
   Workers/Pages — tabla completa en `docs/CLOUD-FREE-2026.md`.)*

### 4.3 Base de datos real: Supabase (gratis)

supabase.com → nuevo proyecto → Settings → Database → connection string (Pooler) → pégalo como
`DATABASE_URL` en Vercel y corre la migración apuntando ahí:

```powershell
$env:DATABASE_URL="<postgres-supabase>"; npx prisma migrate deploy --schema packages/core/prisma/schema.prisma
```

Desde ese momento, aprobar publicaciones desde el móvil usa la MISMA cola en la nube.

### 4.4 Lo que YA corre en la nube sin que hagas nada

| Pieza | Dónde | Estado |
|---|---|---|
| Latido diario (gates + diagnóstico autónomo) | GitHub Actions `heartbeat.yml`, cron 09:00 UTC | ✅ activo (iter-82) |
| CI en cada push | Actions `ci.yml` (master+main) | ✅ activo |
| Memoria vectorial (opcional) | Qdrant Cloud free — `QDRANT_URL` + `QDRANT_API_KEY` | conectar con `Task/sync-qdrant.ts` (api-key ya soportada, iter-90) |
| Monitor de uptime (opcional) | UptimeRobot → `/api/health` | guía en DESPLIEGUE-GRATUITO §5 |

### 4.5 Reparto recomendado para <8 GB (quién corre dónde)

| Responsabilidad | Dónde | Coste | RAM en TU PC |
|---|---|---|---|
| Fábrica de contenido (temas→contenido→cola) | Local, schtasks 09:00/14:00/19:00 | $0 | ~300–450 MB pico, termina sola |
| Aprobaciones humanas (DRAFT) | Móvil (app Expo) o Vercel | $0 | 0 |
| Blog/dashboard públicos | Vercel | $0 | 0 |
| Cola persistente compartida | Supabase Postgres | $0 | 0 |
| Memoria vectorial | Qdrant Cloud | $0 | 0 |
| Gates/tests/build | GitHub Actions | $0 | 0 |
| UI de gestión ocasional | `iniciar-local.ps1` (LITE) o launcher WebView2 | $0 | 111 MB – ~1 GB |

---

## 5. Solución de problemas de RAM

| Síntoma | Remedio |
|---|---|
| Build local se queda sin memoria | No buildees local: deja el build a Vercel (§4.2). Si es imprescindible: cierra todo, sube pagefile a ≥ 16 GB y reintenta |
| `next dev` tarda mucho en compilar con LITE | Normal con heap 384–512 MB; espera al health-check UP (~60 s) |
| Nada responde en :3000 | Mata servidores zombis: `Get-CimInstance Win32_Process -Filter "Name='node.exe'" \| ? { $_.CommandLine -match 'next dev' } \| % { taskkill /PID $_.ProcessId /T /F }` |
| Chrome se come la RAM | Usa `-SinNavegador` y abre tú cuando toque; cada pestaña cuesta 100–300 MB |
| Windows va justo siempre | Pagefile automático o mínimo 1.5× RAM (Sistema → Configuración avanzada → Rendimiento) |
| Quiero más heap puntualmente | `python start.py --lite --ram-mb=768` (o sin `--lite` si tienes holgura) |

---

## 6. Resumen de un párrafo

Instala una vez con `-SoloSetup`; en PC chica deja que `scripts\iniciar-local.ps1` elija el
modo LITE (solo web, heap capado) o directamente no abras nada y deja que las tareas
programadas fabriquen contenido solas; pon lo público en Vercel + Supabase + Qdrant Cloud
para que ni el build ni la base gasten tu RAM; el latido y el CI ya trabajan gratis en
GitHub Actions. Tu PC con menos de 8 GB solo necesita aguantar picos de ~450 MB unos minutos,
tres veces al día.
