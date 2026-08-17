# Loop State — UltraIa

Last run: 17/08/2026 - Iteracion 24 (screenflow 22/22, plan maestro completo: diagram 293bf38 + video_edit 35ae28a + screenflow 6eca58e; repo 628/628 GREEN); anterior: — Iteración 19 (PrototypeREADME + PDF, 555/555 GREEN); 20 (Fable-5 memory); 21 (prototipo empaquetado); 22 (diagram); 23 (video_edit)
Última triage: 15/08/2026 (report-only — sin edición de código)

## Backlog priorizado (orden de ejecución)

| # | Tarea | Scope | Gates | Estado |
|---|-------|-------|-------|--------|
| 1 | Harness PIVR: STATE.md/LOOP.md/budget/constraints/agents/driver/skill + commit de integraciones pendientes | repo | typecheck/lint/test/build | ✅ DONE 2026-08-15 (b0522e2) |
| 2 | Fase C (parcial): adapters a `@ultraia/core` vía `packages/runtime/src/adapters/` (ports + Db y AiGateway) con tests | packages/runtime | scoped runtime + FULL | ✅ DONE 2026-08-15 (e94609c, runtime 173/173) |
| 3 | Fase C (resto): adapters tools + omag (+ wiring en UltraRuntime) | packages/runtime | FULL | ✅ DONE 2026-08-15 (d2022a6, runtime 186/186, repo 404/404). Wiring `system-core` diferido a Fase D |
| 4 | Fase D: Shell Desktop — paso 1 (decisión) completado | desktopFase | FULL | ✅ paso 1 DONE 2026-08-15 (f2e9cc1: SHELL_DECISION.md — MVP WebView2 puro + Local API; upgrade path Tauri 2) |
| 5 | Fase D paso 2: (a) wiring `system-core` en UltraRuntime — DONE; (b) launcher Node sin deps + ventana WebView2 | packages/runtime + launcher | FULL | ✅ DONE 2026-08-15: (a) 5ab0426 + 0fa16f5 (runtime 191/191, repo 409/409); (b) 3196ce4 — spike launcher validado (`--check` → ok:true, core configured:true, tools:10, exit 0; runtime 192/192, repo 410/410). Pendiente Fase D: ventana WebView2 real (paso 3) |
| 6 | Gen-Engine: entrenamiento roadmap F5 (E0–E5, CreationsApp plan-de-implementacion.md) | gen-engine | pytest | pendiente — requiere GPU/decisión humana (no es ciclo de código npm) |
| 7 | **AutoPub F1**: tool `topics` en core + `scripts/topics.py --dry-run` (RSS + DuckDuckGo, dedupe, briefs JSON) | packages/core + scripts | FULL | ✅ DONE 2026-08-15 (tool topics.ts + CLI topics.py; 14 tests; core 232/232, repo 424/424). Pendiente F1: cola de briefs persistente (Prisma) |
| 8 | **AutoPub F3**: schema `PublicationPackage` + tool `present` (formato por canal, captions/hashtags) | packages/core | FULL | ✅ DONE 2026-08-15 (tool present.ts + capability `present` → `present_package`; 13 tests; repo 437/437) |
| 9 | **AutoPub F4**: `PublisherAdapter` + adaptadores YouTube/TikTok en TS (port RF-12) + tests con mocks | packages/core | FULL | ✅ DONE 2026-08-15 (tool publish.ts + wiring publish_submit; 15 tests; repo 452/452) |
| 10 | **AutoPub F4**: cola `Publication` (Prisma) + endpoints API + aprobación por paquete | packages/core + apps/web | FULL | ✅ DONE 2026-08-15 (modelo Publication + migración + dominio publications.ts 15 tests + endpoints /api/publications + tool publication_queue; repo 467/467) |
| 11 | **AutoPub F4**: calendario (start.py o scheduler runtime) + blog propio (publicar en /recursos) | scripts + apps/web | FULL | ✅ DONE 2026-08-15 (endpoint POST /api/publications/publish-due ADMIN + página pública /blog + listBlogPosts dominio; repo 470/470) |
| 12 | **AutoPub F2**: enrutamiento brief→Redactor/Guionista vía Orquestador + manifest JSON | packages/core | FULL | ✅ DONE 2026-08-15 (tools/enrutador.ts: redactar/guionizar/enrutarBrief/generarContenido + manifest idempotente + tool contenido_generar; repo 486/486) |
| 13 | **AutoPub F5**: KPIs + media_score pre-pub + feedback → mejora de agentes | packages/core + scripts | FULL | ✅ DONE 2026-08-15 (tools/metrics.ts computeChannelKpis + tools/media-score.ts port + mediaScore en create + registrarFeedback/publicationSignals + endpoints metrics/feedback + tool publication_metrics; repo 508/508) |
| 14 | **AutoPub F1 (tarea 4)**: cola de briefs persistente (Prisma) — modelo TopicBrief + dominio + tool | packages/core | FULL | ✅ DONE 2026-08-15 (modelo TopicBrief + migración add_topic_briefs + dominio briefs.ts 6 tests + tool topics_queue; repo 514/514) |
| 15 | **AutoPub F2 (tarea 2)**: multi-idioma es/ar (textos) + TTS edge-tts para narración | packages/core | FULL | ✅ DONE 2026-08-15 (idioma es/ar en redactar/guionizar/generarContenido + tts=true → narracion.mp3 keyless con degradación; 22 tests enrutador; repo 520/520) |
| 16 | **AutoPub F2 (tarea 3)**: OMAG long-form 60s+ (Project/Act/Sequence/Scene/Shot + audio) | packages/core | FULL | ✅ DONE 2026-08-15 (guionLargo 3 actos/7 escenas/shots MOTIONS + MasterTimeline sincronizada + TopicFormat 16:9 video + tts largo; 28 tests enrutador; repo 526/526) |
| 17 | **AutoPub F4 (tarea 4)**: canales restantes (Meta IG Reels/Threads, X API v2, LinkedIn) | packages/core | FULL | DONE 15/08/2026 — requiere app review/decision humana — SIGUIENTE |
| 16 | **AutoPub F2 (tarea 3)**: OMAG long-form (Project→Shot) para piezas 60s+ | packages/core | FULL | DONE 15/08/2026 |
| 17 | **AutoPub F4 (tarea 5)**: canales siguientes — Meta (IG Reels/Threads), X API v2, LinkedIn | packages/core | FULL | DONE 15/08/2026 — requiere app review/decisiones humanas |
| 18 | Desktop Fase D paso 3: ventana WebView2 real del launcher | launcher | FULL | DONE 15/08/2026 |
| 19 | **PrototypeREADME + descargable PDF** (petición usuario) | docs + scripts | FULL | DONE 15/08/2026 (0e5859b) |
| 20 | **Fable-5 memory filesystem** (enlaces.txt) — capability `memory` | packages/core | FULL | DONE 15/08/2026 (6315e30, memory-fs 28/28) |
| 21 | **Prototipo empaquetado Web+Desktop** (petición usuario) — Next standalone + launcher + zip | repo | FULL | DONE 15/08/2026 (5415628) |
| 22 | **Capability diagram** (enlaces.txt → diagram-design) — HTML/SVG editoriales + resultTask/diagrams + docs/diagrams | packages/core | FULL | DONE 17/08/2026 (293bf38, 22 tests) |
| 23 | **Capability video_edit** (enlaces.txt → browser-use/video-use) — takes_packed/EDL/render/self-eval/timeline + demo resultTask/edl | packages/core | FULL | DONE 17/08/2026 (35ae28a, 29 tests) |
| 24 | **Capability screenflow** (petición usuario) — grabación→acciones→edición→publicación local→continuidad | packages/core + scripts | FULL | DONE 17/08/2026 (6eca58e, 22 tests; runner --dry-run OK) |
| 25 | **F2 media-automation** (enlaces.txt líneas 7-665: OBS WebSocket + ciclo PLAN→VALIDATE→AUTOMATE→RECORD→ANALYZE→EDIT→AUDIO→RENDER→VERIFY→ARCHIVE; 9 repos) + web-automation.py + PLAN-COMPLETO.md | packages/core + scripts | FULL | EN CURSO — sesión concurrente (untracked: recorder.ts/automation.ts + tests + docs/RAZONAMIENTO-MEDIA-AUTOMATION.md). NO duplicar |

> AutoPub = plan maestro `docs/AUTO-PUBLICACION.md` (aprobado 15/08/2026). Orden de
> ejecución recomendado: 7 → 8 → 9 → 10 → luego 11, 12, 13.

## High Priority (loop is acting or waiting on human)

- **Working tree con ruido de sesión concurrente (17/08/2026)**: `recorder.ts`/`automation.ts`
  + tests (untracked, con errores TS propios — bloquean typecheck FULL si se corren juntos) y
  `docs/RAZONAMIENTO-MEDIA-AUTOMATION.md` + `learning/sources/media-automation.md` — trabajo de
  F2 media-automation en curso por otra sesión. Regla: NO tocarlo, NO commitearlo, aislar a
  `%TEMP%\opencode\*.bak` temporalmente solo para correr gates y restaurar intacto.
- **Gen-Engine entrenamiento E0-E5** (backlog #6): requiere GPU/decisión humana — no es ciclo
  de código npm.
- **AutoPub canales restantes** (backlog #17): Meta IG Reels/Threads, X API v2, LinkedIn —
  requiere app review/decisiones humanas.
- Ningún gate humano pendiente de push/merge (sigue requiriendo aprobación humana).

## Watch List

- **Typecheck transitorio (1 vez)**: primer run de una triage falló "command failed" en
  packages/runtime SIN errores TS; re-run EXIT=0. Posible lock/transitorio o caché stale
  `node_modules/.vite` — vigilar si se repite antes de diagnosticar.
- **Runtime tests 193/193** (Fase A 132 + Fase B 20 + Fase C 34 + wiring system-core 5 + spike launcher 1 + 1). Total repo: 628/628 PASS (core 435 + runtime 193).
- `.next` stale en apps/web rompe `npm run build` ("File ... not found") → limpiar antes del build (2ª vez vista 17/08/2026).
- `npx @cobusgreyling/loop doctor` y `loop status` — validar salida del CLI contra LOOP.md (v0.1.2).
- `.vscode/settings.json` fix Pylance (local-only, gitignored) — no commitear.
- Verificación FULL en cada commit: typecheck → lint → test → build (526/526 esperado).
- Fase D: spike del launcher validado (3196ce4) — `desktopFase/launcher/launcher.mjs` (Node sin deps; junctions @ai-sdk y @ultraia/core en dist/; node:http para --check). Pendiente: ventana WebView2 real (paso 3). Medir RAM real del MVP WebView2 antes de comprometer cifras en docs.

## Recent Noise (ignored this run)

- Fallo transitorio de typecheck resuelto en re-run (sin errores TS).
- 10 prompt files eliminados + 82 modificados en nanoprompts: refresh normal del dataset
  (index consistente, sin huérfanos — no es error).
- `python` en shell = 3.14 sin uvicorn; usar `py -3.12` para gen-engine.
- Core tocado en d2022a6 SOLO para exportar `audiolibrary`/`sound` por API pública (visibilidad).
- Iteración 6: los 3 primeros `--check` fallaron (2 de resolución de módulos + 1 crash libuv);
  resueltos con junctions + node:http — no es regresión, es el spike iterando.

---
Run log: loop-run-log.md| 19 | **PrototypeREADME + descargable PDF** (petición usuario): actualizar PrototypeREADME.md al estado real + md2pdf.py stdlib + enlace en README (lista total) | docs + scripts | FULL | DONE 15/08/2026 — plan file loop-19-prototype-readme.md |
| 20 | **Fable-5 memory filesystem** (petición usuario + enlaces.txt): capability `memory` para agentes (6 ops, version guards, persistencia) + seed + docs RAZONAMIENTO-FABLE5 + convención enlaces.txt | packages/core | FULL | DONE 15/08/2026 (555/555, memory-fs 28/28) — plan file loop-20-fable5-memory.md |
