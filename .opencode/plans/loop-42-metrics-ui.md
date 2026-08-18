# Plan loop-42 — UI de métricas AutoPub (página /metrics)

## Contexto
- F5 analíticas completo en dominio + tool + endpoint (`GET /api/publications/metrics?platform=&channelId=`, a8bf697). Falta la UI que consuma el endpoint (cierre punta a punta).
- No existe página de publicaciones ni métricas. Archivos del shell limpios (nav.tsx, (app) layout — verificado git status). Endpoint exige rol ADMIN (401/403) — el fetch del client con cookies de sesión funciona (patrón cloud-client).
- NO tocar archivos ajenos (route.ts de /api/publications, llm.ts, index.ts, publish.ts, topics.ts, enrutador.ts, publications.ts).

## Objetivo
Página `(app)/metrics`: stat-cards de totales + tabla por canal (publicadas/fallidas/pendientes/tasa/score) + panel de analytics reales (select platform + input channelId + botón → muestra vistas/subscriptores/videoCount o el error fail-soft con la razón).

## Pasos
1. `apps/web/src/app/(app)/metrics/page.tsx` — server: `requireUser()` + `<MetricsClient />` (patrón cloud/page.tsx).
2. `apps/web/src/components/metrics-client.tsx` — 'use client':
   - GET /api/publications/metrics (KPIs) al montar.
   - Estadísticas: 4 StatCards (total, publicadas, fallidas, pendientes) + por canal cards/tabla con badges (tasaExito %, scorePromedio).
   - Panel analytics: select platform (youtube/tiktok/x/instagram/threads/telegram) + input channelId + botón → GET /api/publications/metrics?platform=&channelId= → muestra analytics reales (vistas/subscriptores/videoCount) o error fail-soft en badge amber.
   - Iconos lucide (BarChart3, Eye, Users, Video, TriangleAlert, RefreshCw). Diseño Dark Obsidian (bg-canvas, border-border-subtle, glass-panel).
3. `nav.tsx`: añadir entrada `/metrics` (icono BarChart3) tras Cloud — archivo limpio verificado.
4. Gates scoped: tsc web --noEmit (0 propios) + eslint de los 3 archivos.

## Archivos a tocar
- apps/web/src/app/(app)/metrics/page.tsx (nuevo)
- apps/web/src/components/metrics-client.tsx (nuevo)
- apps/web/src/components/app-shell/nav.tsx

## Criterios de éxito
- tsc 0 propios, eslint EXIT 0, commit con staging explícito, build de página incluido en verificación.

## Riesgos
- Nav tocado por sesión concurrente a mitad de la iteración → verificar antes del commit (si sucio, diferir entrada nav y anotar).
- API 401 si sesión expira → manejar estado "no autorizado" en el client.

## Esfuerzo
- Bajo (~1h).