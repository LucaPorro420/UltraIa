# PLAN: UltraIA Cloud — nube gratuita + guías de registro + deploy (tarea #27)

Fecha: 2026-08-17 · Modo: plan → build (un solo ciclo, autorización permanente del usuario)

## Contexto
- Petición del usuario (17/08/2026): "usaremos cloud desde dominios y cloud gratuitas,
  puedes crearlas y darme las claves. Aplicar app review, busca y piensa en mejoras para
  realizar al proyecto completo... crear una app web que sea una nube en un dominio
  gratuito" + respuestas a 3 preguntas: stack 1+2+3 (Cloudflare todo-en-uno + Vercel/Supabase
  + híbrido — "has todas"), alcance 1+2+3 (dashboard UltraIA Cloud + nube personal de archivos
  + ambas), orden: "ambos en paralelo" (guías + MVP en el mismo ciclo).
- Verdad VERIFICADA por websearch 17/08/2026 (2026): Cloudflare Workers 100k req/día + D1 5GB +
  R2 10GB egress $0 + Pages + dominio .pages.dev = $0 estable sin cláusula comercial; Vercel
  Hobby tiene cláusula "no commercial use" (solo personal/learning) + límites MAU; Supabase Free
  = 500MB Postgres + 1GB files + 5GB egress + 50k MAU + 500k edge invocations, auto-pausa tras
  7 días de inactividad y sin backups; Render Free = spin-down 15 min + cold starts 30-60s +
  Postgres gratis expira a los 30 días; X API v2 Free = 17 posts/24h POR APP (sin app review,
  solo developer project; el "1,500/mes" era API 1.1 legacy); Meta/Instagram Graph API = app
  review NO requerida para negocio propio (Standard Access, docs oficiales jun 2026), permisos
  `instagram_business_content_publish` + `instagram_basic`, límite de publicación duplicado en
  2026; TikTok Content Posting API = requiere aprobación humana de TikTok; YouTube = OAuth propio
  sin verificación completa.
- RESTRICCIÓN: el agente NO puede crear cuentas ni generar claves (email + verificación del
  usuario). Entregable = código + configs + guías paso a paso para que el registro tome ~5 min
  por servicio y el deploy quede hecho al pegar las claves en .env (gitignored).
- Sesión concurrente: #25 F2 media-automation EN CURSO (recorder.ts/automation.ts untracked +
  M llm.ts + M index.ts con sus registros). NO tocar; aislar a %TEMP% solo para gates. NO editar
  llm.ts/index.ts este ciclo (commitearlos incluiría sus registros → referencias a archivos no
  commiteados → typecheck roto en checkout limpio). El plan loop-26 (mejoras) es de la sesión
  concurrente — NO duplicar (mi docs/CLOUD-FREE-2026.md cubre registro+deploy; COSTOS.md queda
  para E1.1 de #26).

## Objetivo
1. Capability `cloud` en packages/core (dominio puro: paths seguros, validación de uploads,
   clasificación por tipo, layout de carpetas, manifest, adapters Local/R2, service) + 24 tests.
2. API /api/cloud/* (files/upload/delete/status) con auth consistente (getCurrentUser).
3. Página /cloud (Dark Obsidian): estado de proveedores, subida/gestión de archivos, stats,
   cola de publicaciones (reuso /api/publications), guías.
4. docs/CLOUD-FREE-2026.md: guías de registro Cloudflare/Vercel/Supabase/Render + dossier
   app reviews (X/Meta/TikTok/YouTube/LinkedIn) + plantillas env + pasos deploy + presupuesto $0.
5. Configs deploy: cloudflare/wrangler.toml + worker.ts (API R2 list/upload/get/delete con
   token + CORS + rate limit) + README; .env.cloud.example (todas las variables).
6. Harness: plan file, STATE.md fila #27, loop-run-log iteración 25, LEARNINGS, AGENTS.
   Registro de capability `cloud` en llm.ts/index.ts DIFERIDO hasta que #25 commitee (dependencia
   documentada en STATE.md High Priority).

## Pasos
1. packages/core/src/tools/cloud.ts — zod schemas + dominio puro + adapters + service + cloudTools.
2. packages/core/src/tools/cloud.test.ts — 24 tests (deterministas, InMemoryAdapter + tmpdir).
3. apps/web/src/app/api/cloud/status/route.ts, files/route.ts (GET/DELETE), upload/route.ts.
4. apps/web/src/app/(app)/cloud/page.tsx + cloud-client.tsx + entrada en components/app-shell/nav.tsx.
5. docs/CLOUD-FREE-2026.md + cloudflare/wrangler.toml + cloudflare/worker.ts + cloudflare/README.md
   + .env.cloud.example + .gitignore (.ultraia/cloud/).
6. LEARNINGS.md + AGENTS.md + STATE.md + loop-run-log.md.

## ARCHIVOS A TOCAR (staging explícito)
- NUEVOS: packages/core/src/tools/cloud.ts, cloud.test.ts, apps/web/src/app/api/cloud/{status,files,upload}/route.ts, apps/web/src/app/(app)/cloud/page.tsx, components/cloud-client.tsx, docs/CLOUD-FREE-2026.md, cloudflare/{wrangler.toml,worker.ts,README.md}, .env.cloud.example, .opencode/plans/loop-25-ultraia-cloud.md
- EDITADOS: apps/web/src/components/app-shell/nav.tsx (entrada Cloud), .gitignore, LEARNINGS.md, AGENTS.md, STATE.md, loop-run-log.md
- NO TOCAR: llm.ts, index.ts, recorder*, automation* (sesión concurrente #25), loop-26 plan, docs/RAZONAMIENTO-MEDIA-AUTOMATION.md, learning/sources/media-automation.md

## Criterios de verificación
- Scoped: vitest cloud.test.ts (24 PASS) + typecheck core.
- FULL antes del commit: typecheck → lint → test (628 + 24 = 652 esperados, aislando #25) → build.
- Maniobra gates: copiar llm.ts/index.ts a %TEMP%\opencode\backup-llm\*, git checkout -- ambos,
  mover recorder/automation + tests a %TEMP%\opencode\backup-25\*, gates, restaurar TODO intacto.
- Smoke: GET /api/cloud/status 200 (auth), upload → list → delete roundtrip con dev server
  (opcional si tiempo; los tests cubren el dominio).

## Riesgos / guardas
- No commitear trabajo ajeno (maniobra backup/restore de llm.ts/index.ts ANTES de commit).
- PS 5.1: escribir archivos con tool Write (nunca Set-Content); no mezclar edit+bash paralelos.
- No inventar límites: los números de free tiers citados en docs provienen de la búsqueda
  verificada (17/08/2026) con fechas de verificación.
- Sin push/merge (aprobación humana).

## Esfuerzo
Medio-alto (~1 ciclo): core 2 archivos, API 3 rutas, UI 2 archivos, docs 1, configs 3, harness 4.