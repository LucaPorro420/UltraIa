# PLAN: Escaneo total + backlog de mejoras (tarea #26 de STATE.md)

Fecha: 2026-08-17 · Modo: plan (escaneo/triage experto -> backlog P0-P5)

## Contexto
- Peticion del usuario 17/08/2026: "escaneo total y mejoras a realizar en el proyecto
  (subproyectos) loops, integraciones, pensamiento critico" con criterio de experto:
  ahorro total economico, mejores apps, mejores resultados, uso/usabilidad sin bugs.
- Backlog de codigo npm de STATE.md agotado (#1-#24 DONE). Unica tarea viva: #25
  (F2 media-automation) EN CURSO por sesion concurrente -> NO duplicar.
- Este plan es el producto del escaneo (evidencia + backlog priorizado) para que el
  build ejecute los items P0-P2 sin decision humana.

## Objetivo
- Backlog accionable de mejoras priorizado por impacto (bug -> costo -> harness ->
  razonamiento -> producto -> integraciones), con archivos a tocar y criterios.

## Evidencia del escaneo (17/08/2026)
- Salud: 628/628 tests PASS (core 435 + runtime 193), 48 test files core + 22 runtime,
  41 rutas API web, 30+ tools/capabilities, gates verdes en HEAD 341cea1.
- BUG ABIERTO NO REGISTRADO (P0): waitWeb del launcher --web-dir agota 45s con child
  "Ready" y vivo; requests del MISMO proceso que spawnea el child se cuelgan; requests
  de otro proceso responden 200 en ~104ms (verificado 17/08). Iteracion 21 DONE
  (5415628) pero el launcher NO verifica el arranque del zip -> prototipo sin garantia.
  Sin commit de fix. Evidencia: %TEMP%\launcher3-out.log / launcher4-out.log.
- Deuda repetida: .next stale rompe npm run build (2a vez 17/08); typecheck transitorio
  runtime (re-run OK); vitest cache stale node_modules/.vite; PS 5.1 encoding (3 lecciones).
- TODO real: packages/core/src/shared/domain.ts L13 (capacidades del usuario -> LLM).
- Economia: keyless-first consolidado (pollinations, edge-tts, Tunetank, DDG, r.jina.ai,
  yt-dlp/ffmpeg local, Gen-Engine open-weights + degradacion). Oportunidades: Ollama
  local $0, GPU cloud spot para E0-E5, YouTube Data API gratis (10k units/dia) para F5,
  cache readWeb (rate limits jina), Vercel/Render free tiers.
- Pensamiento critico: learning/ 26/26, verifier exact/approx/dict/text; falta tipo
  "reasoning" (multi-hop/contraejemplos/tradeoffs) y conexion publicationSignals ->
  improve.ts (pendiente F5).

## Backlog priorizado (P0-P5)

### P0 - Bugs
- B0.1 fix waitWeb launcher: experimento decisivo (spawn child + poll in-process vs
  curl externo en paralelo, logs completos child) -> causa raiz -> fix -> smoke zip.
- B0.2 limpieza automatica .next stale antes de build (prebuild npm o loop_piv.py).
- B0.3 waitWeb: log de statusCode/errores (diagnostico legible).

### P1 - Economia
- E1.1 docs/COSTOS.md: matriz servicios (gratis/limite/degradacion) + presupuesto $0.
- E1.2 provider Ollama local (2-4B q4) como default laptop (resolveModel ya soporta).
- E1.3 cache TTL en readWeb (reach.ts) para rate limits de r.jina.ai + test.
- E1.4 guia presupuesto spot GPU (Vast/RunPod EPH + checkpointing) para E0-E5.

### P2 - Loops (harness)
- L1.1 gates auto-limpios: preflight .next + aislamiento untracked con errores TS
  (patron %TEMP%\opencode\*.bak) automatizado en scripts/loop_piv.py.
- L1.2 smoke prototipo en loop: --check-waitweb al tocar launcher/build-prototipo.
- L1.3 budget real: medir tokens/ciclo (loop-cost) y calibrar caps.
- L1.4 triage: detector "sesion concurrente" (untracked *.test.ts + RAZONAMIENTO-*).

### P3 - Pensamiento critico
- C1.1 verifier tipo "reasoning" (respuesta libre + justificacion contra truth
  multi-hop) + 6 casos nuevos (logica, contraejemplos, tradeoffs).
- C1.2 cerrar TODO domain.ts: capacidades del usuario como sugerencia al LLM + test.
- C1.3 publicationSignals -> improve.ts (feedback post-pub al aprendizaje).

### P4 - Producto / usabilidad
- U1.1 dashboard: metricas reales (publications, mediaScore, briefs, topics) +
  boton "publicar ahora".
- U1.2 onboarding: tour + 10 plantillas de seed-library como prompts iniciales.
- U1.3 SEO: sitemap.xml + meta por pagina + RSS /blog.
- U1.4 boton "reportar bug" en shell -> POST /api/feedback.

### P5 - Integraciones (requieren decision humana o sesion concurrente)
- I1.1 AutoPub Meta/X/LinkedIn: dossier app review + adaptadores.
- I1.2 Fase D paso 3: ventana WebView2 real + medir RAM.
- I1.3 OpenShorts 9:16 self-host integrado con screenflow.
- I1.4 F5 analytics: YouTube Data API -> KPIs reales.

## Orden de ejecucion propuesto (build)
1. B0.1 (bug) -> 2. B0.2+B0.3 -> 3. C1.2+E1.3 (quick wins) -> 4. E1.1 (docs) ->
5. L1.1-L1.3 (harness) -> 6. C1.1 (razonamiento) -> 7. U1.1-U1.4 (producto).
E1.2/E1.4/I* -> esperar decision humana o sesion concurrente.

## Archivos a tocar (staging explicito, fase build)
- B0.1: desktopFase/launcher/launcher.mjs + %TEMP%\opencode\waitweb-decisive.cjs
  (evidencia) + scripts/build-prototipo.py (regenerar zip) + STATE.md (High Priority)
- B0.2: package.json (raiz prebuild) o scripts/loop_piv.py
- B0.3: desktopFase/launcher/launcher.mjs
- C1.2: packages/core/src/shared/domain.ts + ai/llm.ts + domain.test.ts
- E1.3: packages/core/src/tools/reach.ts + reach.test.ts
- E1.1: docs/COSTOS.md (nuevo)
- L1.1-L1.3: scripts/loop_piv.py + loop-budget.md + docs
- C1.1: learning/truth/* (nuevos casos) + learning/scripts/verify.py + tests
- U1.x: apps/web/src/app/** + components (dashboard, shell, blog)
- NO TOCAR: recorder.ts/automation.ts + tests + docs/RAZONAMIENTO-MEDIA-AUTOMATION.md
  + learning/sources/media-automation.md (sesion concurrente #25)

## Criterios de verificacion
- Por item: scoped (tests del paquete afectado) + typecheck.
- FULL antes de cada commit: typecheck -> lint -> test -> build (628 + nuevos).
- B0.1: smoke real del zip: server directo 200 + launcher --web-dir PASS <15s +
  killTree deja 3000 libre.

## Riesgos / guardas
- NO tocar trabajo de sesion concurrente (#25) — aislar a %TEMP% solo para gates.
- Sin push/merge (aprobacion humana). Paths denylisted intactos.
- PS 5.1: escribir archivos con WriteAllText UTF8 sin BOM (nunca Set-Content).
- Decision humana esperada: E1.2, E1.4, I1.1, I1.2, backlog #6 y #17.

## Esfuerzo estimado
- Total: alto (~10-12 ciclos PIVR). P0: medio (B0.1 el mas incierto). P1: bajo-medio.
  P2: bajo. P3: medio. P4: medio. P5: alto (decisiones humanas).