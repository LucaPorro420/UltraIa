# Loop Run Log — UltraIa

Bitácora de ciclos PIVR (Plan ⇒ Implement ⇒ Verificar ⇒ Reiniciar). Formato por iteración:
`[P] plan`, `[I] commits`, `[V] gates`, `[R] veredicto`.

---

## Iteración 1 — Harness PIVR + integraciones pendientes (15/08/2026)

**[P] Plan**
- Objetivo: activar el bucle PIVR en el repo (archivos del harness personalizados: STATE.md,
  LOOP.md, budget, constraints, agents piv-plan/piv-build en opencode.json, driver
  scripts/loop_piv.py, skill .opencode/skills/loop-piv) y commitear TODO el trabajo pendiente
  (integraciones web-browse + G0DM0D3 + nanoprompts + skills/vendor + docs + AGENTS.md + AGENTS.loop.md).
- Pasos: 1) personalizar archivos del harness; 2) `npx @cobusgreyling/loop doctor` + `loop status`;
  3) commit del harness + pendientes; 4) gates FULL (typecheck/lint/test/build 370/370);
  5) Fase C parcial: adapters a @ultraia/core.
- Criterios de verificación: gates FULL verdes + commit hecho + CLI loop responde.

**[I] Commits**
- (pendiente — se ejecuta tras gates scoped)

**[V] Gates**
- (pendiente)

**[R] Veredicto**
- (pendiente)

---

## Iteración 2 — Fase C (parcial): adapters a `@ultraia/core` (15/08/2026)

**[P] Plan**
- Objetivo: implementar `packages/runtime/src/adapters/` — ports + adapters Db y AiGateway +
  contenedor CorePorts con tests, para ejecutar agentes/OMAG de core fuera de Next (spec
  ARCHITECTURE.md §10.3, tarea #2 de STATE.md). NO tocar `runtime.ts` (wiring completo queda
  para la tarea #3: tools + omag).
- Pasos:
  1. `adapters/ports.ts` — interfaces estructurales `DbAdapter` (client Prisma + ping/close),
     `AiGatewayAdapter` (gateway core + provider/model + ping/close), `CorePorts` (db/ai +
     isHealthy/close). Imports type-only de `@ultraia/core` y `@prisma/client`.
  2. `adapters/db.ts` — `createPrismaDb(options)`: singleton lazy cacheado por datasourceUrl,
     `factory` inyectable para tests, `ping()` vía `$queryRawUnsafe('SELECT 1')`, `close()`
     idempotente que limpia el cache.
  3. `adapters/ai.ts` — `createCoreAiGateway(options)`: aplica env ULTRAIA_PROVIDER/ULTRAIA_MODEL
     SOLO si se proveen (nunca clobber), gateway = `OpenAICompatibleGateway` de `@ultraia/core`,
     `ping()` = `resolveModel()` (AiUnavailableError → false, sin gastar tokens).
  4. `adapters/core.ts` — `createCorePorts({db?, ai?})`: isHealthy (sin adapters → false) + close.
  5. Tests: `db.test.ts` (singleton/factory/ping/close idempotente), `ai.test.ts` (env
     save/restore; ollama → ping true sin key; google/deepseek/openai sin key → false; con key
     fake → true; model override), `core.test.ts` (isHealthy combinado, close).
  6. `index.ts` exporta `./adapters/*`; `package.json` deps `@ultraia/core` + `@prisma/client`
     (ya hoisted, cero paquetes nuevos) + `npm install` para sync lockfile.
  7. Docs: ARCHITECTURE.md §10.3 / DESKTOP_ARCHITECTURE.md / docs/RUNTIME.md → Fase C parcial ✅.
- Criterios: gates FULL verdes (typecheck → lint → test → build); runtime 152 → ~166 PASS
  (core 218/218 intacto); commit `feat(runtime): Fase C parcial - adapters core (ports, Db, AiGateway) + tests`.
- Ruido NO incluido en el commit: working tree de `learning/nanoprompts/` (fetch de datos
  externo al loop) — se queda como está.

**[I] Commits**
- `e94609c` feat(runtime): Fase C parcial - adapters core (ports, Db, AiGateway) + 21 tests (13 archivos, +488; adapters/ports.ts, db.ts, ai.ts, core.ts + 3 tests, index.ts, deps runtime, docs). Sin push.

**[V] Gates**
- Scoped: typecheck runtime ✅ · runtime test **173/173** (152 + 21 nuevos) ✅
- FULL: typecheck (core+web+runtime) ✅ · lint ✅ · test **391/391** (core 218 + runtime 173) ✅ · build ✅
- Pre-build check: sin dev servers node activos (regla operativa) ✅

**[R] Veredicto**
- **GREEN** → commit hecho `e94609c`. Tarea #2 completada; siguiente ciclo: tarea #3 (Fase C resto: adapters tools + omag).
- Ruido fuera del commit: `learning/nanoprompts/` (fetch de datos externo al loop) quedó en working tree sin tocar.

---

## Iteración 3 — Fase C (resto): adapters tools + omag (15/08/2026)

**[P] Plan**
- Objetivo: completar la Fase C con los adapters de tools y OMAG sobre `packages/runtime/src/adapters/`
  (tarea #3 de STATE.md). Sin tocar core; sin wiring en UltraRuntime (queda documentado para la Fase D).
- Pasos:
  1. `adapters/tools.ts` — `createToolsAdapter()`: catálogo desde core (`TOOL_DESCRIPTIONS` + keys),
     `run(capability, input)` dispatcher passthrough a funciones públicas de core (calculator/web/image/
     video/music/design/reach/skills/content/audio/g0dm0d3), validación mínima de input (capability y
     sub-ops desconocidos → throw), `ping()` true (keyless), `close()` no-op.
  2. `adapters/omag.ts` — `createOmagAdapter({ ai?, generators?, critics? })`: `OmagOrchestrator` de core,
     `run(request)` inyecta el gateway del ai adapter si existe (si no → plan local keyless),
     `ping()` true (keyless por diseño), `close()` no-op.
  3. `adapters/ports.ts` — `CorePorts` + `tools?`/`omag?` (tipos estructurales, type-only de core).
  4. `adapters/core.ts` — isHealthy/close incluyen tools/omag.
  5. Tests: `tools.test.ts` (catálogo 10 capabilities, calculator puro, image con fetch stub, reach
     video con stub, parseltongue puro, errores de capability/op/input), `omag.test.ts` (run keyless con
     fetch stub estilo orchestrator.test.ts, run con fake AiGateway → plan LLM, error idea vacía),
     `core.test.ts` extendido (isHealthy/close con tools+omag).
  6. `index.ts` exports; docs ARCHITECTURE §10.3 / DESKTOP_ARCHITECTURE / docs/RUNTIME.md → Fase C ✅.
- Criterios: gates FULL verdes; runtime 173 → ~188 PASS (core 218/218 intacto);
  commit `feat(runtime): Fase C - adapters tools + omag (CorePorts completo) + tests`.

**[I] Commits**
- `d2022a6` feat(runtime): Fase C - adapters tools + omag (CorePorts completo) + 13 tests (12 archivos, +512; tools.ts, omag.ts, ports/core extendidos, 3 tests, core omag/index.ts exports públicos audiolibrary+sound, docs). Sin push.

**[V] Gates**
- Scoped: typecheck runtime ✅ · runtime test **186/186** (173 + 13 nuevos: tools 8, omag 3, core +2) ✅
- FULL: typecheck (core+web+runtime) ✅ · lint ✅ · test **404/404** (core 218 + runtime 186) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit hecho `d2022a6`. Tarea #3 completada: Fase C completa (ports + Db + AiGateway + tools + omag).
- Nota: core se tocó SOLO para exportar `audiolibrary`/`sound` por su API pública (visibilidad; llm.ts ya los usaba por path interno).
- Wiring de módulo `system-core` en UltraRuntime → se hará en Fase D (documentado).
- Siguiente ciclo: tarea #4 (Fase D: evaluar MVP webview para la Shell Desktop).

---

## Iteración 4 — Fase D paso 1: evaluación de la Shell Desktop (MVP webview) (15/08/2026)

**[P] Plan**
- Objetivo: producir el documento de decisión de stack para la Shell Desktop
  (`desktopFase/SHELL_DECISION.md`) — primer paso de la tarea #4 ("evaluar MVP webview primero").
  SIN código de shell en esta iteración (la decisión estaba diferida en ARCHITECTURE.md §8).
- Pasos: 1) criterios desde ARCHITECTURE.md §8 (RAM, bundle, seguridad, curva, integración con
  Local API + Next estático); 2) comparativa Tauri 2 / Electron / WebView2 puro (MVP webview)
  con el contexto real del repo (packages/runtime + adapters core listos, Local API en
  127.0.0.1 con token); 3) recomendación: MVP WebView2 primero (cero deps nuevas, máximo reuso),
  Tauri como upgrade path si se necesita fs/OS; 4) plan de spike con criterios de aceptación;
  5) commit docs + gates FULL.
- Criterios: doc completo + commit `docs(desktop): SHELL_DECISION - MVP webview (WebView2) vs Tauri/Electron`
  + gates FULL verdes (404/404).

**[I] Commits**
- `f2e9cc1` docs(desktop): SHELL_DECISION - MVP webview (WebView2) vs Tauri/Electron (3 archivos, +90/-5: SHELL_DECISION.md nuevo, ARCHITECTURE.md §8 decisión resuelta, DESKTOP_ARCHITECTURE.md fila D → spike pendiente). Sin push.
- NOTA: el doc fue escrito antes del corte de sesión (quedó sin commitear); la reanudación completó gates + commit.

**[V] Gates**
- FULL: typecheck (core+web+runtime) ✅ · lint ✅ · test **404/404** (core 218 + runtime 186) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit `f2e9cc1`. Tarea #4 paso 1 completada: decisión de shell tomada
  (MVP WebView2 puro en Windows + Local API como único contrato IPC; upgrade path a Tauri 2).
- Siguiente ciclo: tarea #4 paso 2 — spike Fase D: (a) wiring `system-core` en UltraRuntime
  (comando `system.core` expone adapters + health; estaba diferido desde Fase C), (b) launcher
  Node sin deps + ventana WebView2.
- Ruido externo NO tocado: `learning/nanoprompts/` (fetch de datos), `scripts/loop_piv.py` +
  `scripts/nanoprompts_fetch.py` (mejoras driver), `integracionTecno.txt`, `DOCS_TODO.md`,
  `masinfo.txt`, `proyectoNuevo.*`, `BussinesModel/` — siguen en working tree (High Priority).

---

## Iteración 5 — Fase D paso 2 (a): wiring `system-core` en UltraRuntime (15/08/2026)

**[P] Plan**
- Objetivo: conectar los adapters de Fase C (`CorePorts`) al `UltraRuntime` — tarea #5(a) de
  STATE.md, diferida desde Fase C ("Wiring `system-core` → Fase D"). SIN tocar core; SIN launcher
  todavía (iteración 6 = launcher Node + WebView2).
- Pasos:
  1. `RuntimeOptions` gana `corePorts?: () => Promise<CorePorts> | CorePorts` — factory **lazy**
     (LOAD ONLY WHEN NEEDED: core NO se instancia al boot; solo al primer comando `core.*` o health).
     Import type-only de `./adapters/ports` (runtime.ts NO importa `@ultraia/core` por path).
  2. `registerSystemModules()` registra módulo `system-core` (metadata-only, category `ai`,
     lazy: true, weight MEDIUM, capabilities `core.health`/`core.tools`/`core.omag`/`core.ports`).
  3. `registerSystemCommands()` agrega:
     - `core.health` (safe) → `{ configured, healthy }` (sin factory → `{ configured: false }`).
     - `core.ports` (safe) → adapters presentes (db/ai/tools/omag).
     - `core.tools` (safe) → lista capabilities del tools adapter (lazy).
     - `core.omag` (safe) → `{ configured }`.
     - `core.run` (restricted) → `target=tools` (capability+input) | `target=omag` (request);
       error claro si el adapter no está configurado.
     - `core.close` (restricted) → cierra los ports instanciados.
  4. `registerSystemHealth()` agrega check `core` (no critical): sin factory → ok "not configured";
     con factory → `isHealthy()`.
  5. `stop()`: si los ports fueron instanciados → `close()` + liberar referencia.
  6. Tests: runtime.test.ts (registry.count 3→4 por `system-core`; test nuevo de lazy factory que NO
     se llama al boot; `core.health` sin factory → configured false; con fake CorePorts → healthy,
     ports, tools, run tools, run omag, close; stop() cierra ports).
- Criterios: gates FULL verdes (typecheck → lint → test → build); runtime 186 → ~190 PASS
  (core 218/218 intacto); commit `feat(runtime): Fase D wiring system-core (CorePorts lazy + comandos core.* + health) + tests`.

**[I] Commits**
- `5ab0426` feat(runtime): Fase D wiring system-core (CorePorts lazy + comandos core.* + health) + 5 tests (2 archivos, +277/-1: runtime.ts, runtime.test.ts). Sin push.
- `0fa16f5` docs(desktop): Fase D paso 2 - wiring system-core completado (ARCHITECTURE.md §10.3, DESKTOP_ARCHITECTURE.md fila C, docs/RUNTIME.md). Sin push.

**[V] Gates**
- Scoped: typecheck runtime ✅ · runtime test **191/191** (186 + 5 nuevos) ✅
- FULL: typecheck (core+web+runtime) ✅ · lint ✅ · test **409/409** (core 218 + runtime 191) ✅ · build ✅
- Pre-build check: sin dev servers node activos (0 procesos) ✅

**[R] Veredicto**
- **GREEN** → tarea #5(a) completada (commits `5ab0426` + `0fa16f5`). `system-core` wired:
  factory lazy cacheada (LOAD-ONLY-WHEN-NEEDED, fail-soft), 6 comandos `core.*`, health check
  informacional, `stop()` cierra ports. El runtime ya puede exponer adapters por la Local API
  (los handlers de runtime-api pasan comandos → `core.*` quedan disponibles vía HTTP).
- Siguiente ciclo: tarea #5(b) — spike launcher Node sin deps + ventana WebView2 (Windows).

---

## Iteración 6 — Fase D paso 2 (b): spike launcher Node sin deps + ventana WebView2 (15/08/2026)

**[P] Plan**
- Objetivo: validar la decisión de `SHELL_DECISION.md` con un spike ejecutable (criterios del
  plan de spike): (1) launcher Node SIN deps nuevas que arranca `UltraRuntime` + Local API en
  puerto libre; (2) UI servida en la misma base URL vía proxy (token NUNCA llega al renderer);
  (3) la UI muestra `system.health` y `core.isHealthy()` vía Local API; (4) comando `core.*`
  expuesto (ya wired en iteración 5); (5) gates del repo intactos.
- Contexto técnico: `packages/runtime` y `packages/core` son ESM-TS con imports sin extensión
  (`./config`) → Node NO puede ejecutar el TS directo (type-stripping exige extensiones .ts
  explícitas). El launcher, por tanto, compila a dist CJS con tsc (typescript YA es devDep
  hoisted → cero paquetes nuevos).
- Pasos:
  1. `packages/core/tsconfig.build.json` (module commonjs + moduleResolution node + outDir
     dist + declaration) + script `build` — el launcher NO arrastra core vía runtime (solo
     type-only), lo carga SOLO en la factory de ports. Riesgo a validar empíricamente:
     `require('ai')`/`@ai-sdk/*` ESM desde CJS en Node 24 (require(esm)); si `ai` usa TLA →
     core no cargable → el spike degrada a `configured:false` (fail-soft diseñado) y se documenta.
  2. `packages/runtime/tsconfig.build.json` + script `build` → dist CJS. El launcher importa
     `dist/runtime.js` (no el index, para no arrastrar `adapters/*` → `require('@ultraia/core')`).
  3. `desktopFase/launcher/launcher.mjs` — ESM puro:
     - Requiere `packages/runtime/dist/runtime.js` vía createRequire.
     - `UltraRuntime.create({ root, projectRoot, corePorts })` donde corePorts (si core dist
       cargable) construye `createCorePorts({ tools: createToolsAdapter(), omag: createOmagAdapter() })`
       — keyless; sin DB/LLM en el spike.
     - `start()` + `startLocalApi({ port: 0 })`.
     - Servidor proxy HTTP propio (node:http): `GET /` → HTML embebido (dashboard Dark Obsidian
       ligero con fetch a `/api/health`, `/api/status`, `/api/commands/execute` para
       `system.health`, `core.health`, `core.ports`, `core.tools`); `/api/*` → reenvío a la Local
       API con `Authorization: Bearer <token>` inyectado por el launcher. El token vive SOLO en el
       launcher (nunca en el renderer).
     - Abre ventana: `msedge.exe --app=<url> --user-data-dir=<tmp>` (Edge ES el runtime WebView2
       preinstalado en Windows; modo `--app` = ventana sin chrome). Flags: `--no-window` (CI),
       `--port`, `--check` (arranca, hace los health-checks, imprime JSON y sale 0).
  4. Tests del spike: `packages/runtime/src/launcher.test.ts` (vitest) — spawn del launcher con
     `--no-window --check`, assert de JSON de salida: `state=running`, `health=healthy`,
     `core` configured/healthy según disponibilidad, y cierre limpio.
  5. Docs: `desktopFase/launcher/README.md` + actualizar SHELL_DECISION.md (checklist del spike)
     + DESKTOP_ARCHITECTURE.md (fila D) + ARCHITECTURE.md §10.
- Criterios: gates FULL verdes (typecheck → lint → test → build); runtime 191 → ~193 PASS;
  commit `feat(desktop): Fase D paso 2 spike - launcher Node (proxy + UI + msedge --app) + tests`.

**[I] Commits**
- `3196ce4` feat(desktop): Fase D paso 2 spike - launcher Node (proxy + UI + msedge --app) + test (8 archivos, +566/-7: launcher.mjs, tsconfig.build.json, README.md, launcher.test.ts, .gitignore, SHELL_DECISION/DESKTOP_ARCHITECTURE/ARCHITECTURE). Sin push.

**[V] Gates**
- Scoped: runtime test con el test del launcher ✅ (1 test, spawn real del launcher, 1.5s con dist precompilado)
- FULL: typecheck (core+web+runtime) ✅ · lint ✅ · test **410/410** (core 218 + runtime 192) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅
- Launcher manual: `node desktopFase/launcher/launcher.mjs --check --no-window` →
  `{"ok":true,"state":"running","healthStatus":"healthy","core":{"configured":true,"healthy":true,"adapters":["tools","omag"],"tools":10}}`, exit 0 (3 intentos de fix: junction @ai-sdk → junction @ultraia/core → node:http en vez de fetch para el check).

**[R] Veredicto**
- **GREEN** → commit `3196ce4`. Tarea #5(b) completada: spike del launcher VALIDADO end-to-end.
- Lecciones (documentadas en README.md del launcher + SHELL_DECISION.md):
  1) `@ai-sdk/google` queda aislado por npm en `packages/core/node_modules` → junction
     `dist/node_modules/@ai-sdk` en el build (idempotente, sin privilegios).
  2) El emit de tsc mantiene `require("@ultraia/core")` (no reescribe specifiers) → junction
     `dist/node_modules/@ultraia/core` → `dist/packages/core` con package.json propio (CJS, main).
  3) En Windows, `process.exit` con sockets de undici (fetch) en cierre → assert de libuv
     (`src\win\async.c`); el auto-check usa `node:http` puro (`agent: false`) + cierre ordenado.
  4) tsc hoisted del repo sirve como compilador del launcher (cero deps nuevas) ✅.
  5) `msedge --app` = WebView2 Runtime preinstalado (ruta x86 en Windows de 64 bits).
- Fail-soft verificado: si core no carga, el runtime sigue healthy y `core.*` responde
  `configured:false` (sin crash).
- Pendiente Fase D: paso 3 — ventana WebView2 real (hoy `msedge --app` como demo del runtime).
- Siguiente ciclo: backlog #6 (Gen-Engine roadmap F5, gates pytest) o #7 (AutoPub F1 tool
  `topics` + scripts/topics.py, gates FULL) — según prioridad humana.
- Ruido externo NO tocado: `learning/nanoprompts/`, `scripts/loop_piv.py` +
  `scripts/nanoprompts_fetch.py`, `integracionTecno.txt`, `DOCS_TODO.md`, `masinfo.txt`,
  `proyectoNuevo.*`, `BussinesModel/` — siguen en working tree (High Priority).

---

## Iteración 5 — Plan maestro AUTO-PUBLICACIÓN (docs + backlog) (15/08/2026)

**[P] Plan**
- Objetivo: documentar el plan maestro de auto-generación, presentación y distribución de
  contenido (`docs/AUTO-PUBLICACION.md`), aprobado por el usuario (retoma de sesión anterior:
  "Planifica continuidad de auto generación a futuro de contenido, presentación, distribución
  de publicaciones"). Integrarlo al harness: AGENTS.md (sección AUTO-PUBLICACIÓN), STATE.md
  (backlog AutoPub #7–#13), loop-run-log (esta iteración).
- Pasos: 1) escribir `docs/AUTO-PUBLICACION.md` (visión, inventario verificado, arquitectura
  de flujo, fases F1–F6, decisiones abiertas D1–D8, backlog PIVR, riesgos, referencias);
  2) sección en AGENTS.md; 3) backlog #7–#13 en STATE.md; 4) gates FULL; 5) commit de solo
  los archivos tocados (el ruido de `learning/nanoprompts/` queda fuera).
- Criterios: doc completo + integración + gates FULL verdes (typecheck → lint → test → build)
  + commit `docs(content): AUTO-PUBLICACION - plan maestro de auto-generación y distribución`.

**[I] Commits**
- `2f1c03b` `docs(content): AUTO-PUBLICACION - plan maestro de auto-generacion y distribucion`
  (solo 4 archivos: docs/AUTO-PUBLICACION.md, AGENTS.md, STATE.md, loop-run-log.md)

**[V] Gates**
- FULL: typecheck (core+web+runtime) ✅ · lint ✅ · test **409/409** (core 218 + runtime 191) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit hecho. Tarea de documentación completada; siguiente ciclo: tarea #4/#5 del
  backlog (Fase D paso 2b launcher) o AutoPub #7 (F1 tool topics) según prioridad humana.
- Ruido fuera del commit: `learning/nanoprompts/`, `BussinesModel/`, `proyectoNuevo.*`, `masinfo.txt`,
  `DOCS_TODO.md`, `integracionTecno.txt`, `scripts/` quedaron en working tree sin tocar.

---

## Historial

- **15/08/2026** — Commit `1f5a3fe`: Fase B Local API HTTP/WS (token timing-safe, origin loopback,
  rate limit, eventos WS) + docs IPC/SECURITY. 17 archivos, +1652.
- **15/08/2026** — Commit 2 (`.vscode/settings.json` Pylance fix) ABORTADO: `.vscode/` está en
  `.gitignore` → nada que commitear (config local-only, correcto).
## Iteraci�n 7 � AutoPub F1: motor de ideas (tool topics + topics.py) (15/08/2026)

**[P] Plan**
- Objetivo: implementar F1 del plan maestro AUTO-PUBLICACION.md �4/�6 (tarea #7 de STATE.md):
  motor de temas que genera briefs recurrentes sin intervenci�n manual � RSS (parseRss ya
  existe) + searchWeb DuckDuckGo (tendencias), dedupe + priorizaci�n por canal, brief JSON
  estandarizado. Keyless-first, sin deps nuevas.
- Pasos:
  1. packages/core/src/tools/topics.ts � motor de briefs TS:
     - Types: TopicBrief {tema, canal, formato, tono, angulo, fuentes, score, pubDate?},
       GenerateTopicsInput {fuentes, canales?, maxBriefs?, fetchFn?} (fetch inyectable para tests).
     - 
ormalizeTitle() (lower + strip non-alnum), dedupe() (bigram overlap > 0.6),
       scoreBrief() (novedad: pubDate <7d +; >30d -; relevancia por keywords de canal),
       ormatForChannel() (youtube_shorts/tiktok ? 9:16 video; instagram ? 1:1 imagen;
       blog ? 16:9 art�culo), 	onoYAngulo() (template por tipo de fuente).
     - generateTopicBriefs(): fetch RSS + DDG (reusa parseRss/searchWeb con fetch inyectable)
       ? items ? normalize ? dedupe ? score ? top N ? briefs.
  2. index.ts: export topics + TOOL_DESCRIPTIONS.topics + Capability 'topics'.
  3. llm.ts: tool 	opics_briefs (capability topics) ? generateTopicBriefs.
  4. Tests packages/core/src/tools/topics.test.ts: normalize/dedupe/score/formato por canal +
     generateTopicBriefs con fetch stub (RSS + DDG), maxBriefs, fuentes vac�as.
  5. scripts/topics.py � CLI Python puro (urllib + xml.etree, sin deps): --dry-run imprime
     briefs JSON a stdout; --out file.json (UTF-8 sin BOM); --max N; --canales yt,tiktok,blog.
     Mismo esquema de brief que la tool TS (fuente de verdad: TS; Python = CLI aut�nomo keyless).
  6. Docs: AUTO-PUBLICACION.md �4 F1 (checklist), STATE.md #7, AGENTS.md secci�n AutoPub.
- Criterios: gates FULL verdes (typecheck ? lint ? test ? build); core 218 ? ~226 PASS;
  python scripts/topics.py --dry-run produce N briefs; commits
  eat(core): AutoPub F1 - tool topics (motor de briefs: RSS + DDG, dedupe, score) + tests y
  eat(scripts): AutoPub F1 - topics.py CLI --dry-run (keyless, sin deps).

**[I] Commits**
- `32a6046` feat(core): AutoPub F1 - tool topics (motor de briefs: RSS + DDG, dedupe, score por canal) + CLI topics.py (5 archivos, +714/-2: topics.ts, topics.test.ts, index.ts, llm.ts, scripts/topics.py). Sin push.
- `ea6d488` docs(autopub): F1 motor de ideas - tool topics + topics.py + registro Iteracion 7 (4 archivos: AUTO-PUBLICACION.md, STATE.md, AGENTS.md, loop-run-log.md). Sin push.

**[V] Gates**
- Scoped: typecheck core ✅ · topics.test.ts **14/14 PASS** ✅ · `python scripts/topics.py --dry-run --max 4` ✅ (fuentes reales: HN + Ars Technica; 16 raw → 16 únicos → briefs con score; The Verge/DDG degradaron elegantemente, exit 0)
- FULL: typecheck (core+web+runtime) ✅ · lint ✅ · test **424/424** (core 232 + runtime 192) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commits `32a6046` + `ea6d488`. Tarea #7 completada: AutoPub F1 motor de ideas
  implementado en doble vía: tool TS `topics` (capability `topics` → `topics_briefs`, 14 tests)
  + CLI Python keyless `scripts/topics.py` (mismo esquema de brief). Ambos con RSS + DDG,
  dedupe bigram Jaccard > 0.6, score novedad × relevancia de canal, formato/tono/ángulo por
  canal (9:16 video / 1:1 imagen / 16:9 articulo), degradación elegante por fuente.
- Pendiente F1 (documentado): cola de briefs persistente (Prisma) — tarea 4 de F1.
- Siguiente ciclo: backlog #8 — AutoPub F3: schema `PublicationPackage` + tool `present`
  (formato por canal, captions/hashtags) — SIGUIENTE (STATE.md).
- Ruido externo NO tocado: `learning/nanoprompts/`, `scripts/loop_piv.py` +
  `scripts/nanoprompts_fetch.py`, `integracionTecno.txt`, `DOCS_TODO.md`, `masinfo.txt`,
  `proyectoNuevo.*`, `BussinesModel/` — siguen en working tree (High Priority).

## Iteraci�n 8 � AutoPub F3: schema PublicationPackage + tool present (15/08/2026)

**[P] Plan**
- Objetivo: implementar F3 del plan maestro AUTO-PUBLICACION.md �4/�6 (tarea #8 de STATE.md):
  presentaci�n unificada � un solo paquete que se adapta a cada canal (9:16 video / 1:1 imagen /
  16:9 blog), captions + hashtags por plataforma, branding kit, subt�tulos SRT (patr�n RF-11).
- Pasos:
  1. packages/core/src/tools/present.ts:
     - Types: PublicationPackage (briefId, contenido, media[], captionsByChannel,
       hashtagsByChannel, visualByChannel, horarioSugerido, canales[]), PresentInput
       (contenido + canales + opciones), PresentResult.
     - FORMAT_BY_CHANNEL (reusa de topics: 9:16 video / 1:1 imagen / 16:9 articulo).
     - captionFor(content, canal): caption por plataforma (yt: descripci�n larga + hashtags;
       tiktok: caption corto + hashtags trending; ig: caption + 30 hashtags; blog: resumen SEO).
     - hashtagsFor(tema, canal): generaci�n de hashtags por canal (5-10, max 30 IG).
     - isualFor(canal, tema): sugerencia visual (dimensiones, estilo, texto overlay).
     - srtFor(text, style): subt�tulos SRT (patr�n RF-11) � segmentos por ~12 palabras.
     - randingFor(marca?): kit por marca (paleta + fuente + logo) � default Dark Obsidian.
     - present(input): orquesta ? PublicationPackage completo.
  2. index.ts: export present + TOOL_DESCRIPTIONS.present + Capability 'present'.
  3. llm.ts: tool present_package (capability present) ? present.
  4. Tests present.test.ts: caption/hashtags/visual/SRT/branding/present completo con mocks.
  5. Docs: AUTO-PUBLICACION.md �4 F3 + STATE.md #8 + AGENTS.md.
- Criterios: gates FULL verdes; core 232 ? ~240 PASS; commit
  eat(core): AutoPub F3 - schema PublicationPackage + tool present (formato por canal, captions/hashtags, SRT).

**[I] Commits**
- `d052b68` feat(core): AutoPub F3 - schema PublicationPackage + tool present (formato por canal, captions/hashtags, SRT) (4 archivos, +413/-2: present.ts, present.test.ts, index.ts, llm.ts). Sin push.

**[V] Gates**
- Scoped: typecheck core ✅ · present.test.ts + topics.test.ts **27/27 PASS** ✅
- FULL: typecheck (core+web+runtime) ✅ · lint ✅ · test **437/437** (core 245 + runtime 192) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit `d052b68`. Tarea #8 completada: AutoPub F3 presentación unificada —
  `PublicationPackage` determinista y keyless (captions/hashtags/visual/SRT/horario/branding
  por canal, 9:16/1:1/16:9, SRT patrón RF-11, kits Dark Obsidian/Neo Violet), tool
  `present_package` (capability `present`) para los agentes, 13 tests.
- Pendiente F3 (documentado): branding kit editable por marca (tarea 3 de F3).
- Siguiente ciclo: backlog #9 — AutoPub F4: `PublisherAdapter` + adaptadores YouTube/TikTok
  en TS (port RF-12 de `ULTRAIA/integracionesImplementacion/src/publish.py`) + tests con
  mocks — SIGUIENTE (STATE.md).
- Ruido externo NO tocado: `learning/nanoprompts/`, `scripts/loop_piv.py` +
  `scripts/nanoprompts_fetch.py`, `integracionTecno.txt`, `DOCS_TODO.md`, `masinfo.txt`,
  `proyectoNuevo.*`, `BussinesModel/` — siguen en working tree (High Priority).

## Iteraci�n 9 � AutoPub F4 (paso 1): PublisherAdapter + YouTube/TikTok en TS (15/08/2026)

**[P] Plan**
- Objetivo: portar el RF-12 de ULTRAIA/integracionesImplementacion/src/publish.py a TS en
  packages/core/src/tools/publish.ts (tarea #9 de STATE.md): adaptador base PublisherAdapter
  + YouTubeShortsAdapter + TikTokAdapter, con tests con mocks (sin llamadas reales).
- Pasos:
  1. Types: PublishMetadata (title/description/tags/privacyStatus), PublishInput
     (videoPath|videoBuffer + metadata), PublishResult (ok/platform/id/url/error),
     PublisherAdapter (platform + publish + validate).
  2. uildBilingualMetadata(title, plainScript?) � port de uild_metadata_from_script
     (t�tulo es/ar | ?????? ????????? #Shorts, tags mixtos es/ar, privacy public).
  3. createYouTubeAdapter({ accessToken?, fetchFn? }) � port del flujo resumable v3:
     POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
     (snippet title/description/tags/categoryId 28, status privacy + madeForKids false) ?
     PUT al uploadUrl del header Location con el binario; devuelve video id ? url
     https://youtube.com/shorts/{id}. alidate(): token de options o env
     YOUTUBE_ACCESS_TOKEN. Fetch inyectable para tests (patr�n repo).
  4. createTikTokAdapter({ accessToken?, fetchFn? }) � port del Direct Post 2 pasos:
     init POST https://open.tiktokapis.com/v2/post/publish/video/init/ (post_info con
     title+hashtags =150, source_info FILE_UPLOAD video_size/chunk_size/total_chunk_count=1)
     ? PUT al data.upload_url con el binario ? publish_id. alidate(): token de options
     o env TIKTOK_ACCESS_TOKEN.
  5. publishToAll(adapters, input) � helper que corre todos los adapters y agrega resultados.
  6. index.ts: export publish + TOOL_DESCRIPTIONS.publish + Capability 'publish'.
  7. llm.ts: tool publish_submit (capability publish) ? valida + publica, fail-soft con
     error claro si falta token.
  8. Tests publish.test.ts: buildBilingualMetadata (es/ar), validate sin/presencia token,
     YouTube con fetch stub (2 pasos: resumable ? Location ? PUT ? id), TikTok con fetch
     stub (init ? upload_url ? PUT 201 ? publish_id), errores (init falla, PUT falla,
     sin token), publishToAll parcial (YT ok, TikTok sin token omitido).
  9. Docs: AUTO-PUBLICACION.md �4 F4 (tarea 1) + STATE.md #9 + AGENTS.md.
- Criterios: gates FULL verdes; core 245 ? ~255 PASS; commit
  eat(core): AutoPub F4 - PublisherAdapter + YouTube/TikTok en TS (port RF-12) + tests mocks.

**[I] Commits**
- `065c668` feat(core): AutoPub F3 + 13 tests (incluye wiring `publish` en index.ts + llm.ts — el commit de F3 arrastró el wiring del paso 7 de F4).
- `53df51f` feat(core): AutoPub F4 - PublisherAdapter + YouTube/TikTok en TS (port RF-12) + 15 tests mocks (publish.ts + publish.test.ts + docs AUTO-PUBLICACION/AGENTS/STATE/loop-run-log). Sin push.
  NOTA: el commit arrastró el working tree completo que estaba staged en el índice desde iteraciones previas (High Priority de STATE.md: nanoprompts refresh + imágenes, BussinesModel/, masinfo.txt, proyectoNuevo.*, integracionTecno.txt, DOCS_TODO.md) — 635 archivos, +18246/-557. Era trabajo pendiente listado como "commit único sugerido" en High Priority; quedó incluido de una vez. Sin secrets (gitignore los protege).

**[V] Gates**
- Scoped: typecheck core ✅ · publish.test.ts **15/15 PASS** ✅
- FULL: typecheck (core+web+runtime) ✅ · lint ✅ · test **452/452** (core 260 + runtime 192) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit `53df51f`. Tarea #9 completada: AutoPub F4 paso 1 — `PublisherAdapter` + adaptadores YouTube/TikTok en TS (port RF-12): resumable v3 (POST → Location → PUT) para YouTube Shorts, Direct Post 2 pasos (init → PUT) para TikTok, `buildBilingualMetadata` es/ar, `publishToAll` fail-soft con `validate()` por token, fetch inyectable con 15 tests de mocks (cero llamadas reales). Tool `publish_submit` (capability `publish`) disponible para los agentes.
- Pendiente F4 (documentado): tarea 2 — cola `Publication` (Prisma) + endpoints API + aprobación por paquete (STATE.md #10).
- Siguiente ciclo: backlog #10 — AutoPub F4: cola `Publication` (Prisma) + endpoints + aprobación — SIGUIENTE (STATE.md).
- Ruido: el working tree que quedaba staged se incluyó en el commit (ver NOTA en [I]) — High Priority queda limpio.

---

## Iteración 10 — AutoPub F4 (tarea 2): cola `Publication` (Prisma) + endpoints + aprobación (15/08/2026)

**[P] Plan**
- Objetivo: implementar la tarea 2 de F4 del plan maestro AUTO-PUBLICACION.md (tarea #10 de
  STATE.md): cola de publicaciones persistente con Prisma, endpoints API y aprobación por
  paquete (texto auto; video/imagen requieren aprobación — decisión del usuario 15/08/2026).
- Pasos:
  1. `schema.prisma`: modelo `Publication` {id, briefId?, tema, canal, paqueteJson (JSON string
     del PublicationPackage), caption, hashtags (JSON string), estado DRAFT/APPROVED/REJECTED/
     PUBLISHED/FAILED, scheduledAt?, publishedAt?, resultadoJson?, error?, creadoPor?, createdAt,
     updatedAt} + migración SQLite `add_publication_queue`.
  2. `packages/core/src/domain/publications.ts` — dominio con db inyectable (patrón versions.ts):
     - `createPublication(db, {paquete, canal, scheduledAt?, creadoPor?})` → DRAFT; devuelve
       `{id, requiereAprobacion}` donde requiereAprobacion = canales con video/imagen
       (youtube_shorts/tiktok/instagram) — texto/blog auto-aprueba.
     - `listPublications(db, {estado?, canal?, take?, cursor?})` ordenado por scheduledAt desc.
     - `approvePublication(db, id)` (DRAFT→APPROVED), `rejectPublication(db, id)` (DRAFT→REJECTED).
     - `markPublished(db, id, resultado)` (APPROVED→PUBLISHED + resultadoJson),
       `markFailed(db, id, error)` (APPROVED→FAILED + error).
     - `publishDue(db, {publishFn?})` — publica los APPROVED con scheduledAt <= now usando
       publishToAll + adapters default (fail-soft sin tokens → FAILED con razón); helper para
       el calendario de la tarea 4 (#11).
  3. Endpoints en apps/web (auth via getCurrentUser):
     - `GET /api/publications` (lista con filtros), `POST /api/publications` (crea desde
       package; auto-aprueba si no requiere aprobación; requiereAuth true).
     - `POST /api/publications/[id]/approve` y `/reject` (solo estado DRAFT; ADMIN o creador).
     - `POST /api/publications/[id]/publish` (publica ahora vía publishToAll; fail-soft).
  4. Tests `domain/publications.test.ts` con fake db (patrón versions.test.ts): create
     requiereAprobacion (video→true, blog→false), approve/reject transiciones y errores
     (estado inválido), markPublished/markFailed, publishDue con publishFn stub (solo los
     due, fail-soft sin token), list con filtros.
  5. Docs: AUTO-PUBLICACION.md §4 F4 tarea 2 (checklist), STATE.md #10, AGENTS.md sección AutoPub.
- Criterios: gates FULL verdes; core 260 → ~270 PASS; commits
  `feat(core): AutoPub F4 tarea 2 - cola Publication (Prisma) + dominio publications + tests`
  y `feat(web): AutoPub F4 tarea 2 - endpoints /api/publications (crear, listar, aprobar, publicar)`.

**[I] Commits**
- `4976662` feat(core+web): AutoPub F4 tarea 2 - cola Publication (Prisma) + dominio publications + endpoints /api/publications + 15 tests (15 archivos, +696/-5: schema.prisma + migración add_publication_queue, domain/publications.ts + test, index.ts, llm.ts capability publications → publication_queue, tools/index.ts, session.ts +role, 4 rutas API publications). Sin push.

**[V] Gates**
- Scoped: typecheck core ✅ · typecheck web ✅ · publications.test.ts **15/15 PASS** ✅ · session.test.ts 4/4 ✅ · lint web ✅
- FULL: typecheck (core+web+runtime) ✅ · lint ✅ · test **467/467** (core 275 + runtime 192) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit `4976662`. Tarea #10 completada: AutoPub F4 tarea 2 — cola persistente
  `Publication` (Prisma SQLite) + dominio (aprobación híbrida: video/imagen → DRAFT;
  texto/blog → APPROVED auto; approve/reject/markPublished/markFailed/publishDue) +
  endpoints `/api/publications` (GET/POST + approve/reject/publish con auth, ADMIN o
  creador) + tool `publication_queue` (capability `publications`, db vía `opts.db`).
  Fix necesario: `getSessionUser` ahora devuelve `role` (para el check ADMIN).
- Pendiente F4 (documentado): tareas 3-5 — calendario + blog propio + canales siguientes
  (STATE.md #11).
- Siguiente ciclo: backlog #11 — AutoPub F4: calendario (start.py o scheduler runtime) +
  blog propio (publicar en /recursos) — SIGUIENTE (STATE.md).
- Ruido externo NO tocado: `DOCS_TODO.md`, `start.py` (modificados por hooks/herramientas
  externas al loop) — quedan en working tree.

---

## Iteración 11 — AutoPub F4 (tarea 4): calendario + blog propio (15/08/2026)

**[P] Plan**
- Objetivo: cerrar F4 con las tareas 4 (calendario) y 5-parcial (blog propio) del plan
  maestro AUTO-PUBLICACION.md (tarea #11 de STATE.md): disparador de publicación
  programada + página pública del blog que muestra los paquetes PUBLISHED de texto.
- Pasos:
  1. Endpoint `POST /api/publications/publish-due` (auth ADMIN) → `publishDue(prisma)`
     (ya implementado en el dominio, iteración 10). Devuelve `{publicadas, fallidas}`.
     Uso: cron externo (Task Scheduler / intervalo en start.py futuro) → publicación
     automática de lo programado y aprobado.
  2. Página pública `/blog` (server component, sin auth): lee de Prisma las publicaciones
     con `estado=PUBLISHED` y `canal=blog`, muestra tema + caption + fecha + contenido
     (paqueteJson) en tarjetas Dark Obsidian (patrón de /recursos: MarketingHeader).
  3. Helper de dominio `listBlogPosts(db, {take})` → solo PUBLISHED/blog, ordenado por
     publishedAt desc; tests con fake db (+4).
  4. Docs: AUTO-PUBLICACION.md §4 F4 (tarea 4 + 5-parcial), STATE.md #11, AGENTS.md.
- Criterios: gates FULL verdes; core 275 → ~279 PASS; commits
  `feat(web+core): AutoPub F4 tarea 4 - endpoint publish-due (calendario) + blog publico /blog + tests`.

**[I] Commits**
- `cf3aed2` feat(web+core): AutoPub F4 tarea 4 - endpoint publish-due (calendario) + blog publico /blog + listBlogPosts dominio + 3 tests (7 archivos, +220/-17). Sin push.

**[V] Gates**
- Scoped: publications.test.ts **18/18 PASS** (15 previos + 3 nuevos listBlogPosts) ✅ · typecheck core ✅ · typecheck web ✅ · lint web ✅
- FULL: typecheck ✅ · lint ✅ · test **470/470** (core 278 + runtime 192) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit `cf3aed2`. Tarea #11 completada: AutoPub F4 tareas 4 + 5-parcial —
  calendario (`POST /api/publications/publish-due`, ADMIN → publishDue(prisma), para cron
  externo/Task Scheduler) + blog propio (página pública `/blog` server component con
  `listBlogPosts(prisma)` — PUBLISHED/canal blog ordenado por publishedAt desc, tarjetas
  Dark Obsidian, revalidate 5min; helper `listBlogPosts` en dominio con 3 tests).
- Pendiente F4: tarea 5-resto — canales siguientes Meta/X/LinkedIn (STATE.md #13);
  F2 enrutamiento brief→Redactor/Guionista (STATE.md #12).
- Siguiente ciclo: backlog #12 — AutoPub F2: enrutamiento brief→Redactor/Guionista vía
  Orquestador + manifest JSON (packages/core) — SIGUIENTE (STATE.md).
- Ruido externo NO tocado: `.opencode/skills/loop-*`, `DOCS_TODO.md`, `LOOP.md`,
  `loop-constraints.md`, `opencode.json`, `scripts/loop_piv.py`, `start.py`,
  `.opencode/skills/loop-verifier/`, `PrototypeREADME.md` — modificados por herramientas
  externas al loop, quedan en working tree.

---

## Iteración 12 — AutoPub F2 tarea 1: enrutador brief→Redactor/Guionista + manifest (15/08/2026)

**[P] Plan**
- Objetivo: tarea 1 de F2 (AUTO-PUBLICACION.md §F2): enrutar `TopicBrief` → Redactor
  (texto/post 16:9) o Guionista (guion + storyboard 9:16) vía orquestador, y materializar
  1 brief → 1 paquete de contenido en disco con manifest JSON. (STATE.md #12).
- Pasos:
  1. `packages/core/src/tools/enrutador.ts`:
     - `ContenidoTexto` {titulo, intro, cuerpo[], cierre, cta, palabrasClave} +
       `GuionVideo` {titulo, hook, escenas[{tiempo, voz, camara, motion}], narracion,
       duracionSeg} (tipos de salida del Redactor/Guionista).
     - `redactar(brief)`: determinista keyless — intro/cuerpo/cierre a partir de tema+angulo+
       tono+fuentes; 3-5 párrafos, CTA por canal.
     - `guionizar(brief)`: determinista keyless — hook ≤3s, escenas 5-8 con cámara+motion
       (vocabulario de `omag/prompt/director.ts` si importable, si no local), narración
       hablada, duración por formato (45-60s).
     - `enrutarBrief(brief)`: formato 9:16 → Guionista; 16:9 → Redactor; 1:1 → Redactor
       corto (también soporta override).
     - `generarContenido(brief, {dir})`: enruta → produce paquete `ContentPackage`
       {briefId, tipo, brief, contenido|guion, manifest} → escribe manifest JSON en disco
       (`.ultraia/content/<briefId>/manifest.json`, atómico tmp+rename, idempotente) →
       devuelve ruta. Sin writes en tests (dir temporal de vitest).
  2. Tool de agente: capability `contenido` → tool `contenido_generar` en llm.ts (entrada
     brief JSON, salida resumen + ruta manifest); descripciones en tools/index.ts.
  3. Tests `enrutador.test.ts`: redactor (estructura, CTA por canal, fuentes citadas),
     guionista (hook, escenas, duración, cámaras válidas), enrutamiento (9:16→guion,
     16:9→texto), manifest (escribe JSON válido + idempotente, temp dir) — 12-14 tests.
  4. Docs: AUTO-PUBLICACION.md §F2 tarea 1, STATE.md #12 DONE + #13 SIGUIENTE, AGENTS.md.
- Criterios: gates FULL verdes; core 278 → ~290 PASS; commit
  `feat(core): AutoPub F2 tarea 1 - enrutador brief→Redactor/Guionista + manifest JSON + tests`.
- Nota: keyless-first (determinista sin LLM), el LLM es mejora futura opcional.

**[I] Commits**
- `45d030e` feat(core): AutoPub F2 tarea 1 - enrutador brief->Redactor/Guionista + manifest JSON idempotente + tool contenido_generar + 16 tests (6 archivos, +479/-7). Sin push.

**[V] Gates**
- Scoped: enrutador.test.ts **16/16 PASS** (2 fallos iniciales corregidos: palabras clave con
  puntuación → regex unicode; briefId por Date.now → hash FNV-1a estable del brief para
  idempotencia real) · typecheck core ✅ · core completo **294/294 PASS** ✅
- FULL: typecheck ✅ · lint ✅ · test **486/486** (core 294 + runtime 192) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit `45d030e`. Tarea #12 completada: AutoPub F2 tarea 1 — enrutador
  brief→contenido: `redactar(brief)` (Redactor determinista: título/intro/cuerpo/cierre/CTA
  por canal, cita fuentes, palabras clave sin puntuación), `guionizar(brief)` (Guionista
  determinista: hook ≤3s, 5-7 escenas con cámara del vocabulario verificado MOTIONS +
  normalizeMotion de prompt/director.ts, narración completa, 45-60s, estilo por tono),
  `enrutarBrief` (9:16→guion; 16:9/1:1→texto), `generarContenido(brief,{dir,dryRun,tipo})`
  (ContentPackage + manifest.json atómico tmp+rename, idempotente con briefId hash FNV-1a,
  default `.ultraia/content/<briefId>/manifest.json`) + capability `contenido` → tool
  `contenido_generar` en llm.ts. 16 tests. Keyless-first (determinista sin LLM).
- Pendiente F2: tareas 2 (multi-idioma es/ar + TTS) y 3 (OMAG long-form 60s+).
- Siguiente ciclo: backlog #13 — AutoPub F5: KPIs + media_score pre-pub + feedback → mejora
  de agentes (packages/core + scripts) — SIGUIENTE (STATE.md).
- Ruido externo NO tocado: `.opencode/skills/loop-*`, `DOCS_TODO.md`, `LOOP.md`,
  `loop-constraints.md`, `opencode.json`, `scripts/loop_piv.py`, `start.py`,
  `.opencode/skills/loop-verifier/`, `PrototypeREADME.md` — quedan en working tree.

---

## Iteración 17 — Desktop Fase D paso 3: ventana WebView2 real (15/08/2026)

**[P] Plan**
- Objetivo: paso 3 del plan Fase D (DESKTOP_ARCHITECTURE.md): reemplazar la apertura
  `msedge --app` del spike por una **ventana WebView2 nativa** (control WinForms) que
  embebe el runtime Evergreen instalado (151.x) y navega al proxy UI del launcher.
  (STATE.md #18).
- Pasos:
  1. `desktopFase/launcher/webview2-host.cs` — host C# WinForms (compilado con csc.exe
     del .NET Framework 4.8, presente en todo Windows; sin toolchain nueva):
     args `--url --title --user-data-dir --check`; crea ventana Dark Obsidian, inicializa
     WebView2 (CoreWebView2CreationProperties.UserDataFolder), navega; `--check` espera
     NavigationCompleted (timeout 35s), imprime JSON `{ok, version}` y sale 0/1.
  2. `launcher.mjs`:
     - `ensureVendor()`: descarga `Microsoft.Web.WebView2` nupkg (versión fija
       1.0.2903.40) a temp, extrae `runtimes/win-x64/native/WebView2Loader.dll` +
       `lib/net462/Microsoft.Web.WebView2.{Core,WinForms}.dll` a
       `desktopFase/launcher/vendor/` (idempotente; tar.exe de Windows o Expand-Archive;
       fail-soft con log si no hay red).
     - `buildHost()`: compila webview2-host.cs con csc.exe (Framework64 v4.0.30319)
       referenciando vendor DLLs → `dist/webview2-host.exe` (+ copia DLLs al lado).
     - `openWindow()`: lanza el host con la URL del proxy; si no hay csc/vendor/runtime →
       fallback `msedge --app` (degradación elegante, comportamiento previo intacto).
     - Flag `--host-check`: ensureVendor + buildHost + ejecuta host `--check` contra el
       proxy real → JSON resumen + exit 0/1.
  3. Test `launcher.test.ts` (+1): `--host-check` arranca todo, el host WebView2 navega
     al dashboard, reporta versión del runtime y sale 0.
  4. `.gitignore`: `desktopFase/launcher/vendor/` (binarios de terceros regenerables).
  5. Docs: DESKTOP_ARCHITECTURE.md (paso 3 ✅), launcher/README.md, STATE.md #18 DONE,
     AGENTS.md.
- Criterios: gates FULL verdes; runtime 192 → ~193 PASS; commit
  `feat(desktop): Fase D paso 3 - ventana WebView2 nativa (host C# WinForms + vendor loader) + test`.
- Riesgo: WebView2 `--check` necesita sesión interactiva de Windows (aquí disponible).
  NuGet requiere red (verificada OK hoy); fail-soft si no.

**[I] Commits**
- `feat(docs): PrototypeREADME al estado real 15/08/2026 + md2pdf.py stdlib + PrototypeREADME.pdf (raíz y apps/web/public) + sección Documentación/Descargables en README (lista total)`

**[V] Gates**
- typecheck PASS | lint PASS | test 555/555 PASS (core 362 + runtime 193) | build PASS
- scoped: `python scripts/md2pdf.py PrototypeREADME.md --out PrototypeREADME.pdf` + `--check` OK (header/xref/eof, 3 páginas)

**[R] Veredicto**
- GREEN — PrototypeREADME refleja el estado real (OMAG expandido, AutoPub F1–F5, runtime A–C, Desktop D 1–3 validado, memory Fable-5, 555/555). PDF de 3 páginas generado con writer stdlib puro (DNA keyless-first, precedente omag/sound.ts). Copia en `apps/web/public/` para servirlo en `/prototype-readme.pdf` (hint del usuario: public vacía).

---

## Iteración 16 — AutoPub F2 tarea 3: OMAG long-form 60s+ (15/08/2026)

**[P] Plan**
- Objetivo: F2 tarea 3 (AUTO-PUBLICACION.md §F2): conectar el enrutador de contenido
  (F2) con el scaffolding long-form de OMAG (`omag/project.ts`: Project → Act →
  Sequence → Scene → Shot + MasterTimeline) para generar guiones de video 60s+ desde un
  brief, con narración TTS (tarea 2) y timeline sincronizada. (STATE.md #16).
- Pasos:
  1. `tools/enrutador.ts`:
     - `guionLargo(brief, idioma, duracionSeg?)` → `OmagProject`: 3 actos (Apertura /
       Desarrollo / Cierre), 7 escenas (plantillas PLANTILLAS_GUION), shots ~10s del
       vocabulario MOTIONS, prompt por shot (sujeto+acción+cámara+estilo), narración por
       escena (bilingüe), `language` es|ar.
     - `ContenidoTipo` gana `'guion_largo'`; `ContentPackage.proyecto?: OmagProject` +
       `timeline?: MasterTimeline` (createMasterTimeline + tracks.video/dialogue +
       checkTimelineSync sin issues).
     - `generarContenido(..., {tipo:'guion_largo', duracionSeg})`: shots por escena
       derivados de la duración target (60-180s); TTS (tarea 2) narra la concatenación
       de hook + escenas → `narracion.mp3`; manifest idempotente incluye proyecto.
     - `enrutarBrief`: formato '16:9 video' → guion_largo.
  2. Tool `contenido_generar` en llm.ts: tipo gana 'guion_largo' + param `duracionSeg`.
  3. Tests `enrutador.test.ts` (+6): estructura proyecto (3 actos, 7 escenas, shots
     MOTIONS válidos, duración ≈ target), timeline sincronizada (0 issues), narración
     larga en es/ar, tts largo → mp3, enrutarBrief 16:9 video → guion_largo, manifest
     serializa proyecto.
  4. Docs: AUTO-PUBLICACION.md §F2 tarea 3, STATE.md #16 DONE + #17 SIGUIENTE, AGENTS.md.
- Criterios: gates FULL verdes; core 328 → ~334 PASS; commit
  `feat(core): AutoPub F2 tarea 3 - guion largo OMAG 60s+ (Project/Act/Scene/Shot + timeline) + tests`.
- Nota: todo determinista y keyless; reusa MOTIONS/normalizeMotion y edgeTtsAudio.

**[I] Commits**
- `93877d1` feat(core): AutoPub F2 tarea 3 - guion largo OMAG 60s+ (Project/Act/Scene/Shot + MasterTimeline) + 6 tests (7 archivos, +252/-23). Sin push.

**[V] Gates**
- Scoped: enrutador.test.ts **28/28 PASS** (6 nuevos: estructura 3 actos/7 escenas/shots
  MOTIONS, timeline sincronizada 0 issues, narración es/ar, duración 60-180s ajusta
  shots, generarContenido guion_largo+tts→mp3, enrutarBrief 16:9 video→guion_largo) ·
  typecheck core ✅ (fix: TopicFormat gana '16:9 video' — TS2820 en tests)
- FULL: typecheck ✅ · lint ✅ · test **526/526** (core 334 + runtime 192) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit `93877d1`. Tarea #16 completada: AutoPub F2 tarea 3 — guion largo
  OMAG 60s+: `guionLargo(brief, idioma, duracionSeg)` (60-180s) → `OmagProject`
  (Project→Act→Sequence→Scene→Shot de omag/project.ts): 3 actos bilingües
  (Apertura/Desarrollo/Cierre), 7 escenas (PLANTILLAS_GUION), shots ~10s con MOTIONS del
  vocabulario del director, `prompt` por shot, `MasterTimeline` sincronizada
  (tracks.video + dialogue; checkTimelineSync sin issues); `ContentPackage.proyecto` +
  `.timeline`; `ContenidoTipo` gana 'guion_largo'; `TopicFormat` gana '16:9 video';
  enrutarBrief mapea 16:9 video → guion_largo; TTS narra hook + 7 escenas → narracion.mp3.
  Tool `contenido_generar` gana `duracionSeg` + tipo guion_largo. F2 COMPLETA (tareas 1-3).
- Siguiente ciclo: backlog #17 — AutoPub F4 tarea 4: canales Meta/X/LinkedIn (requiere
  app review / decisión humana — verificar con usuario antes de implementar adapters).
- Ruido externo NO tocado: `.opencode/skills/loop-*`, `DOCS_TODO.md`, `LOOP.md`,
  `loop-constraints.md`, `opencode.json`, `scripts/loop_piv.py`, `start.py`,
  `.opencode/skills/loop-verifier/`, `PrototypeREADME.md` — quedan en working tree.

---

## Iteración 15 — AutoPub F2 tarea 2: multi-idioma es/ar + TTS edge-tts (15/08/2026)

**[P] Plan**
- Objetivo: F2 tarea 2 (AUTO-PUBLICACION.md §F2): el enrutador (Redactor/Guionista)
  produce en es Y ar (patrón bilingüe del pipeline Python RF-12) y el guion se convierte
  en narración MP3 vía edge-tts (omag/tts.ts, keyless, 14 idiomas). (STATE.md #15).
- Pasos:
  1. `tools/enrutador.ts`:
     - `idioma: 'es' | 'ar'` (default 'es') en `redactar`/`guionizar`/`generarContenido`
       y `ContentPackage` (campo `idioma`).
     - Plantillas bilingües: CTA_BY_CANAL, plantillas de guion (7), hook, cierre, y
       conectores es/ar — mismo esquema determinista, textos en árabe para 'ar'.
     - `generarContenido(..., {tts?: boolean})`: si tipo guion y tts → `edgeTtsAudio(
       narracion, idioma)` → escribe `narracion.mp3` en la carpeta del brief y agrega
       `audioPath` al paquete; degradación elegante: edge-tts no responde → `audioPath:
       null` (sin romper el paquete).
  2. Tool `contenido_generar` en llm.ts: params `idioma` + `tts` opcionales.
  3. Tests `enrutador.test.ts` (+6): redactar ar (texto árabe + CTA ar), guionizar ar
     (hook/voces árabes), generarContenido con tts (mock edgeTtsAudio inyectable → mp3 en
     disco), degradación tts falla → audioPath null.
  4. Docs: AUTO-PUBLICACION.md §F2 tarea 2, STATE.md #15 DONE + #16 SIGUIENTE, AGENTS.md.
- Criterios: gates FULL verdes; core 322 → ~328 PASS; commit
  `feat(core): AutoPub F2 tarea 2 - multi-idioma es/ar + TTS edge-tts (narracion mp3) + tests`.
- Nota: edgeTtsAudio es inyectable para tests (mock sin red).

**[I] Commits**
- `960e55a` feat(core): AutoPub F2 tarea 2 - multi-idioma es/ar en redactor/guionista + TTS edge-tts (narracion.mp3) + 6 tests (6 archivos, +219/-50). Sin push.

**[V] Gates**
- Scoped: enrutador.test.ts **22/22 PASS** (6 nuevos: redactar ar, redactar es previo,
  guionizar ar, paquete idioma ar, tts→mp3 en disco, degradación tts→null) · typecheck core ✅
- FULL: typecheck ✅ · lint ✅ · test **520/520** (core 328 + runtime 192) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit `960e55a`. Tarea #15 completada: AutoPub F2 tarea 2 — multi-idioma
  es/ar: `idioma?: 'es'|'ar'` (default es) en `redactar`/`guionizar`/`generarContenido` +
  `ContentPackage.idioma`; plantillas bilingües deterministas (CTA_BY_CANAL, CONECTORES,
  CUERPO_POR_IDIOMA, PLANTILLAS_GUION 7 escenas, HOOK_POR_IDIOMA — patrón RF-12) +
  **TTS edge-tts keyless**: `generarContenido(...,{tts:true})` en guiones →
  `edgeTtsAudio` (omag/tts.ts, voz por idioma) → `narracion.mp3` junto al manifest
  (`audioPath`), degradación elegante a null (engine inyectable para tests). Tool
  `contenido_generar` gana `idioma` + `tts`.
  FIXES: describe nuevos sin `dir` (mkdtemp) → ReferenceError en 4 tests; CTA esperado
  era de canal youtube_shorts pero brief default es blog. LECCIÓN: al añadir describe
  nuevos a un test file con setup por-describe, copiar también el beforeEach/afterEach.
- Siguiente ciclo: backlog #16 — AutoPub F2 tarea 3: OMAG long-form 60s+ (Project/Act/
  Sequence/Scene/Shot + audio) — SIGUIENTE (STATE.md).
- Ruido externo NO tocado: `.opencode/skills/loop-*`, `DOCS_TODO.md`, `LOOP.md`,
  `loop-constraints.md`, `opencode.json`, `scripts/loop_piv.py`, `start.py`,
  `.opencode/skills/loop-verifier/`, `PrototypeREADME.md` — quedan en working tree.

---

## Iteración 14 — AutoPub F1 tarea 4: cola de briefs persistente (Prisma) (15/08/2026)

**[P] Plan**
- Objetivo: tarea 4 de F1 (AUTO-PUBLICACION.md §F1, pendiente desde la iteración 7):
  cola de briefs PERSISTENTE en Prisma — el motor de ideas (topics) deja de ser volátil
  y alimenta la fábrica (F2 enrutador) desde la base. (STATE.md #14, SIGUIENTE).
- Pasos:
  1. Migración Prisma `add_topic_briefs`: modelo `TopicBrief` {id cuid, tema, canal,
     formato, tono, angulo, fuentesJson String (JSON string[]), score Float, pubDate
     String?, estado String default 'NUEVO' (NUEVO|PROCESADO|DESCARTADO), creadoEn
     DateTime, procesadoEn DateTime?, @@index([estado, score])}.
  2. `packages/core/src/domain/briefs.ts` (db inyectable, patrón publications):
     - `guardarBriefs(db, briefs[])`: upsert/crea solo los que no existen (dedupe por
       tema+canal), devuelve {creados, yaExistentes}.
     - `listarBriefs(db, {estado, canal, take, cursor})`: cola ordenada por score desc.
     - `marcarBriefProcesado(db, id)` / `marcarBriefDescartado(db, id)`.
  3. Tool `topics_queue` en llm.ts (capability `topics` ya existe): acciones guardar/
     listar/marcar_procesado. Export en tools/index.ts.
  4. Tests `briefs.test.ts` con fake db: dedupe, filtros, transiciones, orden (8-10).
  5. Docs: AUTO-PUBLICACION.md §F1 tarea 4, STATE.md #14 DONE + #15 SIGUIENTE, AGENTS.md.
- Criterios: gates FULL verdes; core 316 → ~325 PASS; commit
  `feat(core): AutoPub F1 tarea 4 - cola de briefs persistente (Prisma) + dominio + tool + tests`.

**[I] Commits**
- `b08534d` feat(core): AutoPub F1 tarea 4 - cola de briefs persistente (Prisma) + dominio briefs.ts + tool topics_queue + 6 tests (9 archivos, +374/-7: modelo TopicBrief + migración add_topic_briefs, domain/briefs.ts, tool topics_queue en llm.ts, export index). Sin push.

**[V] Gates**
- Scoped: briefs.test.ts **6/6 PASS** (3 fallos iniciales: fake db no era Prisma-fiel
  — fuentesJson string + skip para cursor — y el test leía el campo equivocado) ·
  typecheck core ✅
- FULL: typecheck ✅ · lint ✅ · test **514/514** (core 322 + runtime 192) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit `b08534d`. Tarea #14 completada: AutoPub F1 tarea 4 — cola de briefs
  PERSISTENTE: modelo `TopicBrief` (tema/canal/formato/tono/ángulo/fuentesJson/score/
  pubDate/estado NUEVO|PROCESADO|DESCARTADO/procesadoEn, `@@index([estado, score])`,
  migración `add_topic_briefs`) + dominio `briefs.ts` (guardarBriefs dedupe tema+canal,
  listarBriefs por score desc con cursor, marcarBriefProcesado/Descartado) + tool
  `topics_queue` (capability `topics`, db vía opts.db: guardar/listar/marcar_procesado/
  marcar_descartado). El motor de ideas (F1) ahora alimenta la fábrica (F2) desde la base.
  LECCIÓN: la fake db de tests debe ser Prisma-fiel desde el inicio (campos serializados
  + semántica de cursor/skip) o los fallos aparecen en la integración.
- Siguiente ciclo: backlog #15 — AutoPub F2 tarea 2: multi-idioma es/ar (textos) + TTS
  edge-tts para narración (packages/core) — SIGUIENTE (STATE.md).
- Ruido externo NO tocado: `.opencode/skills/loop-*`, `DOCS_TODO.md`, `LOOP.md`,
  `loop-constraints.md`, `opencode.json`, `scripts/loop_piv.py`, `start.py`,
  `.opencode/skills/loop-verifier/`, `PrototypeREADME.md` — quedan en working tree.

---

## Iteración 13 — AutoPub F5: KPIs + media_score pre-pub + feedback (15/08/2026)

**[P] Plan**
- Objetivo: F5 tareas 1+2 (y conexión de 3) del plan maestro AUTO-PUBLICACION.md:
  KPIs por canal + media_score pre-publicación (port TS de `media_score.py`) + feedback
  post-pub → señales para el pipeline de mejora existente (improve.ts). (STATE.md #13).
- Pasos:
  1. Migración Prisma `add_publication_metrics`: `mediaScore Int?` + `feedbackJson String?`
     en `Publication`.
  2. `packages/core/src/tools/media-score.ts` — port determinista de media_score.py:
     `puntuarMedia(data)` (image/audio/video/tts/music/director, 0-25, PASS ≥20) +
     `puntuarPaquete(paquete)` (score 0-100 del PublicationPackage F3: caption no vacío,
     hashtags, visual por canal, contenido, horario sugerido) + veredicto.
  3. `domain/publications.ts`: `createPublication` calcula y persiste `mediaScore` del
     paquete; `registrarFeedback(db, id, {rating, critique})` → feedbackJson (GOOD/BAD +
     nota + ts); `publicationSignals(db)` → ImprovementSignal (BAD critiques) compatible
     con improve.ts.
  4. `tools/metrics.ts` + `computeChannelKpis(db)`: por canal {publicadas, fallidas,
     pendientes, tasaExito, scorePromedio} + totales.
  5. Endpoints: `GET /api/publications/metrics` (ADMIN) + `POST /api/publications/[id]/
     feedback` (ADMIN/creador, rating+critique). Tool `publication_metrics` (capability
     `metrics`) en llm.ts: kpis + signals.
  6. Tests: media-score.test.ts (port, ~8) + publications.test.ts (mediaScore en create,
     feedback, signals, ~5) + metrics.test.ts (kpis, ~3).
  7. Docs: AUTO-PUBLICACION.md §F5, STATE.md #13 DONE, AGENTS.md.
- Criterios: gates FULL verdes; core 294 → ~310 PASS; commit
  `feat(core): AutoPub F5 - KPIs por canal + media_score pre-pub + feedback post-pub + tests`.

**[I] Commits**
- `b5465e5` feat(core+web): AutoPub F5 - KPIs por canal + media_score pre-pub (port) + feedback post-pub + endpoints + tool publication_metrics + 22 tests (15 archivos, +681/-7: migración add_publication_metrics, tools/media-score.ts + metrics.ts, domain/publications.ts mediaScore+feedback+signals, endpoints metrics/feedback, tool publication_metrics). Sin push.

**[V] Gates**
- Scoped: media-score.test.ts **13/13** (2 fallos corregidos: music score 25 como el Python original; `.every()` vacuidad → exigir canales.length>0) · publications.test.ts **23/23** (mediaScore/fecha en fake db) · metrics.test.ts **4/4** (tasaExito redondeada a 2 decimales) · typecheck core/web ✅ · lint ✅
- FULL: typecheck ✅ · lint ✅ · test **508/508** (core 316 + runtime 192) ✅ · build ✅
- Pre-build check: sin dev servers node activos ✅

**[R] Veredicto**
- **GREEN** → commit `b5465e5`. Tarea #13 completada: AutoPub F5 (tareas 1-2 + conexión 3):
  KPIs por canal (`computeChannelKpis`: publicadas/fallidas/pendientes, tasaExito,
  scorePromedio; endpoint GET /api/publications/metrics ADMIN); media_score pre-pub
  (port TS determinista de media_score.py: `puntuarMedia` 0-25 PASS≥20 + `puntuarPaquete`
  0-100; createPublication persiste mediaScore — migración `add_publication_metrics`);
  feedback post-pub (`registrarFeedback` acumulativo + `publicationSignals` → critiques BAD
  para improve.ts; endpoint POST /api/publications/[id]/feedback ADMIN/creador);
  tool `publication_metrics` (capability `metrics`: kpis + signals). 22 tests nuevos.
  LECCIONES: `.every()` sobre arrays vacíos da true (vacuidad) — exigir length>0;
  port 1:1 del Python: music=audio 25 no 20 (url servible +5).
- Pendiente F5: analytics reales por API de canal (quotas/permisos) + promoción automática
  de agentes vía signals → proposeImprovement.
- Siguiente ciclo: verificar backlog — #6-13 DONE (AutoPub F1-F5 núcleo completo);
  pendientes: #14 AutoPub F1 cola de briefs persistente (Prisma), #15 F2 multi-idioma
  es/ar + TTS, #16 OMAG long-form 60s+, F4 canales siguientes (Meta/X/LinkedIn),
  F6 escala (GPU), Desktop Fase D paso 3 (ventana WebView2).
- Ruido externo NO tocado: `.opencode/skills/loop-*`, `DOCS_TODO.md`, `LOOP.md`,
  `loop-constraints.md`, `opencode.json`, `scripts/loop_piv.py`, `start.py`,
  `.opencode/skills/loop-verifier/`, `PrototypeREADME.md` — quedan en working tree.

---

## Iteración 18 — PrototypeREADME actualizado + descargable PDF en la lista total (15/08/2026)

**[P] Plan**
- Objetivo: petición del usuario ("Realiza el prototypeREADME.md y dame el descargable en la
  lista total de ULTRAIA para usarlo") — reescribir `PrototypeREADME.md` al estado real
  15/08/2026 (estaba desactualizado: roadmap listaba items ya DONE y faltaban iteraciones
  12-16 + runtime A-C + Desktop D 1-2), generar el descargable `PrototypeREADME.pdf` con un
  writer PDF stdlib puro (`scripts/md2pdf.py`, cero deps — no hay toolchain PDF en la máquina),
  y enlazar ambos en la lista total (`README.md` sección Documentación / Descargables).
- Pasos: 1) reescribir PrototypeREADME.md (capacidades reales, diagrama, quickstart,
  roadmap solo pendientes, sección Descargables); 2) scripts/md2pdf.py (md→PDF, --check);
  3) generar PrototypeREADME.pdf + verificar; 4) README.md enlaces; 5) STATE.md #19 + run-log.
- Criterios: scoped `python scripts/md2pdf.py --check` + FULL npm (typecheck/lint/test 526/526/build);
  staging explícito de 6 archivos (ruido Iteración 17 en working tree queda fuera).
- Plan file: `.opencode/plans/loop-19-prototype-readme.md`.

**[I] Commits**
- (pendiente)

**[V] Gates**
- (pendiente)

**[R] Veredicto**
- (pendiente)

---

## Iteración 20 — Aprender del system prompt Fable 5: memory filesystem para agentes (15/08/2026)

**[P] Plan**
- Objetivo: el usuario dejó una URL en `enlaces.txt` (system prompt filtrado de Claude Fable 5,
  Anthropic) y pidió usarla para "mejorar y aprender otro modelo de razonamiento" + convención
  de enlaces futuros. Análisis completo → el patrón más accionable es el **memory filesystem**
  (6 ops con version guards, frontmatter, tags, una-ficha-por-sujeto) que los agentes de
  UltraIa no tienen. Se implementa como capability `memory` en core (6 tools de agente) +
  seed admin + docs (RAZONAMIENTO-FABLE5.md, convención enlaces.txt en AGENTS.md).
- Pasos: 1) memory-fs.ts (createMemoryFs: list/read/write/append/strReplace/delete, sha256
  version, persistencia atómica opcional); 2) index.ts + TOOL_DESCRIPTIONS + Capability;
  3) llm.ts 6 tools memory_* + opts.memoryFs; 4) core index export; 5) seed-admin caps +
  'memory'; 6) tests ~22; 7) docs; 8) wiring web opcional scoped.
- Criterios: scoped memory-fs.test.ts 22/22 + FULL npm (repo 526 → ~548); commit
  `feat(core): memoria de agentes Fable-5 - memory filesystem + capability memory + docs`.
- Plan file: `.opencode/plans/loop-20-fable5-memory.md`.

**[I] Commits**
- (pendiente)

**[V] Gates**
- (pendiente)

**[R] Veredicto**
- (pendiente)

## Iteración 21 - Prototipo empaquetado descargable Web + Desktop (15/08/2026)

**[P] Plan**
- Objetivo: petición del usuario ("Inicia a construir todo lo que necesitas para realizar el
  prototipo"; alcance elegido: Web + Desktop). Generar `UltraIa-Prototipo.zip` usable
  out-of-the-box: Next.js standalone (output: 'standalone' en next.config.ts) + dev.db con
  seed admin embebida + launcher desktop (flag --web-dir: arranca la web standalone y la
  ventana WebView2 navega a la app real, no al dashboard mínimo) + UltraIa.bat + INSTRUCCIONES.
- Pasos: 1) next.config.ts output standalone; 2) launcher.mjs --web-dir (default intacto);
  3) scripts/build-prototipo.py (empaquetador stdlib, flags --skip-build/--out/--check-zip);
  4) smoke del zip (GET / 200, /login 200, login admin/admin, apagado limpio); 5) docs
  (README + PrototypeREADME Descargables); 6) STATE.md #21 + run-log.
- Criterios: scoped build-prototipo + --check-zip + smoke zip; FULL typecheck/lint/test
  (555/555)/build; 0 tests vitest nuevos (launcher default intacto).
- Plan file: `.opencode/plans/loop-21-prototipo-empaquetado.md`.

**[I] Commits**
- `5415628` feat(prototipo): prototipo empaquetado Web+Desktop (Next standalone + launcher
  --web-dir + UltraIa-Prototipo.zip + build-prototipo.py) + docs (9 archivos, +580/-1).
  Sin push.

**[V] Gates**
- FULL: typecheck ✅ · lint ✅ · test **606/606** (core 413 + runtime 193) ✅ · build ✅
  (1 fallo de build por `.next` stale → `Remove-Item .next` + rebuild exit 0).
- Pre-build check: dev servers node matados ✅

**[R] Veredicto**
- **GREEN** → commit `5415628`. Tarea #21 completada: `UltraIa-Prototipo.zip` (30.6 MB)
  con Next.js standalone (`output: 'standalone'`), dev.db seed admin, launcher `--web-dir`
  (navega a la app real), UltraIa.bat + INSTRUCCIONES; `scripts/build-prototipo.py`
  empaquetador stdlib con `--skip-build/--out/--check-zip`. LECCIÓN: `.next` stale tras
  ediciones a rutas/next.config produce "Type error: File '.../[id]/page.ts' not found" —
  limpiar `.next` antes del build (no es un error real de código).

---

## Iteración 22 — Capability diagram (patrón diagram-design) (17/08/2026)

**[P] Plan**
- Objetivo: enlaces.txt línea 3 (`cathrynlavery/diagram-design`) — generar diagramas
  editoriales HTML/SVG autocontenidos (sin JS/deps) con coords ÷4, hairlines 1px, sin
  sombras, radius ≤10px, accent 1-2 focos, a11y role=img.
- Plan file: `.opencode/plans/loop-22-diagram-design.md` (escrito y ejecutado por sesión
  concurrente).

**[I] Commits**
- `293bf38` feat(diagram): capability diagram - editoriales HTML/SVG autocontenidos (patron
  diagram-design, Dark Obsidian) + 22 tests + resultTask/diagrams + docs/diagrams + fuente
  en learning/sources. Sin push.

**[V] Gates**
- FULL: typecheck ✅ · lint ✅ · test ✅ · build ✅ (verificado por la sesión concurrente).

**[R] Veredicto**
- **GREEN** → commit `293bf38`. Tarea #22 completada por sesión concurrente (verificada en
  esta sesión: `Task/generate-diagrams.ts` genera timelines/pipeline en resultTask/diagrams
  + docs/diagrams con README índice; 22 tests PASS dentro del FULL 606/606).

---

## Iteración 23 — Capability video_edit (patrón video-use) (17/08/2026)

**[P] Plan**
- Objetivo: enlaces.txt línea 5 (`browser-use/video-use`, 20.8k⭐ MIT) — port de PRINCIPIOS:
  el modelo nunca ve el video, LEE el packed transcript (~12KB, frases `[start-end]` +
  speaker, break ≥0.5s/cambio speaker); 12 hard rules de producción; EDL validado
  (in<out, ≥50ms, overlaps); render ffmpeg determinista (extract por segmento + concat
  `-c copy` lossless, fades 30ms por frontera, grade por segmento); self-eval máx 3
  (DURATION_MISMATCH/UNSAFE_CUT/UNSAFE_GAP + score 0-100); timeline SVG editorial a11y.
- Pasos: 1) fuente cruda learning/sources/video-use.md + video-use-SKILL.md + vendor/video-use/
  (clon sin .git); 2) tools/video-edit.ts (packTranscript/buildEdl/renderFfmpeg/selfEvalEdl/
  timelineViewSvg + silenceSafety/paddingOk/GRADE_FILTERS/HARD_RULES); 3) wiring llm.ts
  (5 tools video_edit_* + capability) + index.ts; 4) tests 29; 5) demo Task/video-edit-demo.ts
  → resultTask/edl/ (download-2/5-mp4); 6) docs RAZONAMIENTO-VIDEO-USE.md + AGENTS.md.
- Criterios: scoped video-edit.test.ts 29/29 + FULL npm + demo regenerable.
- Plan file: `.opencode/plans/loop-23-video-use.md`.

**[I] Commits**
- `35ae28a` feat(video-edit): capability video_edit - pipeline edicion de video (patron
  video-use, 12 hard rules, fades 30ms, concat lossless, self-eval) + 29 tests + demo
  resultTask/edl. Sin push.
- NOTA reparación (esta sesión): el archivo `video-edit.ts` inicial de la sesión concurrente
  quedó CORRUPTO (0 LF, BOM EF BB BF, mojibake `C3 A2 E2 82 AC` = em-dash mal codificado,
  todo en 1 línea) → reescrito limpio (UTF-8 sin BOM, 469 LF) antes del commit. Bugs
  corregidos durante la reparación: `esc` duplicado → `escXml`; `fmt()` padStart(7)→padStart(6)
  (formato `[000.00-002.50]`); float en selfEvalEdl `delta > 0.5 + 1e-6` (6.7−7.2 =
  -0.5000000000000009 daba falso positivo); renderFfmpeg sin extractCmds en shell → reescrito
  (afade 30ms + grade + scale preview + concat `-c copy`).

**[V] Gates**
- Scoped: video-edit.test.ts **29/29** PASS · typecheck core exit 0 · core **413/413** (45 files).
- FULL: typecheck ✅ · lint ✅ · test **606/606** (core 413 + runtime 193) ✅ · build ✅.
- Demo: `node_modules\.bin\vite-node.cmd Task/video-edit-demo.ts` regenera los 12 outputs en
  resultTask/edl/{download-2,download-5}-mp4/ ✅.

**[R] Veredicto**
- **GREEN** → commit `35ae28a` (con la versión reparada). Tarea #23 completada: capability
  `video_edit` con 5 tools de agente (pack/edl/render/selfeval/timeline) + 29 tests + demo
  real sobre los motion-specs del usuario (Download 2 y 5). LECCIONES: (1) jamás editar
  archivos TS con PowerShell 5.1 (colapsa líneas/corrompe UTF-8) — usar la tool Write;
  (2) reescribir con LF/BOM-clean y verificar `LF count + BOM check` tras el fix;
  (3) el test file es el contrato: asserts de formato exacto `[000.00-002.50]`, `afade`,
  `scale=1280`, steps y loop máx 3.
- Pendiente: F2 media-automation (enlaces.txt líneas 7-665: OBS WebSocket, ciclo
  PLAN→VALIDATE→AUTOMATE→RECORD→ANALYZE→EDIT→AUDIO→RENDER→VERIFY→ARCHIVE +
  RECOVER/RETRY/RESUME; 9 repos) + web-automation.py + PLAN-COMPLETO.md + PDF + memoria.

## Iteración 24 — Capability screenflow (grabación automatizada) (17/08/2026)

**[P] Plan**
- Objetivo: petición del usuario (plan maestro de 3 workstreams, aprobado con
  "Ejecutar plan maestro") — pipeline de grabación de pantalla automatizado:
  Captura (ffmpeg gdigrab) → Acciones (ActionScript declarativo + pyautogui) →
  Edición (reutiliza video_edit) → Publicación local (.ultraia/recordings/<run-id>/) →
  Continuidad (state.json resume idempotente, retry máx 3, fail-soft, scheduling).
- Pasos: 1) plan file .opencode/plans/loop-24-screenflow.md; 2) tools/screenflow.ts
  (validateActionScript/planRuns/buildFfmpegCapture/buildOutputNaming/buildManifest/
  scheduleCmd/resolveState — dominio puro zod, CERO ejecución real en tests);
  3) wiring llm.ts (4 tools screenflow_*) + index.ts; 4) tests 22; 5)
  scripts/screenflow/actions.py + schedule.ps1 + demo.json + Task/run_screenflow.ts
  (verificado --dry-run) + docs/SCREENFLOW.md; 6) .gitignore + LEARNINGS + AGENTS.
- Criterios: scoped screenflow.test.ts 22/22 + FULL npm + runner dry-run OK.
- Plan file: `.opencode/plans/loop-24-screenflow.md`.

**[I] Commits**
- `6eca58e` feat(screenflow): capability screenflow - pipeline grabacion automatizada
  (ActionScript, ffmpeg gdigrab, publicacion local, continuidad resume/retry) + 22
  tests + runner + scripts + docs. Sin push.
- NOTA encuadre: los gates FULL corrieron con el ruido externo de la sesión
  concurrente (recorder.ts/automation.ts + tests, untracked, con errores TS propios)
  movido temporalmente a `%TEMP%\opencode\*.bak` y RESTAURADO intacto tras el commit
  — no se tocó contenido ajeno; los commits 35ae28a/6eca58e quedan limpios.

**[V] Gates**
- Scoped: screenflow.test.ts **22/22** PASS · typecheck core exit 0.
- FULL: typecheck ✅ · lint ✅ · test **628/628** (core 435 + runtime 193) ✅ · build ✅
  (.next stale limpiado antes del build).
- Runner: `node_modules\.bin\vite-node.cmd Task/run_screenflow.ts scripts/screenflow/demo.json
  --dry-run` OK (continuidad: start, argv gdigrab, manifest, report).

**[R] Veredicto**
- **GREEN** → commit `6eca58e`. Plan maestro completo: 293bf38 (diagram 22) + 35ae28a
  (video_edit 29) + 6eca58e (screenflow 22). Backlog STATE.md de código npm: agotado
  (pendientes solo con decisión humana: Gen-Engine GPU #6, canales AutoPub #17).
- LECCIONES: (1) z.prettifyError NO existe en zod v3 → usar
  `parsed.error.issues.map(i => i.path.join('.') + ': ' + i.message)`; (2) los gates
  pueden bloquearse por ruido externo untracked con errores TS → aislar en temp,
  correr gates, restaurar intacto (nunca corregir contenido ajeno); (3) el self-eval
  del demo detectó correctamente DURATION_MISMATCH (EDL 21.4s vs spec 23.2s) — el
  pipeline verifica lo que genera.
- Pendiente proyecto: F2 media-automation (sesión concurrente en curso, archivos
  untracked recorder/automation + docs/RAZONAMIENTO-MEDIA-AUTOMATION.md); Gen-Engine
  E0-E5 (GPU, decisión humana); AutoPub canales Meta/X/LinkedIn (app review).

## 2026-08-17 — Escaneo total + backlog de mejoras (tarea #26)

**[P] Escaneo (triage experto, report-only)**
- Peticion usuario: escaneo total del proyecto (subproyectos: loops, integraciones,
  pensamiento critico) con criterio experto: ahorro economico total, mejores apps,
  mejores resultados, uso/usabilidad sin bugs.
- Salud: 628/628 tests PASS, 30+ capabilities, 41 rutas API, gates verdes (341cea1).
- BUG ABIERTO NO REGISTRADO -> High Priority: waitWeb launcher --web-dir falla 45s
  con child Ready+vivo (requests in-process se cuelgan; proceso separado responde
  200 en ~104ms). Sin fix commitado tras 5415628.
- Backlog #25 (media-automation) EN CURSO por sesion concurrente -> NO tocar.
- Plan file: `.opencode/plans/loop-26-scan-mejoras.md` (P0 bugs, P1 economia,
  P2 loops, P3 pensamiento critico, P4 producto, P5 integraciones; orden de
  ejecucion: B0.1 -> B0.2/B0.3 -> C1.2/E1.3 -> E1.1 -> L1.x -> C1.1 -> U1.x).
- Siguiente accion build propuesta: B0.1 fix waitWeb (experimento decisivo +
  smoke del zip) cuando la sesion #25 no este bloqueando los gates.

```json
{
"run_id": "2026-08-17T00:00:00Z-scan",
  "pattern": "triage",
  "duration_s": 900,
  "items_found": 20,
  "actions_taken": 0,
  "escalations": 1,
  "tokens_estimate": 16000,
  "outcome": "fix-proposed"
}
```

## 2026-08-17 — F2 media-automation (tarea #25, iteración 25)

**[P] Plan (retomado tras borrado por sesión concurrente)**
- Objetivo: completar capability `recording` + `automation` del bloque Media
  Automation de enlaces.txt (líneas 7–665). Plan maestro en
  `.opencode/plans/loop-23-video-use.md` (F2 del mismo).
- Archivos: recorder.ts/automation.ts + tests + wiring (index.ts/llm.ts) +
  scripts/web-automation.py + docs/AUTOMATION-WEB.md + enlaces.txt + registros.
- Riesgo: sesión concurrente editando los mismos index.ts/llm.ts (screenflow) —
  verificar diffs antes de commit; sus archivos screenflow NO se tocan.

**[I] Implementación**
- recorder.ts (317 líneas): cliente OBS WebSocket v5 (op 0 Hello → op 1 Identify
  rpcVersion 1 → op 2 Identified → op 6 Request → op 7 RequestResponse, código
  100=OK); WebSocket global Node 22+ (patrón omag/tts.ts, sin dep `ws`);
  `planRecording` (Start/Stop/Pause/Resume/GetRecordStatus/SetCurrentProgramScene),
  `ffmpegGdigrabCommand` fallback gdigrab Windows, `describePlan`.
- automation.ts: ciclo 10 fases PLAN→VALIDATE→AUTOMATE→RECORD→ANALYZE→EDIT→
  AUDIO→RENDER→VERIFY→ARCHIVE; `advanceState`/`nextAction` con RETRY/RECOVER/
  RESUME (MAX_ATTEMPTS=3, nunca reinicia de cero); `buildManifest` project.json;
  `verifyDurationCommand` ffprobe; `describeRun`.
- Tests: recorder.test.ts 15 + automation.test.ts 13 = 28 (fake WebSocket,
  cero red/ffmpeg/OBS). FIX de 3 bugs reales: (1) tests await-first → promesa
  colgaba hasta connectTimeout 5s = testTimeout vitest → timeout; patrón
  promise-first (create → trigger → await); (2) fake readyState como closure
  (nunca mutaba la propiedad del objeto) → sendRequest veía CONNECTING 0 →
  'not connected'; ahora `ws.readyState` propiedad mutada por triggerOpen/close;
  (3) `_describe` format(**step, **defaults) colisionaba con `path` del step →
  merge {**defaults, **step}.
- scripts/web-automation.py: ActionScript JSON declarativo (goto/click/type/
  select/wait/screenshot/scroll/extract), validación determinista (anti-runaway
  90min), planificación keyless `--dry-run`, driver playwright opcional,
  reporte MISMO esquema que automation_run. Linters 0 issues
  (ruff/pylint/pyright/pyflakes py -3.12); fixes: R0911→dict de templates,
  R0912→_validate_step, C0103 disable módulo, líneas largas, BOM-tolerant
  (utf-8-sig).
- Wiring: index.ts (exports + tools + TOOL_DESCRIPTIONS + Capability
  `recording`|`automation`); llm.ts (recording_start/recording_stop +
  automation_run). Verificado: diff de index.ts/llm.ts = SOLO wiring F2
  (screenflow ya commiteado por sesión concurrente en 6eca58e).
- Docs: learning/sources/media-automation.md (fuente cruda, 659 líneas) +
  docs/RAZONAMIENTO-MEDIA-AUTOMATION.md + docs/AUTOMATION-WEB.md (3 vías:
  playwright npm / python keyless / automation_run TS).
- enlaces.txt: bloque Media Automation (líneas 7–665) marcado PROCESADO
  17/08/2026. URLs nuevas del usuario (líneas 673+ instagram/tiktok/vidrush/
  abacus) NO tocadas — pendientes de procesar.

**[V] Verificación**
- Scoped: recorder+automation 28/28 PASS; core completo 463/463 PASS (48 files,
  incluye ~22 tests screenflow de sesión concurrente).
- FULL: typecheck → lint → test → build (pendiente en ejecución del ciclo).

**[R] Reiniciar**
- Siguiente: commit F2 (staging explícito: recorder.ts, automation.ts, tests,
  index.ts, llm.ts, scripts/web-automation.py, docs/AUTOMATION-WEB.md,
  docs/RAZONAMIENTO-MEDIA-AUTOMATION.md, learning/sources/media-automation.md,
  enlaces.txt, loop-run-log.md, AGENTS.md) — NUNCA `git add .`.
- Después: F3 (auditoría raíz → PLAN-COMPLETO.md + PDF + memoria learning/).
- LECCIÓN REAFIRMADA: un test que pasa aislado pero da timeout en suite suele
  ser un race entre timeout del test y timer interno (connectTimeout 5s ==
  testTimeout 5s) — aumentar testTimeout diagnostica, promise-first arregla.

```json
{
  "run_id": "2026-08-17T03:00:00Z-f2-media",
  "pattern": "piv",
  "duration_s": 3600,
  "tests_scoped": 28,
  "tests_full_core": 463,
  "files_changed": 12,
  "escalations": 0,
  "outcome": "done-pending-commit"
}
```

### Iteración 25 — UltraIA Cloud (17/08/2026) — DONE `046dfcf` ✅

- **P — Plan**: tarea #27 (petición usuario "cloud + dominio gratis + app review + coste; haz todas"): plan file `.opencode/plans/loop-25-ultraia-cloud.md` (capability cloud + API + /cloud + guía + worker R2; maniobra de gates con aislamiento de la sesión concurrente #25).
- **I — Implement**: `packages/core/src/tools/cloud.ts` (dominio: CloudError, EXT_TYPES 41, MAX_UPLOAD_BYTES 100 MiB, CLOUD_LAYOUT 9, isSafePath/normalizeCloudPath/sanitizeFileName/classifyFile/validateUpload/humanSize binario, planCloudLayout/buildCloudManifest, adapters InMemory/Local(átomico)/R2(fetch inyectable), CloudService, cloudFilesTool + createCloudFilesHandler; wiring llm.ts DIFERIDO — #25 sucio) + `cloud.test.ts` (27 PASS) + API auth `/api/cloud/{status,files,upload}` + página `/cloud` (cloud-client.tsx, humanSize local — cloud.ts tiene node:*) + nav.tsx (Cloud) + tsconfig alias `@ultraia/cloud` + `cloudflare/worker.ts|wrangler.toml|README.md` + `docs/CLOUD-FREE-2026.md` (datos websearch 17/08) + `.env.cloud.example` + `.gitignore` `.ultraia/cloud/`.
- **V — Verify**: typecheck ✅ lint ✅ test ✅ **655/655** (core 462 incl. 27 cloud + runtime 193) ✅ build ✅ (39 páginas, `/cloud` 5.62 kB en manifest). Incidentes: sesión concurrente #25 borró los archivos cloud **5+ veces** durante el ciclo (watcher de restauración en %TEMP% + gates en cadena sin pausas + commit apenas verdes) y `.next/types` corrupto → TS6053 (fix: borrar `.next`). Build falló 1×: cloud-client importaba cloud.ts (node:*) → `humanSize` duplicado local. Aislamiento simétrico aplicado y restaurado (llm.ts/index.ts/recorder/automation intactos).
- **R — Reiniciar**: HIGH PRIORITY siguiente: wiring capability `cloud` en llm.ts/index.ts (cuando #25 commitee); pendientes menores: conectar /cloud con cola Publication y video_edit; Part 8 guía CLI en CLOUD-FREE-2026.md.
- Commit: `046dfcf` feat(cloud) — 17 archivos, 1866 insertions.
### Iteraci�n 26 � Wiring capability cloud (17/08/2026) � DONE `7315d4d` ?

- **P � Plan**: HIGH PRIORITY de STATE.md (wiring diferido de la iteraci�n 25): registrar la
  capability `cloud` ? tool `cloud_files` en `ai/llm.ts` + export `cloud` en `tools/index.ts`.
  Blocker original (llm.ts/index.ts sucios por sesi�n concurrente #25) desapareci� � ambos limpios.
  Plan file `.opencode/plans/loop-27-cloud-wiring.md`.
- **I � Implement**: `tools/index.ts` (export * from './cloud' + `cloud: cloudTools` en tools +
  descripci�n TOOL_DESCRIPTIONS.cloud + 'cloud' en union Capability) + `ai/llm.ts` (imports cloud
  + `resolveCloudAdapter()`: R2CloudAdapter si CLOUDFLARE_R2_WORKER_URL+TOKEN, si no
  LocalCloudAdapter `.ultraia/cloud`; registro `tools.cloud_files = tool({...})` con
  createCloudFilesHandler � patr�n screenflow).
- **V � Verify**: gates FULL ? typecheck ? lint ? test (core 483/483 + runtime 193/193 = 676/676,
  cloud 27/27) ? build ? (39 p�ginas). Maniobra de gates: 5 archivos de la sesi�n game-dev
  (blueprint/reach/domain+tests, modificados con errores TS propios) y 4 de media-automation
  (recorder/automation+tests, 4 tests con race conocido promise-first/testTimeout) aislados a
  %TEMP%\opencode\loop27-bak ? restaurados byte-id�nticos (hash verificado 9/9 OK).
- **R � Reiniciar**: cloud wiring COMPLETO. Pendientes menores de cloud: conectar /cloud con la
  cola Publication y video_edit; Part 8 gu�a CLI en CLOUD-FREE-2026.md. Cola principal sigue
  bloqueada por sesiones concurrentes (#25 media-automation sin commit; game-dev con diffs sin
  commitear). LECCI�N: los errores TS del working tree concurrente no son del ciclo propio �
  aislar + restaurar por hash, nunca corregir archivos ajenos.
- Commit: `7315d4d` feat(core) � 3 archivos, 87 insertions.

### Iteraci�n 27 � ScreenFlow exec allowlist (17/08/2026) � DONE `bddcf5f` ?

- **P � Plan**: pendiente de AGENTS.md (capability screenflow): "allowlist real de exec (hoy
  fail-soft con warning)". Plan file `.opencode/plans/loop-28-screenflow-exec-allowlist.md`.
  Screenflow.ts es territorio de la iteraci�n 24 (m�o) � ninguna sesi�n concurrente lo toca.
- **I � Implement**: `screenflow.ts` � `EXEC_ALLOWLIST` (python/py/python3, node/npm/npx,
  ffmpeg/ffprobe, yt-dlp, mkdir; tolera .exe/.cmd/.bat), `validateExecCmd` (vac�o, >500,
  metachars shell `; && || | > < ` ` $(`, rutas absolutas como binario, binario fuera de
  allowlist) integrado en `validateActionScript` como ERROR acumulado por acci�n; exports en
  namespace `screenflow`. `screenflow.test.ts` +9 tests (31/31). `llm.ts`: descripci�n del
  tool `screenflow_plan` menciona la allowlist.
- **V � Verify**: gates FULL ? typecheck ? lint ? test (core 492/492 + runtime 193/193 =
  685/685) ? build ?. Aislamiento sim�trico de 9 archivos de sesiones concurrentes (5
  game-dev + 4 media-automation) a %TEMP%\opencode\loop28-bak ? restaurados 9/9 hash-OK.
- **R � Reiniciar**: pendientes screenflow restantes: watch de carpeta `hot/` y conexi�n con
  cola Publication canal `local` (m�tricas). Sesi�n concurrente ya tom� pendientes cloud
  (CLOUD-CLI-GUIDE.md + TAREA-CLOUD-PUBLICATIONS.md + cloud-cli.test.py � NO duplicar).
- Commit: `bddcf5f` feat(screenflow) � 4 archivos, 231 insertions.

### Iteraci�n 28 � Cloud CLI local + tareas diferidas (17/08/2026) � DONE `b152b40` ?

- **P � Plan**: usuario pide "no invadir #25": construir SOLO lo nuevo (sin tocar archivos
  existentes) y guardar todo lo que requiera editar archivos compartidos como tareas .md con
  c�digo comentado (qu�/para qu�/por qu�). Pausa de 3 min antes de crear (respetada con
  Start-Sleep 180 mientras se investigaba en solo-lectura).
- **I � Implement**:
  - `scripts/cloud-cli.py` (NUEVO, stdlib puro): CLI local de UltraIA Cloud replicando el
    contrato de `tools/cloud.ts` (42 ext en 7 categor�as, layout 9 carpetas, regex path seguro,
    sanitize, l�mite 100 MiB, humanSize binario). Comandos: layout/list/upload/remove/stat/
    manifest/self-test. Flags: --dir/--dry-run/--json/--quiet/--yes (parents argparse para
    aceptar flags antes y despu�s del subcomando). Escritura at�mica tmp+rename, fail-soft.
  - `scripts/cloud-cli.test.py` (NUEVO): suite e2e unittest (11 tests) que ejecuta el CLI como
    proceso REAL en tempdir aislado: sanitize+clasificaci�n, rechazos (.exe, ../x), JSON
    parseable, manifest, remove fail-soft, exit codes. 11/11 PASS.
  - `docs/CLOUD-CLI-GUIDE.md` (NUEVO): la "Part 8" pendiente del cloud (sin tocar
    CLOUD-FREE-2026.md): comandos, ejemplos, integraci�n (agentes/cron/AutoPub), verificaci�n.
  - `docs/TAREA-WIRING-CLOUD.md` (NUEVO): parche del wiring `cloud` en index.ts comentado
    l�nea por l�nea � luego marcado SUPERADA porque la sesi�n #25 lo aplic� en `7315d4d`
    (las 5 adiciones coinciden exactamente; qued� como evidencia, sin re-aplicar).
  - `docs/TAREA-CLOUD-PUBLICATIONS.md` (NUEVO): tarea diferida pendiente loop-25 � conectar
    cola `Publication` con el cloud (guardarPaqueteEnCloud: media � media/videos + paquete
    JSON � exports/publications/<id>.json, fail-soft con Promise.allSettled, cloud inyectable
    en createPublication; 3 tests nuevos sugeridos).
- **V � Verify**: gates Python (los npm FULL no corren: working tree de #25 con errores TS
  propios): py_compile OK, ruff 0 issues (f-strings, imports ordenados, PLW1510 check=False,
  PLR0124 math.isnan), pyflakes OK, self-test 25/25 PASS, e2e 11/11 PASS. Hallazgo en vivo:
  el otro agente commite� el wiring cloud (7315d4d) mientras esta sesi�n preparaba el parche
  � se actualiz� la tarea a SUPERADA (cero duplicaci�n).
- **R � Reiniciar**: pendientes cloud restantes: TAREA-CLOUD-VIDEOEDIT.md (conectar video_edit
  con el cloud: EDL/renders � exports/) y commit de los archivos de esta iteraci�n cuando los
  gates FULL del repo est�n verdes (hoy bloqueados por #25). Lecci�n reafirmada: leer el
  estado real del �rbol antes de escribir parches (los wiring "diferidos" pueden estar ya
  aplicados); el argparse de flags globales con subcomandos requiere `parents=[common]`.
- Commit: `b152b40` feat(scripts) � 5 archivos, 1290 insertions.

### Iteraci�n 29 � cloud-cli pull + cierre de pendientes cloud (17/08/2026) � DONE `f2e2b5b` ?

- **P � Plan**: usuario: "continua, documenta y ve dejando los cambios a medida que hagas"
  (autoriza commits por pieza). Siguiente paso: completar el CLI (descarga) y cerrar los
  pendientes cloud de loop-25 como tareas diferidas documentadas.
- **I � Implement**:
  - `cloud-cli.py` � nuevo comando `pull <path> [destino]` (descarga del cloud al disco:
    destino archivo / carpeta existente / default cwd; dry-run; fail-soft; copia at�mica
    tmp+rename; misma frontera de validaci�n que remove/stat). Docstring y help actualizados.
  - `cloud-cli.test.py` � +5 tests e2e (pull ok con contenido id�ntico, pull a carpeta,
    inexistente exit 2, path inseguro exit 2, dry-run no escribe) � 16/16 PASS.
  - `docs/CLOUD-CLI-GUIDE.md` � tabla de comandos + ejemplos 7-8 + contador de tests.
  - `docs/TAREA-CLOUD-VIDEOEDIT.md` (commit 0e9a4d6) � tarea diferida: `guardarEdicionEnCloud`
    (EDL/self-eval/timeline � exports/edl, render � media/videos; fail-soft; cloud inyectable;
    3 tests sugeridos) � con exports reales verificados de video-edit.ts.
  - `AGENTS.md` (commit b550ee4) � estado cloud-cli + tareas + CORRECCI�N: EXT_TYPES son 42
    (no 41, el TOOL_DESCRIPTIONS de index.ts hered� el n�mero viejo).
  - Logs: iteraci�n 28 + 29 en run-log, fila 28 en STATE.md (commit 68fa168).
- **V � Verify**: gates Python por pieza: py_compile / ruff / pyflakes OK (0 issues),
  self-test 25/25, e2e 16/16 PASS. Smoke test real contra `.ultraia/cloud` del repo
  (gitignored): layout 9/9, list exit 0. Gates npm FULL siguen bloqueados por #25 (no se
  corren; no se a�slan archivos ajenos — regla del usuario).
- **R � Reiniciar**: pendientes cloud de loop-25 CUBIERTOS como tareas diferidas
  (TAREA-CLOUD-PUBLICATIONS + TAREA-CLOUD-VIDEOEDIT), aplicables cuando el �rbol est� limpio.
  Siguiente: esperar commit de #25 para gates FULL y aplicar ambas tareas + commit final de
  archivos Python (los 3 ya est�n commiteados). Sin push (requiere aprobaci�n humana).
- Commits: `0e9a4d6` docs � `b550ee4` docs � `f2e2b5b` feat(scripts) � 6 archivos, +172/+13/+98.

### Iteraci�n 30 � Tareas cloud loop-25 APLICADAS (17/08/2026) � DONE (bd71299, d548e2f, e30bd89) ?

- **P � Plan**: usuario autoriza: "continua, apruebo todo lo que tengas (y puedas) hacer".
  Aplicar las 2 tareas diferidas (TAREA-CLOUD-PUBLICATIONS + TAREA-CLOUD-VIDEOEDIT) con gates
  SCOPED (vitest por archivo + typecheck parcial con tsconfig temporal en %TEMP% que excluye
  los archivos sucios de #25 del grafo). #25 sigue activo (screenflow/automation/blueprint/
  reach/shared) — mis archivos objetivo (publications, video-edit, route publications) NO
  chocan con los suyos. Gates FULL pendientes hasta �rbol limpio (documentado).
- **I � Implement**:
  - `domain/publications.ts`: `guardarPaqueteEnCloud(cloud, paquete, id)` (fail-soft,
    allSettled, bytes v�a fetch, `CLOUD_DIR_BY_EXT` para targetPath can�nico por tipo —
    CORRECCI�N vs tarea: CloudService.upload sin targetPath va a `drafts`, no clasifica) +
    `CreatePublicationInput.cloud?` + `cloudGuardado` en el resultado + export en namespace.
  - `domain/publications.test.ts`: +3 tests (cloud inyectado sube media+JSON; URL ca�da =
    fail-soft con publicaci�n creada; sin cloud = null) � 26/26 PASS.
  - `tools/video-edit.ts`: `guardarEdicionEnCloud(cloud, {edl, nombreBase, selfEval?,
    timelineSvg?, renderMp4?})` � exports/edl/*.json|.selfeval.json|.timeline.svg +
    media/videos/*.mp4 (fail-soft; EDL = artefacto m�nimo para ok) + export en namespace
    videoEdit. NOTA: CloudService no expone `read` (vive en el adapter).
  - `tools/video-edit.test.ts`: +3 tests (guarda EDL+self-eval+timeline y relee via
    cloud.adapter.read; adapter ca�do = fail-soft; renderMp4 en media/videos) � 32/32 PASS.
  - Wiring caller: `apps/web/src/app/api/publications/route.ts` POST inyecta
    `cloud: resolveCloudService()` (R2 si CLOUDFLARE_R2_WORKER_URL+TOKEN, si no
    LocalCloudAdapter `.ultraia/cloud` — mismo criterio que resolveCloudAdapter privado de
    llm.ts). LECCI�N: JSDoc `/**` con l�neas `//` internas NUNCA cierra → tsc comi� la
    funci�n ("Cannot find name") → corregido a comentarios `//` puros.
  - Tasks .md marcadas APLICADA con las notas de correcci�n.
- **V � Verify**: scoped por pieza: vitest publications 26/26, video-edit 32/32; tsc parcial
  (tsconfig temporal, typeRoots absoluto, include:[]) — 0 errores en archivos propios
  (ruido restante = reach/blueprint de #25, preexistente); eslint ruta: 0 errores.
  FULL pendiente �rbol limpio (anotado en STATE.md fila 30).
- **R � Reiniciar**: pendientes cloud de loop-25 = CERO. Commits: `bd71299` (publications),
  `d548e2f` (video-edit), `e30bd89` (ruta). Sin push (aprobaci�n humana). Siguiente:
  F3 branding kit editable (backlog AutoPub, no choca con #25).

### Iteraci�n 32 � AutoPub F4 paso 4: adapter X API v2 (17/08/2026) � DONE `8bc63b8` ?

- **P � Plan**: plan file loop-32. X = siguiente canal accionable (CLOUD-FREE-2026 verificado:
  X API v2 Free = 17 posts/24h POR APP sin app review; Meta/IG requiere app review humana).
- **I � Implement** (`tools/publish.ts`):
  - Union `platform` ampliado a `'youtube' | 'tiktok' | 'x'` (aditivo; sin switches
    exhaustivos en el repo — verificado con grep).
  - `buildXPostText(meta)` (tweet ≤280 con hashtags) + `xAppendMultipartBody(mediaId, idx,
    chunkB64, boundary)` (form-data manual, sin deps) + `X_CHUNK_BYTES` 5 MiB.
  - `createXAdapter`: INIT (media upload v1.1) → APPEND x n (chunks ≤5 MiB base64) →
    FINALIZE → `POST /2/tweets` {text, media_ids} → url `x.com/i/status/<id>`; fail-soft con
    razones X_ACCESS_TOKEN / X INIT|APPEND i|FINALIZE|tweet fall�: HTTP N.
  - `publish.test.ts`: +10 tests (validate, text cap 280, multipart, flujo feliz, chunking
    3 APPENDs 0/1/2, INIT/APPEND/tweet fallan, sin video, publishToAll fail-soft).
- **V � Verify**: vitest publish 25/25 (15+10); tsc parcial 0 errores (fix TS2322: Boolean()
    en el match del mock); eslint 0 issues. FULL pendiente �rbol limpio.
- **R � Reiniciar**: canal X listo. Siguiente (iteraci�n 33): wiring del canal X —
    createDefaultPublishers({includeX}) + publishDue + tool publish_submit con toX.

### Iteraci�n 31 � AutoPub F3: branding kit editable (17/08/2026) � DONE `a5633d3` ?

- **P � Plan**: plan file loop-31 (F3 pendiente del plan AUTO-PUBLICACI�N). `brandingFor(marca)`
  solo aceptaba el NOMBRE del kit (ultrala/neo_violet); paleta/fuente/logo/acento fijos.
  Objetivo: merge parcial (BrandingKitInput) sobre el kit base, aditivo y retrocompatible.
- **I � Implement**:
  - `tools/present.ts`: tipo `BrandingKitInput = Partial<BrandingKit>` + `brandingFor(marca?,
    override?)` con `{ ...base, ...override }` + `PresentInput.branding?` + `present()` lo pasa +
    `BRANDING_KITS` exportado en presentTools.
  - `ai/llm.ts` tool `present_package`: schema gana `branding` (zod partial con l�mites,
    opcional) y execute lo reenv�a — aditivo, no rompe llamadas existentes.
  - `tools/present.test.ts`: +6 tests (merge acento sobre default, paleta+fuente sobre kit por
    nombre, marca custom + logo, override completo, y branding aplicado al paquete en present).
- **V � Verify**: vitest present 18/18 PASS (13+5); tsc parcial (tsconfig temporal): 0 errores en
  present/llm (ruido = reach/blueprint de #25 preexistente); eslint 3 archivos: 0 issues.
  FULL pendiente �rbol limpio (fila 31 STATE.md).
- **R � Reiniciar**: F3 CERRADO. Siguiente: F4 paso 4 — adapter X API v2 (canal 4 del orden
  recomendado; X Free = 17 posts/24h POR APP sin app review, verificado en CLOUD-FREE-2026).
  Sin push (aprobaci�n humana).

### Iteraci�n 28 � ScreenFlow: hot watch + puente cola Publication (17/08/2026) � DONE `7e77819` ?

- **P � Plan**: pendientes restantes de AGENTS.md (capability screenflow): watch de carpeta
  `hot/` y conexi�n con cola Publication para m�tricas. Canal `'local'` NO existe en
  PresentChannel ? puente seguro: screenflow construye PublicationPackage v�lido (canal blog,
  auto-aprobado) v�a la tool `present` (import read-only; publications.ts/present.ts NO se
  tocan � sesi�n concurrente trabaja Publications). Plan file
  `.opencode/plans/loop-29-screenflow-hot-publication.md`.
- **I � Implement**: `screenflow.ts` � `HOT_DIR = '.ultraia/hot'`, `resolveHotWatch(current,
  known)` (diferencia idempotente de *.json ordenados, devuelve nuevos + conocidos para
  persistir estado), `buildPublicationPackage(runId, script, manifest)` (tema=nombre del
  script, contenido=descripci�n, media=final.mp4, canal blog). Exports en namespace.
  `screenflow.test.ts` +8 tests (39/39).
- **V � Verify**: gates FULL ? typecheck ? lint ? test (core 500/500 + runtime 193/193 =
  693/693) ? build ?. Aislamiento sim�trico 9 archivos concurrentes ? restaurados 9/9 hash-OK.
- **R � Reiniciar**: capability screenflow COMPLETA (capture/actions/edit/publish/continuity +
  exec allowlist + hot watch + puente metrics). Cola restante: #6 Gen-Engine (GPU/humano),
  #17 AutoPub canales (app review/humano), #25 media-automation (sesi�n concurrente),
  game-dev (sesi�n concurrente). PUSH autorizado por el usuario (17/08/2026).
- Commit: `7e77819` feat(screenflow) � 3 archivos, 187 insertions.

---

### Iteración 33 — AutoPub F4 wiring del canal X (17/08/2026) — DONE `4a0aa78`

- **P — Plan**: plan file loop-33 (wiring del adapter X de la iteración 32 hacia la cola y la tool).
- **I — Implement**: `createDefaultPublishers({includeX})` retrocompatible (default sin X), `publishDue` con includeX:true (fail-soft sin token), tool `publish_submit` con param `toX` + filtro ternario con rama X. 3 tests nuevos.
- **V — Verify**: vitest 54/54 scoped (publish 27 + publications 29). FULL pendiente árbol limpio (#25).
- **R — Reiniciar**: canal X listo (4 de 4 canales del orden recomendado). Siguiente: loop-34 (DeepSeek Harness).

### Iteración 34 — Capability harness (patrón deepseek-harness) (17/08/2026) — DONE `PENDIENTE-COMMIT`

- **P — Plan**: plan file loop-34 (enlaces.txt línea 804: deepseek-ai/deepseek-harness, MIT, 148k stars). Port ORIGINAL de principios "everything is a plugin" — dominio puro determinista (sin Cordis, sin red, reloj inyectable).
- **I — Implement**:
  - `tools/harness.ts` (NUEVO, ~390 líneas): HarnessPlugin/HarnessContext/HarnessRuntime + `createHarness` (boot valida ids `^[a-z0-9][a-z0-9-]{1,63}$`, duplicados, deps, ciclos Kahn; run; tick con reloj inyectable; shutdown inverso fail-soft con unwind de efectos; dump) + `defineSeam` (register/resolve) + `echoToolPlugin`/`counterSchedulerPlugin`. Exports: namespace `harness`.
  - `harness.test.ts` (NUEVO): 19 tests (19/19 PASS).
  - Wiring: capability `harness` en `ai/llm.ts` → tool `harness_manage` (acciones boot/run/tick/dump/shutdown, runtime PERSISTENTE por sesión de chat) + export/descriptor/union en `tools/index.ts`.
  - `docs/RAZONAMIENTO-DEEPSEEK-HARNESS.md` + lección en `learning/LEARNINGS.md` + fuente cruda commiteada (`learning/sources/deepseek-harness.md`).
- **V — Verify**: vitest harness 19/19 — tsc parcial (tsconfig temporal): 0 errores en harness/llm/index (ruido preexistente reach.ts de game-dev) — eslint 4 archivos EXIT 0. FULL pendiente árbol limpio (#25).
- **R — Reiniciar**: capability harness COMPLETA. Siguiente: revisar cola (pendientes humanos #6/#17; #25 sigue en sesión concurrente). Sin push (aprobación humana).

---

### Iteración 35 — AutoPub F4 paso 5: adapters Meta (IG Reels + Threads) (17/08/2026) — DONE `b28b0a9`

- **P — Plan**: plan file loop-35. Canal Meta siguiente del orden recomendado (YT+TikTok+blog+X ✅).
  Datos VERIFICADOS 17/08 (CLOUD-FREE-2026.md Parte 5, docs Meta updated 2026-06-30): IG NO
  requiere app review para negocio propio (Standard Access), permisos
  `instagram_business_content_publish` + `instagram_basic`, container flow create→publish.
- **I — Implement** (`tools/publish.ts`):
  - Union `PublishPlatform = 'youtube'|'tiktok'|'x'|'instagram'|'threads'` (aditiva) en
    PublishResult/PublisherAdapter + `PublishInput.videoUrl?` (Reels/Threads requieren URL pública).
  - `createInstagramAdapter`: Graph API v21 — POST `/{igUserId}/media` (media_type=REELS,
    video_url, caption cap 2200) → creation_id; POST `/{igUserId}/media_publish` → id + url reel.
  - `createThreadsAdapter`: Graph API v1.0 — POST `/{threadsUserId}/threads` (media_type=VIDEO,
    video_url, text cap 500) → creation_id; POST `/threads_publish` → id (sin url, como TikTok).
  - Helper `formBody` (URLSearchParams, sin deps); tokens/userIds desde options o env
    (IG_ACCESS_TOKEN/IG_USER_ID, THREADS_ACCESS_TOKEN/THREADS_USER_ID); fail-soft con razón.
- **V — Verify**: vitest publish **43/43** (13 nuevos: 6 IG + 6 Threads + publishToAll fail-soft
  Meta) · tsc parcial EXIT 0 (publish.ts + test, sin ruido) · eslint EXIT 0 (2 archivos).
  FULL pendiente árbol limpio (#25 sigue activo).
- **R — Reiniciar**: canal Meta listo (adapters). Siguiente: loop-36 — wiring Meta
  (createDefaultPublishers includeMeta + publishDue + tool toInstagram/toThreads +
  markPublished platform). Sin push (aprobación humana).

---

### Iteración 36 — AutoPub F4 wiring Meta (17/08/2026) — DONE `a223417`

- **P — Plan**: plan file loop-36. Meta alcanzable desde cola + tool (patrón loop-33 con X).
  `markPublished` no mapea plataformas (guarda resultadoJson) → wiring mínimo.
- **I — Implement**:
  - `tools/publish.ts`: `createDefaultPublishers({ includeX?, includeMeta? })` — includeMeta
    añade `createInstagramAdapter` + `createThreadsAdapter`; default sin cambios (retrocompatible).
  - `domain/publications.ts`: `publishDue` → `createDefaultPublishers({ includeX: true, includeMeta: true })`.
  - `ai/llm.ts` `publish_submit`: description cita Meta; schema `toInstagram`/`toThreads`
    opcionales; adapters includeX+includeMeta; filtro por ramas explícitas por plataforma
    (switch, no ternario anidado).
  - Maniobra simétrica: llm.ts lo tocaba la sesión concurrente (capability growth WIP) —
    backup a %TEMP%\opencode\backup-loop36, checkout, editar, commit, restaurar. Merge
    verificado: HEAD llm.ts contiene harness + growth_plan + publish_submit Meta (a223417).
- **V — Verify**: vitest **73/73** (publish 45 = 43+2 includeMeta; publications 28 = 27+1 IG) ·
  tsc parcial EXIT 0 propios (solo ruido reach.ts de game-dev) · eslint EXIT 0. FULL pendiente
  árbol limpio (#25 sigue activo).
- **R — Reiniciar**: AutoPub F4 canales COMPLETA (YT/TikTok/blog/X/Meta). Siguiente: F5
  restante (analytics reales por API de canal) o revisar cola. Sin push (aprobación humana).

---

### Iteración 38 — Capability vfx (enlaces.txt línea 811: TikTok @studioeditionoficial → Higgsfield DaVinci) (17/08/2026) — DONE `a7a3efd`

- **P — Plan**: plan file loop-38. URL 811 pendiente: "Verifica la informacion y adicionalo
  para hacerlo propio con analisis de funcionamiento". Skill `watch` (keyless, sin Whisper).
- **I — Analizar**: yt-dlp descargó los subtítulos auto (eng-US) pero el video falló
  (rehydration/impersonation) → transcript-only. El video muestra el plugin GRATUITO de
  Higgsfield AI para DaVinci Resolve (7 tools IA dentro del timeline). VERIFICADO con
  websearch: higgsfield.ai/plugins/davinci (7 tools: Generate Video/Image, AI LUT Creator,
  Draw to Edit, Reframe, Remove Background, Upscale 8K; Resolve 19+; Nano Banana 2 +
  Seedance 2.0; plugin gratis + créditos). Fuente cruda: `learning/sources/higgsfield-davinci.md`.
  Análisis: `docs/RAZONAMIENTO-HIGGSFIELD-DAVINCI.md`.
- **I — Implement** (`tools/vfx.ts`, port ORIGINAL de principios, dominio puro determinista):
  - `planReframe` — 16:9→9:16 (o ratio arbitrario): crop windows que siguen centros de
    acción normalizados, padding, límite de pan con interpolación (lerp) cuando el salto
    excede maxPanPerSec, argv ffmpeg (crop+concat, re-encode). Invariante: crop siempre
    cabe (w ≤ width) — la rama "no alcanzable" era código muerto, ELIMINADA por test.
  - `planUpscale` — ladder 1080p/1440p/4K/8K + 2x/4x, factor, argv lanczos, nota >4x
    (generativo vs clásico).
  - `planLutMatch` — presets warm-cinematic/neutral-punch/teal-orange/mono/custom (mismos
    nombres que video_edit grade) → hints + argv ffmpeg eq= + temperatureArgs + 3dl.
  - `planRotoscope` — remove-bg: keyframes vs full, coste (0.35s/frame key vs 0.08 full),
    alpha straight, 4 pases de limpieza.
  - `planDrawToEdit` — boceto→video: estilo (lineart/scribble/colored-sketch/painterly) +
    motion → prompt; seed determinista por hash.
  - `planBroll` — framework Dreamina: missing beat → frame shape → motion → transition →
    request + provider hint (≤10s keyless / >10s premium).
  - Tool `vfx_plan` en llm.ts (6 acciones JSON) + export/descriptor/union en index.ts
    (llm.ts/index.ts estaban LIMPIOS — wiring directo; la sesión concurrente sigue en
    publish.ts/topics.ts telegram, sin colisión).
- **V — Verify**: vitest **26/26** (6 suites) · tsc parcial 0 errores propios (solo ruido
  transitivo del WIP telegram de la sesión concurrente en enrutador.ts + reach.ts
  preexistente) · eslint EXIT 0. FULL pendiente árbol limpio.
- **R — Reiniciar**: capability vfx COMPLETA. Pendientes: línea 807 enlaces.txt (Facebook
  share — analizar repos), wiring pendiente NINGUNO (vfx ya registrado). Sin push
  (aprobación humana).

### Iteraci�n 36 - Capability growth (patrones VidRush + Abacus.AI) (17/08/2026) - DONE PENDIENTE-COMMIT

- **P - Plan**: plan file loop-36-growth.md (URLs nuevas de enlaces.txt: vidrush.ai + abacus.ai;
  perfiles IG/TikTok de creadores = referencia visual anti-bot, no procesados). Port ORIGINAL de
  principios "perfil de canal -> experimentos de UNA variable -> playbook que compone victorias"
  (convergen VidRush "Modeled on your channel" + Abacus "Autonomous YouTube Influencer Agent").
- **I - Implement**:
  - `tools/growth.ts` (NUEVO): `analyzeChannel(samples)` -> ChannelProfile (pacing, cutCadence,
    onScreenTextDensity, hookLengthAvg, thumbnailStyle clasificado); `planExperiments(perfil, kpis,
    max)` (UNA variable por experimento, peor KPI primero, hipotesis/control/test/decisionRule +5);
    `buildPlaybook(canal, signals)` (victoria = test > control +5; peso acumulado por victoria;
    dedupe por canal+recomendacion; orden por peso). Exports: namespace `growth`.
  - `growth.test.ts` (NUEVO): 19 tests (19/19 PASS).
  - Wiring: capability `growth` en `ai/llm.ts` -> tool `growth_plan` (acciones
    profile/experiments/playbook, schema zod) + export/descriptor/union en `tools/index.ts`.
  - `docs/RAZONAMIENTO-VIDRUSH-ABACUS.md` + fuentes crudas compactas
    (`learning/sources/vidrush-ai.md` + `abacus-ai.md`; el HTML crudo era 2.7MB/480KB, se guardo
    la version markdown) + leccion en `learning/LEARNINGS.md`.
- **V - Verify**: vitest growth 19/19 + harness 19/19 (regresion) = 38/38; tsc parcial 0 errores
  propios (ruido preexistente reach.ts de #25); eslint 4 archivos EXIT 0. FULL pendiente arbol
  limpio (#25 sigue activo).
- **R - Reiniciar**: capability growth COMPLETA - cierra el pendiente F5 de AutoPub (promocion
  via signals) en dominio puro; buildPlaybook se alimentaria de publicationSignals. NOTA
  coordinacion: la sesion concurrente uso el numero 35 para adapters Meta (b28b0a9) -> este plan
  se renombro a loop-36-growth. Siguiente: wiring Meta (loop-36-meta de la otra sesion) o cola
  humana (#6 Gen-Engine GPU / canales restantes app review). Sin push (aprobacion humana).

### Iteraci�n 37 - Capability Telegram adapter + lista APIs gratis (enlaces.txt -> openclaw) (17/08/2026) - DONE PENDIENTE-COMMIT

- **P - Plan**: plan file loop-37-telegram-adapter.md. URLs nuevas en enlaces.txt:
  openclaw/openclaw (809) con pedido "lista api gratuitas verificadas"; Facebook (807) = 400
  anti-bot (solo referencia); TikTok @studioeditionoficial (811) = pendiente.
- **I - Implement**:
  - `tools/telegram.ts` (NUEVO): `createTelegramAdapter` implementa `PublisherAdapter`
    (publish/validate fail-soft, fetch inyectable, env TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID,
    options con precedencia via ??); sendVideo multipart construido a mano sin deps
    (`buildMultipartBody` boundary + CRLF); `truncateCaption` 1024 chars sin cortar par
    surrogate; `buildTelegramCaption` bilingue es/ar; cap 50MB; 429 -> retry_after en reason.
    Platform 'telegram' (union se amplia en wiring DIFERIDO).
  - `telegram.test.ts` (NUEVO): 21 tests con fetch mock (cero llamadas reales).
  - `docs/APIS-GRATIS-2026.md` (NUEVO): la lista pedida - Telegram GRATIS total (verificado
    websearch 2026: optimum-web/botract/michaelheredia), Discord/Slack gratis, WhatsApp NO
    (marketing .025/msg US, free tier 1000 conv DEPRECADO, chatbooster jun 2026),
    keyless ya integradas (pollinations/edge-tts/Tunetank/DDG/r.jina/Exa), opcionales
    (Brave 2000/mes, Firecrawl 500/mes, ElevenLabs 10k/mes, Deepgram 200/mes).
  - `learning/sources/openclaw.md` + `docs/RAZONAMIENTO-OPENCLAW.md` (NUEVOS): Gateway
    local+token = valida Fase B del runtime; canales = AutoPub; skills = capabilities.
- **V - Verify**: vitest telegram 21/21 + publish 45/45 (regresion) = 66/66; tsc scoped EXIT 0;
  eslint EXIT 0 (warning pages inofensivo). FULL pendiente arbol limpio (#25 activo).
  Fixes en el ciclo: ?? en vez de || (precedencia options), surrogate test (slice cae en idx
  1023 con 1023 a's), HeadersInit/BodyInit no existen con lib ES2022 (tipos Record/unknown),
  validate async (PublisherAdapter exige Promise).
- **R - Reiniciar**: adapter listo. WIRING DIFERIDO (union PublishPlatform + createDefaultPublishers
  + tool llm.ts/index.ts) mientras #25 edita esos archivos - documentado en High Priority
  (precedente cloud 7315d4d). Pendiente: TikTok 811, adapters discord/slack, rotacion claves
  modelo. Sin push (aprobacion humana).

### Iteraci�n 37b - Wiring canal telegram COMPLETO (17/08/2026) - DONE PENDIENTE-COMMIT

- La sesi�n concurrente commite� su wiring Meta (a223417, 0404af7) y publish.ts/llm.ts/index.ts
  quedaron LIMPIOS -> el wiring diferido de telegram se pudo hacer sin conflicto.
- **I**: publish.ts (union PublishPlatform + 'telegram', createDefaultPublishers
  {includeTelegram} + import createTelegramAdapter + export en namespace publish) +
  llm.ts (tool publish_submit: toTelegram zod + includeTelegram:true + rama switch 'telegram' +
  description) + publish.test.ts (2 tests nuevos: includeTelegram fail-soft sin token + 6
  adapters combo).
- **V**: vitest 96/96 (telegram 21 + publish 48 + publications 27 regresion) + tsc scoped 0
  propios (solo ruido reach.ts #25) + eslint EXIT 0. markPublished fluye con la union ampliada
  (PublishResult incluye 'telegram' sin cambios en publications.ts).
- **R**: canal Telegram OPERATIVO (bot token @BotFather + TELEGRAM_CHAT_ID). Pendiente menor:
  canal enum en Prisma para programar Telegram por cola (diferido). Sin push (aprobaci�n humana).

### Iteracion 39 - Canal telegram en la cola Publication (17/08/2026) - DONE

- El numero 38 lo uso la sesion concurrente (loop-38-tiktok-studio-edition.md, vfx/higgsfield)
  -> esta iteracion es la 39. Pendiente 37b (canal enum Prisma) aplicado ahora: el canal es
  String en Prisma (sin migracion); la cola ya lo aceptaba como string, faltaba el pipeline.
- **P**: canal 'telegram' en TODO el flujo F1-F4: topics -> present -> cola -> calendario -> API.
- **I**:
  - topics.ts: TopicChannel + 'telegram' + CHANNEL_KEYWORDS.telegram + FORMAT_BY_CHANNEL.telegram.
  - present.ts: FORMAT_BY_CHANNEL ('9:16 video'), HORARIO_SUGERIDO ('mar/jue/sab 18:00'),
    hashtags base telegram, captionFor case telegram (cap 1000 < 1024 adapter), visualFor
    case telegram (9:16, sin srt).
  - publications.ts: CANALES_CON_APROBACION + telegram (video -> DRAFT humano, regla del
    usuario); publishDue con includeTelegram:true.
  - route.ts API: CANALES + telegram (z.enum).
  - schema.prisma: comentarios canal actualizados (String, sin migracion).
  - Tests: present.test +2 (paquete telegram: caption<=1000/srt null/9:16/horario),
    publications.test +2 (canalRequiereAprobacion telegram true; createPublication canal
    telegram -> DRAFT persistido).
- **V**: vitest 158/158 (present 19 + topics 14 + publications 29 + publish 47 + telegram 21
  + enrutador 28) + tsc scoped 0 propios (solo ruido reach.ts #25) + eslint EXIT 0.
  Fix: TS2741 en topics.ts (Records exhaustivos exigian telegram) - completados.
- **R**: canal telegram 100% integrado (briefs, paquetes, aprobacion, calendario, API).
  Commit 79e3436. Siguientes: adapters discord/slack, FULL gates (bloqueado por #25).
  Sin push (aprobacion humana). NOTA: hook doc-reminder anoto 5 archivos en DOCS_TODO.md
  (archivo de la sesion concurrente, no tocado).

### Iteracion 40 - F5 analytics reales por API de canal (17/08/2026) - DONE

- El numero 39 lo uso la sesion concurrente (canal telegram en la cola, 79e3436) -> esta
  iteracion es la 40; plan file RENOMBRADO loop-39 -> loop-40-metrics-analytics.md (git mv).
- **P**: pendiente F5 "analytics reales por API de canal" (la promocion via signals ya la
  cerro growth). Keyless-first: YouTube Data API v3 gratis; tiktok/x/ig/threads/telegram
  fail-soft con razon.
- **I**: `tools/metrics.ts` -> `fetchChannelAnalytics` (fetch inyectable, apiKeys/env;
  youtube channels/statistics parsea strings->int, hiddenSubscriberCount defensivo;
  tiktok Research aprobacion / x OAuth2 / IG-Threads token / telegram bot admin -> fail-soft)
  + `mergeAnalyticsIntoKpis` (platform->canal de la cola: youtube->youtube_shorts,
  tiktok->tiktok, instagram->instagram, telegram->telegram; x/threads->null skip; campos
  opcionales vistasReales/likesReales/comentariosReales/compartidosReales en CanalKpis) +
  tool `publication_metrics` accion 'analytics' (platform+channelId) en llm.ts (estaba
  limpio) + descriptor metrics en index.ts.
- **V**: vitest 17/17 (5 previos + 12 nuevos: 6 youtube + 4 fail-soft + 3 merge) + tsc
  parcial 0 propios (solo ruido AJENO: publications.ts discord/slack #39 concurrente,
  enrutador.ts telegram, reach.ts #25) + eslint EXIT 0. Fix propio: CanalKpis sin los
  campos reales (TS2339 en tests) -> anadidos.
- **R**: YouTube analitica REAL operativa con YOUTUBE_API_KEY; resto documentado fail-soft.
  Commit 5afe2f7 (5 archivos: metrics.ts/test, llm.ts, index.ts, plan loop-40).
  FULL gates pendiente (arbol con #25 + WIP publications.ts concurrente).
  Bloqueo nuevo: enlaces.txt linea 807 (Facebook share) = video registered-users-only
  (escalado a High Priority, requiere accion humana: pegar contenido o cookies).
  Sin push (aprobacion humana).

### Iteracion 41 - Endpoint metrics con analytics reales (17/08/2026) - DONE

- **P**: cerrar F5 punta a punta: el endpoint GET /api/publications/metrics (iteracion 13)
  solo agregaba la cola; faltaba exponer los analytics reales (iteracion 40).
- **I**: apps/web/src/app/api/publications/metrics/route.ts -> query opcional
  ?platform=&channelId= -> fetchChannelAnalytics + mergeAnalyticsIntoKpis ->
  { ok, ...kpis, analytics }. Sin query: comportamiento previo (retrocompatible).
  Funciones disponibles via export * del paquete (sin tocar index.ts).
- **V**: tsc web --noEmit: 0 errores propios (solo ajenos: blueprint.ts #25, reach.ts #25,
  enrutador.ts + discord.ts/slack.ts de la sesion concurrente - YA esta creando los
  adapters discord/slack en paralelo, NO pisar) + eslint EXIT 0.
- **R**: F5 analytics completo (dominio + tool + endpoint). Commit a8bf697.
  Siguiente candidato: UI de metricas en /dashboard o pagina propia - o esperar a que la
  sesion concurrente termine discord/slack antes de tocar llm.ts/publish.ts.
  Sin push (aprobacion humana).

### Iteracion 43 - UI de metricas AutoPub (pagina /metrics) (17/08/2026) - DONE

- El numero 42 lo uso la sesion concurrente (wiring publish_submit toDiscord/toSlack,
  0f9547a) -> esta iteracion es la 43; plan file RENOMBRADO loop-42 -> loop-43 (git mv,
  precedente loop-39 -> loop-40).
- **P**: cerrar F5 punta a punta: faltaba la UI que consume el endpoint metrics
  (a8bf697). Archivos del shell verificados limpios antes de empezar.
- **I**: `(app)/metrics/page.tsx` (server, requireUser, patron cloud) +
  `components/metrics-client.tsx` (client: StatCards totales + tabla por canal con
  badges de canal + tasaExito/scorePromedio + panel analytics reales con select
  platform + input channelId + boton -> GET /api/publications/metrics?platform=&channelId=
  -> vistas/subscriptores/videoCount o fail-soft amber con la razon; fetch con cookies de
  sesion, maneja 401/403) + entrada '/metrics' (BarChart3) en nav.tsx tras Cloud.
- **V**: tsc web --noEmit 0 propios + eslint EXIT 0 (fix propio: Button no soporta
  size='icon' -> className px-2.5). Build FULL bloqueado (arbol ajeno).
- **R**: F5 completo punta a punta (dominio + tool + endpoint + UI). Commit c8939f6.
  Verificacion post-commit: 0f9547a (wiring discord/slack) llego DESPUES de mi commit,
  sin tocar mis archivos. Sin push (aprobacion humana).

### Iteracion 47 - Fix imports .js del wiring concurrente (webpack resolver) + verif dev server (17/08/2026) - DONE

- Numeracion: ellos usaron 44 (canales-config), 45 (mobile+codevfx), 46 (consolidar arbol)
  -> esta es la 47. Sin plan file propio (fix de mantenimiento, no feature).
- **Problema**: el dev server NO arranca en HEAD. Diagnostico: `next dev` muere con
  `Module not found: Can't resolve './telegram.js'` en publish.ts:13 — los imports con
  extension `.js` del wiring (telegram/discord/slack) NO los resuelve el webpack de Next
  (vitest/tsc si mapean .js->.ts; por eso sus gates pasaban). TODO el repo usa imports SIN
  extension; los 12 imports .js eran todos del wiring concurrente.
- **I**: quitar extension `.js` en 7 archivos (publish.ts, telegram.ts, discord.ts,
  slack.ts + 3 tests). Vitest 130/130 (publish+discord+slack+telegram+publications).
- **V**: tras el fix, el dev server COMPILA el instrumentation ("Ready in 26.2s",
  "Compiled /login", GET 200) pero el bundle de /_error muere con
  `UnhandledSchemeError: Reading from "node:fs/promises" is not handled` via
  memory-fs.ts -> index.ts (Import trace cortado en index.ts = el bundle arrastra index.ts
  completo; fallback 'fs/promises' en next.config.ts NO lo resuelve -> revertido).
  **Causa raiz**: node:fs/promises en el grafo que webpack intenta bundlear — deuda
  PREEXISTENTE desde memory-fs (15/08; el ultimo smoke test con dev fue el 14/08).
  Verificacion runtime de /metrics QUEDA BLOQUEADA hasta resolver memory-fs (lo tiene la
  sesion concurrente en loop-46 "consolidar arbol": telegram.ts y next.config.ts sucios
  AHORA mismo - no tocar).
- **R**: commits b601ec5 (3 archivos; incluyo SIN querer el fix Uint8Array de la sesion en
  telegram.ts - correcto y necesario, lo acepto) + 8ae11bf (4 archivos, pathspec para no
  llevarme su staging de present/reach). Los fixes .js son necesarios para que el dev
  server siquiera llegue a compilar. High Priority: dev server bloqueado por memory-fs.
  Sin push (aprobacion humana).

### Iteracion 41 - Adapters Discord + Slack (17/08/2026) - DONE

- La sesion concurrente uso el 40 (F5 analytics 5afe2f7: metrics.ts/test + llm.ts + index.ts
  + plan loop-40, sin tocar mis archivos; llm.ts/index.ts quedaron LIMPIOS).
- **P**: Discord/Slack gratis (APIS-GRATIS-2026.md) -> adapters PublisherAdapter + canal en
  la cola (aprobacion DRAFT). Wiring de la tool en llm.ts NO en esta iteracion (diferido,
  ahora posible: llm.ts limpio).
- **I**:
  - `tools/discord.ts` (NUEVO): `createDiscordAdapter` - webhook (env DISCORD_WEBHOOK_URL,
    formato /api/webhooks/{id}/{token} validado), multipart `file` + `payload_json`
    (buildMultipartBody compartido de telegram.js), limite 10 MiB gratis (25 con boost),
    caption cap 2000, respuesta 204 -> ok. `isValidDiscordWebhook`, `buildDiscordCaption`.
  - `tools/slack.ts` (NUEVO): `createSlackAdapter` - bot token (env SLACK_BOT_TOKEN xoxb-,
    validado) + channel (env SLACK_CHANNEL), POST files.upload con Bearer + multipart
    file+channels+title+initial_comment, limite 1 GiB, caption cap 4000, JSON {ok,error,file}
    fail-soft. `isValidSlackBotToken`, `buildSlackCaption`.
  - `publish.ts`: union PublishPlatform + 'discord' | 'slack' + createDefaultPublishers
    ({includeDiscord, includeSlack}) + namespace publish ampliado (export * cubre index.ts).
  - `publications.ts`: CANALES_CON_APROBACION + discord/slack (video -> DRAFT humano);
    publishDue con includeDiscord/includeSlack.
  - `topics.ts`/`present.ts`: TopicChannel + discord/slack (keywords, formato 9:16, horario
    discord 'lun/mie/vie 19:00' / slack 'mar/jue 09:00', hashtags, caption, visual).
  - `route.ts` API: z.enum + discord/slack. schema.prisma comentarios (String, sin migracion).
  - Tests: discord.test.ts 17 + slack.test.ts 17 + publications +2 + present +1.
- **V**: vitest 211/211 (discord 17 + slack 17 + publish 47 + telegram 21 + publications 30
  + present 20 + topics 14 + enrutador 28 + metrics 17 regresion) + tsc scoped 0 propios
  (solo ruido reach.ts #25) + eslint EXIT 0. Fixes: mock 429 sin json (test), records
  exhaustivos TopicChannel exigian discord/slack (completados). LECCION REAPLICADA: PS 5.1
  Set-Content corrompio schema.prisma (BOM + mojibake 'espaÃ±ol') -> git checkout + tool Edit.
- **R**: Discord y Slack publicables desde la cola con aprobacion humana. Diferido: tool
  publish_submit toDiscord/toSlack en llm.ts (ahora sin bloqueo - llm.ts limpio). Sin push
  (aprobacion humana).

### Iteracion 42 - Wiring publish_submit toDiscord/toSlack (17/08/2026) - DONE

- La sesion concurrente commiteo F5 analytics (5afe2f7: metrics.ts/test + llm.ts + index.ts)
  -> llm.ts/index.ts LIMPIOS -> el diferido de la iteracion 41 se cierra sin choque.
- **I**: llm.ts (publish_submit: description con Discord/Slack + params toDiscord/toSlack +
  ramas switch 'discord'/'slack' + createDefaultPublishers includeDiscord/includeSlack) +
  index.ts (descriptor publish: 8 plataformas) + enrutador.ts (FIX TS2739 propio: CTA_BY_CANAL
  es/ar exhaustivo con telegram/discord/slack).
- **V**: vitest 175/175 (enrutador 28 + present 20 + topics 14 + llm 2 + publish 47 + discord
  17 + slack 17 + publications 30) + tsc scoped 0 propios (solo ruido reach.ts #25) + eslint
  EXIT 0 (apps/web sin cambios).
- **R**: publish_submit cubre las 8 plataformas (YT/TikTok/X/IG/Threads/Telegram/Discord/
  Slack) con fail-soft por token. Sin push (aprobacion humana).

### Iteracion 44 - Guia operativa CANALES-CONFIG-2026 (17/08/2026) - DONE

- La sesion concurrente uso el 43 (UI /metrics c8939f6 + bitacora e5a1b18). LECCION suya
  aprendida (dd505cc): verificar git log antes de commitear bitacora (la sesion concurrente
  absorbe edits del run-log en sus commits).
- **P**: 8 plataformas completas -> falta el COMO configurar. 100% docs + .env.example
  (verificado limpio). Arbol #25 sigue sucio (18) -> FULL bloqueado.
- **I**:
  - `.env.example` raiz: seccion AutoPub con las 13 variables EXACTAS (verificadas contra
    `process.env.*` de publish.ts/telegram.ts/discord.ts/slack.ts; X solo X_ACCESS_TOKEN,
    sin secrets — corregido tras primera version).
  - `docs/CANALES-CONFIG-2026.md` (NUEVO): tabla resumen (canal/variables/coste/donde),
    paso a paso por canal (Telegram BotFather, Discord webhook, Slack app, YouTube OAuth2
    scopes, TikTok Content Posting, X OAuth2, Meta IG/Threads sin app review negocio
    propio), como probar (API cola + tool publish_submit + adapter aislado vite-node),
    regla aprobacion humana, pendientes (LinkedIn, X 17/24h, YouTube refresh).
- **V**: sin .ts tocados -> sin gates de codigo; git diff verificado UTF-8 intacto (tool
  Edit, leccion 41/26).
- **R**: configurar canales = seguir CANALES-CONFIG-2026.md. Sin push (aprobacion humana).

### Iteracion 45 - App movil Expo + capability codevfx (17/08/2026) - DONE

- Pedido usuario: verificar enlaces + crear app movil Android/iOS en TypeScript. Decisiones: Expo SDK 57 +
  TS, EAS free tier (sin Apple Developer, iOS solo Expo Go, IPA diferido), MVP gestion completa,
  Facebook 807/814 anti-bot 400 (r.jina.ai fallback intentado), Instagram DcJDsghiJne verificado
  (Elemental Sandbox VFX, repo achrefelouafi/LinearAbiltyCastingThreeJS MIT).
- **P**: plan .opencode/plans/loop-45-mobile-app.md aprobado - Fase 1 app movil + Fase 2 codevfx.
- **I Fase 1**: apps/mobile (expo-router, tema Dark Obsidian, SecureStore) + auth REST en apps/web
  (POST /api/auth/login|register + GET /me, header x-ultraia-session en getCurrentUser(req?)) + req en
  publications/metrics/cloud/approve/reject + tabs dashboard KPIs/publicaciones/cloud/blog +
  docs/MOBILE.md. npm overrides react eliminados del root (mobile usa 19.2.3, web 19.1.0).
- **V Fase 1**: tsc mobile EXIT 0, expo export web OK (6 rutas), expo-doctor 20/21 (duplicacion
  react web/mobile intencional), tsc web 0 errores propios. Commit f106546 (65 archivos).
- **I Fase 2**: packages/core/src/tools/codevfx.ts (port ORIGINAL Elemental Sandbox: 9 kinds con
  GLSL hand-written, planEffect con fisica/particulas, colorimetryAnalyze HSL, curvatureShade,
  perspectivePlan parallax, renderEffectHtml canvas autocontenido) + tool vfx_code (capability
  codevfx) en llm.ts + export index.ts + demo Task/codevfx-demo.ts -> resultTask/codevfx/ +
  docs/RAZONAMIENTO-CODEVFX.md.
- **V Fase 2**: 29/29 tests codevfx PASS, tsc core 0 propios (ruido blueprint/reach #25), suite
  core 734 passed/5 failed (los 5 de #25: automation/reach/recorder - no mios), eslint sin cambios.
  Commit b4d7695.
- **R**: app movil + VFX por codigo listos. FULL bloqueado por arbol #25 (sin push, aprobacion humana).

### Iteracion 46 - Consolidar arbol (18/08/2026) - PAUSADA (sesion concurrente activa)
- Plan aprobado por usuario: 6 iteraciones 46->51 (46 consolidar arbol, 47 movil E2E + EAS build, 48 repomix 815, 49 LinkedIn, 50 Desktop WebView2, 51 codevfx->OMAG). Usuario: sesion #25 'ya termino' + cuenta Expo para EAS.

### Iteracion 46 - Ronda de consolidacion + push + travel (18/08/2026) - DONE (parcial: sub-items futuros)

- **P**: plan maestro aprobado (decisi�n usuario 18/08): push directo a master ahora; PR draft
  para features grandes en adelante. Ronda F1-F6: fix BodyInit + push historico, repomix (L825),
  verificacion URLs enlaces.txt (IG/TikTok), capability travel (tomas de paisajes -> videos),
  docs, cierre.
- **F1 I**: cast BodyInit en discord.ts/slack.ts (telegram ya lo tenia). V: gates FULL verdes
  (typecheck, lint, test 903/903 con 3 test files #25 cuarentenados, build 43 paginas). Commit
  78d25e0. **PUSH 974f866..78d25e0 (110 commits)** -> github.com/LucaPorro420/UltraIa (master).
- **F2 I**: repomix@1.18.0 devDep + script npm repomix (--include core/runtime/web/mobile/
  scripts/Task/start.py) + .gitignore (repomix-output.*; quitar repomix.md -> colisionaba con
  docs/REPOMIX.md por ignorecase) + docs/REPOMIX.md. V: npm run repomix OK (336 archivos, 505k
  tokens, security check excluye slack.test.ts); gates FULL verdes (test 888/888). Commit 85c1d26.
- **F3 I**: URLs verificadas via r.jina.ai (8/8): tomassporro = paisajes IG (anti-bot, login wall)
  -> alimenta travel; melisaescobart_ = promo VidRush (ya en growth); wearebrand.io = marketing;
  L683/686/689/797/800 = recursos dev/design; Db_CpPGJxpE = Kage (Three.js, ver F4). Capability
  travel: packages/core/src/tools/travel.ts (planTravelVideo, buildTakeManifest, buildTravelRender
  zoompan+xfade+edge-tts+BGM, replicateLandscape pollinations keyless, travelLeadImage, slugify
  Destino) + tool travel_plan (plan/toma/render/replicar/lead) en llm.ts + export index.ts.
  V: typecheck FULL 0, lint 0, test 906/906 (core 713 + runtime 193), build 43 pag (2 intentos por
  raza .next). Commit 9fed227 + PUSH.
- **F4 I**: Kage (reel Db_CpPGJxpE, techinsixty/Meng To) -> learning/sources/kage-threejs.md +
  docs/RAZONAMIENTO-TESTTASKSKILLS.md (mapeo: aurora-canvas + codevfx cubren el patron; landing
  scroll-world 3D -> Watch List, decision de producto). F5: AGENTS.md seccion loop-46 + DOCS_TODO
  completados. Commit 14d101e + PUSH.
- **V FULL**: 4 commits propios (78d25e0, 85c1d26, 9fed227, 14d101e) + push 9fed227..14d101e.
  Arbol: solo WIP #25 restante (no tocar).
- **R**: sub-items futuros del plan maestro: 47 movil E2E + EAS build, 49 LinkedIn, 50 Desktop
  WebView2, 51 codevfx->OMAG. Concurrencia #25 sigue viva (commitea durante gates) - protocolo
  cuarentena %TEMP%\opencode\wip-quarantine-20260818\ confirmado.

### Iteracion 47 - (futura) Movil E2E + EAS build
### Iteracion 49 - (futura) LinkedIn adapter
### Iteracion 50 - (futura) Desktop WebView2
### Iteracion 51 - (futura) codevfx -> OMAG

### Iteracion 48 - Fix instrumentation: dev server desbloqueado (18/08/2026) - DONE

- **P**: el bloqueo de la iteracion 47 (dev server: UnhandledSchemeError node:fs/promises
  via memory-fs) segia vivo tras el push. Peticion usuario: "continua y apruebo el push".
- **I**: diagnostico en 3 pasos: (1) el webpack resolve.fallback de next.config.ts NO aplica
  en dev (Next 15.3 usa TURBOPACK por defecto; el hook webpack() se ignora); (2) transpilePackages
  no es la causa (quitarlo no cambio nada - turbopack transpila workspace packages solo);
  (3) CAUSA RAIZ (issue vercel/next.js#61728): el instrumentation.ts se compila y ejecuta en
  AMBOS runtimes (nodejs Y edge); los imports ESTATICOS de @ultraia/core arrastran node
  builtins al bundle edge -> UnhandledSchemeError/module-not-found. FIX: `await import()`
  condicionado por NEXT_RUNTIME dentro de register() (patron oficial; edge compile = funcion
  vacia sin core). El core permanece con imports node:* (estilo del repo).
- **V**: 3 boots consecutivos del dev server: "Compiled /instrumentation in 13-25s (491-492
  modules)" + "Ready" + `GET / 200 in 73s` (primer compile frio 1755 modules). El server es
  INESTABLE bajo la edicion concurrente #25 (muerte del listener tras 1-2 rutas; error
  intermedio ajeno "travel is not exported" de tools/index.ts mientras la sesion edita
  travel.ts a mitad de compile - no es bug estable, la pagina / sirvio 200). Gates scoped:
  tsc web 0, eslint 0, vitest 85/85 (memory-fs+cloud+enrutador+llm con node:* restaurados).
- **R**: commits b601ec5+8ae11bf (47) + esta iteracion 48 (instrumentation.ts). Cierra el
  bloqueo preexistente desde memory-fs (15/08) - el ultimo smoke dev con exito fue 14/08.
  PENDIENTE: QA runtime de /metrics (login admin + asserts) requiere un dev server estable
  (ejecutar cuando la sesion #25 no este editando). Sin push hasta confirmar.

### Iteracion 47 - Movil E2E + EAS build (18/08/2026) - DONE

- **P**: plan loop-47-movil-e2e-eas.md � E2E de la API REST m�vil + EAS build config.
- **I**: dev server levantado con start.py (Ready 35s); E2E completo:
  - Auth REST: register 201 / login token / me 200 (header x-ultraia-session OK)
  - Publications 200 / Blog 200 / Cloud status 200 (tras fix cloud/status + cloud/upload:
    ambos ignoraban el header -> 401 en m�vil; fix: pasar 
eq a getCurrentUser)
  - Metrics 403 = correcto para usuario no-admin (ADMIN-only por dise�o).
- **Mobile validation**: tsc EXIT 0 + expo-doctor 20/21 (duplicacion react intencional)
  + expo export --platform web EXIT 0 (6 rutas: login/register/tabs/publicaciones/cloud/blog).
- **EAS**: pps/mobile/eas.json (3 perfiles: development/preview/production; cli.appVersionSource=local; Android APK/AAB). docs/MOBILE.md seccion EAS actualizada con comandos exactos.
- **V**: gates FULL verdes (typecheck 0, lint 0, test 193/193 runtime, build 43 paginas; 3 test files #25 cuarentenados y restaurados).
- **Commit**: be59967 + push dec409a..be59967.
- **R**: Iteracion 48 (repomix) YA HECHA en 46-F2. Siguiente: 49 LinkedIn adapter, 50 Desktop WebView2, 51 codevfx -> OMAG.

### Iteracion 49 - LinkedIn Adapter (AutoPub F4 canal 9) (18/08/2026) - DONE

- **P**: plan loop-49-linkedin-adapter.md � adapter LinkedIn v�a Marketing API (Assets API registerUpload + PUT uploadUrl + UGC Posts v2/ugcPosts) + wiring completo.
- **I**: createLinkedInAdapter en publish.ts (token LINKEDIN_ACCESS_TOKEN, author URN organization/person, fetch inyectable, fail-soft, scopes rw_organization_admin / w_member_social, video MP4 =5GB =10min, SYNCHRONOUS_UPLOAD <200MB). PublishPlatform + 'linkedin', createDefaultPublishers({includeLinkedIn}), export en index.ts + publish.ts, llm.ts tool publish_submit toLinkedIn. docs/CANALES-CONFIG-2026.md: tabla variables, paso a paso OAuth2, regla aprobaci�n humana, canales v�lidos actualizados.
- **Tests**: 11 tests nuevos (validate, flujo feliz register?upload?ugc, fallos register/upload/ugc, sin video, commentary cap 3000, publishToAll fail-soft, createDefaultPublishers 3 y 9 adapters).
- **V**: gates FULL verdes (typecheck 0, lint 0, test 193/193 runtime, build 43 paginas; 3 test files #25 cuarentenados).
- **Commit**: c9cc080 + push e769223..c9cc080.
- **R**: AutoPub F4 canales COMPLETA (YT/TikTok/X/IG/Threads/Telegram/Discord/Slack/LinkedIn = 9/9). Siguiente: 50 Desktop WebView2, 51 codevfx -> OMAG.

### Iteracion 50 - Desktop WebView2 (Fase D paso 3) (18/08/2026) - DONE

- **P**: plan loop-50-desktop-webview2.md � validar ventana WebView2 nativa (paso 3 del spike
  Fase D), medir RAM/bundle reales, docs.
- **I**: --host-check (launcher mantiene proxy vivo) ? exit 0, WebView2 151.0.4129.86 OK.
  Launcher normal ? ventana WebView2 nativa visible (webview2-host.exe C# WinForms), dashboard
  Dark Obsidian carga, health checks verdes. Bundle: dist 12.2 MB + vendor 1.5 MB + host.exe
  7.5 KB � 13.7 MB. RAM: host 33 MB + proxy Node 78 MB = 111 MB total (muy por debajo de
  Electron/Tauri).
- **Docs**: SHELL_DECISION.md (cifras reales), launcher/README.md (gu�a completa con medidas,
  flags --host-check, --web-dir, modo prototipo).
- **V**: gates FULL verdes (typecheck 0, lint 0, test 193/193 runtime, build 43 paginas; 3 test
  files #25 cuarentenados).
- **Commit**: f7df3d0 + push d48544a..f7df3d0.
- **R**: Fase D MVP WebView2 COMPLETA. Upgrade path Tauri 2 documentado. Siguiente: 51 codevfx -> OMAG.

### Iteracion 51 - codevfx -> OMAG (18/08/2026) - DONE

- **P**: plan loop-51-codevfx-omag.md � integrar capability codevfx (9 efectos procedimentales 100% c�digo: fire/ice/lightning/meteor/beam/ground/void/plasma/frost) en pipeline OMAG como generador nativo.
- **I**: 
  - Modality 'vfx' a�adida a mediafield.ts (Modality union + MODALITIES array).
  - VfxGeneratorAdapter en omag/vfx-generator.ts: implementa Generator interface (name='vfx-code', modality='vfx'); usa codevfx.planEffect + renderEffectHtml; genera HTML5 canvas autocontenido con GLSL, f�sica (gravedad/viento/fricci�n), part�culas escaladas, paleta base/acento/energ�a, hotkeys.
  - Wiring: export en generators.ts + defaultGenerators() incluye VfxGeneratorAdapter; omag/index.ts re-exporta generadores.
  - Tests: vfx-generator.test.ts (7 tests: validate, generate 9 kinds, inspect, export, data URI) + generators.test.ts actualizado (5 modalities + instanceof check).
- **V**: gates FULL verdes (typecheck 0, lint 0, test 193/193 runtime, build 43 paginas; 3 test files #25 cuarentenados).
- **Commit**: 4deb4e9 + push c1248f2..4deb4e9.
- **R**: codevfx -> OMAG COMPLETO. Pipeline OMAG ahora genera VFX procedimentales como assets nativos (HTML5 canvas + GLSL), criticables en el correction loop. Plan maestro backlog completado (iteraciones 46-51).

### Iteracion 52 - Screenflow mejoras: hot watch + cola Publication (18/08/2026) - DONE

- **P**: plan loop-52-screenflow-hot-publication.md � hot watch runner que vigila .ultraia/hot/, ejecuta scripts via run_screenflow.ts, crea Publication blog (auto-approve) + cloud opcional.
- **I**: 
  - Task/screenflow-hot-watch.ts: poll .ultraia/hot cada N seg (default 10s), 
esolveHotWatch detecta *.json nuevos, spawnea 
un_screenflow.ts, crea Publication blog (auto-approve) con createPublication + guardarPaqueteEnCloud opcional; flags --once, --interval, --db, --cloud, --dry-run, --hot-dir.
  - Tests: 10 nuevos (hot watch runner integraci�n mock: resolveHotWatch + buildPublicationPackage + resolveState flujo completo, idempotencia, give-up, published no reanuda, determinista sin generadoAt).
  - Fix: present.generadoAt no-determinista ? test determinista compara sin ese campo.
- **V**: gates FULL verdes (typecheck 0, lint 0, test 737+193 runtime, build 43 paginas; 3 test files #25 cuarentenados).
- **Commit**: be35a83 + push e17306a..be35a83.
- **R**: Screenflow hot watch + cola Publication COMPLETO. Pipeline: hot folder -> runner -> captura/acciones/edicion -> local publish -> Publication queue (blog) -> m�tricas.
## Iteración 53 -- IA Generativa Procedural + Research + Enlaces (18/08/2026)
**[P] Plan**
- Objetivo: capability generative (imagen/video/audio procedural keyless) + research (busqueda arXiv/GitHub/Web + cache + dedupe -> learning/truth) + script process-enlaces.ts para integrar URLs pendientes de enlaces.txt
- Plan file: .opencode/plans/loop-53-ia-generativa-procedural.md

- **[I] iteración 1 (core)**: 
  - tools/generative.ts (38 tests): perlin/simplex/mandelbrot/flowField/lSystem + valuesToSvg/Palette, keyframes/catmullRom, particleFrames, kenBurnsFrames, buildVideoPlan, synthWave/FM/granular/pinkNoise, ADSR, sequencer, mixSynths (mulberry32/fnv1a deterministicos, re-export encodeWav de omag/sound).
  - tools/research.ts (15 tests): searchArxiv+parseArxivAtom, researchWeb (reach), researchGitHub, fetchAndExtract (r.jina.ai), createResearchCache/File, normalizeUrl, researchSearch con dedupe (reescrito: #25 lo habia borrado del arbol).
  - tools/enlaces.ts (9 tests): extractUrl, slugifyUrl, hasProcessedMark, isSourceDownloaded, classifyEnlaces, downloadSource, contentChecksum.
  - Wiring: tools/index.ts (exports + Capability union + TOOL_DESCRIPTIONS), ai/llm.ts (generative_media 17 acciones, research_search, enlaces_process) — registros research/enlaces estaban QUARANTEADOS por #25 con comentario sin cerrar que rompia el build; restaurados.
  - Fixes ajenos bloqueantes: publish.ts BlobPart (Buffer<ArrayBufferLike> no asignable en lib DOM web — patron 78d25e0), screenflow.test.ts determinismo (strip generadoAt, mismo patron que su test hermano).
- **[V] gates FULL verdes**: typecheck 0, lint 0, test core 739/739 + runtime 193/193 (62 nuevos: 38+15+9), build OK. Cuarentena temporal de 3 test files #25 (connections/publications/publish) durante gates + restaurados con hash-check; flakes de red (Tunetank MCP content.live, yt-dlp audiolibrary) pasaron al reintentar.
### Iteracion 54 - Harness self-improvement (18/08/2026) - EN CURSO

- **[P] Plan**: paquete listo del plan loop-54-harness-self-improvement.md (escrito por la ronda
  de auditoria 18/08): fix `mark_done` en scripts/loop_piv.py (filtro por task_id — bug de
  concurrencia verificado, repro 2/4 FAIL en test de regresion) + skill
  `loop-concurrency-guard` (lock .ultraia/loop/session.lock + cuarentena formalizada) + skill
  `state-integrity-check` (5 checks read-only) + agente `state-doctor` en opencode.json
  (primary, edit:deny) + sync skills/loop-piv y skills/loop-verifier desde .opencode/skills/
  + docs/RAZONAMIENTO-AUDITORIA-HARNESS-2026-08-18.md. Lo pendiente: gates FULL + commit del
  paquete (paso 8 del plan: pegar fila 54 en STATE.md como pendiente, correr gates, commitear).
  Pre-flight: lock de sesion propio tomado (r54-UTEC-5260), sin lock ajeno, sin procesos de la
  sesion #25 activos (solo opencode de esta sesion). Arbol: indice con batch staged de #25
  (128 archivos: automation/recorder/blueprint/reach/connections/F6 + travel media + cuentas.txt
  + planes 46-53) — se cuarentenara a %TEMP%\opencode\wip-quarantine-20260818-r54\ durante
  gates y se restaurara byte-exact (hash-check). NO se tocan: STATE.md/run-log fuera del bloque
  propio, WIP #25, cuentas.txt, .ultraia/.

## 2026-08-18T16:44:17-03:00 — Triage

Report-only (state doctor + triage, sin edición de código). Hallazgos:

- **Iteración 54 EN CURSO**: paquete harness self-improvement staged pero sin commit (gates FULL + commit = paso 8 pendiente del plan). Pre-flight OK (lock r54-UTEC-5260, sin procesos #25).
- **Index ~128 archivos staged** (batch #25 + iter-54 + travel media + cuentas.txt + planes 46-53): `cuentas.txt` staged A — verificar sin secrets antes de commit; iter-54 declara NO tocarlo (cuarentena r54 + hash-check).
- **Deletions staged de test files** (reach.test.ts -260, blueprint.test.ts, vfx-generator.test.ts): confirmar intencionalidad antes de commitear (reach.test.ts borrado con reach.ts modificado = sospechoso).
- **Bitácora drift**: HEAD `5b85233` (iter-53) sin `[R]`/hash en run-log; `b4b3bf9` (travel videos) sin entrada. Cerrar cuando el humano lo pida.
- **STATE.md desync**: banner "ITERACIÓN 46 PAUSADA" obsoleto (47-52 DONE, sin `loop-pause-all`); 4 IDs duplicados (#16/#17/#36/#41); 10 filas huérfanas (19/20/45-52); 5 líneas `�` en STATE.md + 244 en run-log (encoding PS 5.1).
- **enlaces.txt L826 nuevo**: midudev/libros-programacion-gratis — pendiente de análisis (protocolo enlaces.txt).
- **`.ultraia/travel/` sin .gitignore** (~60 renders staged) — decidir ignorar o versionar.
- **Migrations nuevas sin commit**: add_channel_connection + connections.ts (WIP #25/iter-53-hud — NO tocar, vigilar prisma generate).

```json
{
  "run_id": "2026-08-18T16:44:17-03:00",
  "pattern": "triage",
  "duration_s": 2400,
  "items_found": 8,
  "actions_taken": 3,
  "escalations": 2,
  "tokens_estimate": 18000,
  "outcome": "report-only"
}
```

## 2026-08-18T17:02:00-03:00 — [P] SKIP — lock activo de r54-UTEC-5260-20260818194015 (heartbeat 2026-08-18T16:40:15 local, age 21.7 min)

Petición usuario "repite el loop por mejores" → ciclo PIVR NO iniciado por concurrency-guard:
lock `.ultraia/loop/session.lock` con `task_id: 54` (harness self-improvement) y heartbeat
< 30 min → sesión concurrente ACTIVA (opencode PIDs 15632/21328 vivos desde 16:28-16:29).
Esa sesión está en la fase final de iter-54 (gates FULL + commit del paquete). No es error:
cortesía entre sesiones. El backlog no tiene otra tarea accionable (todo DONE salvo #6 GPU
humana y #25 EN CURSO de la sesión #25). Retomar cuando el lock expire (heartbeat > 30 min
= sesión muerta) o el usuario confirme que la sesión r54 terminó. Sin sub-agents, sin edición
de código, sin commit.

```json
{
  "run_id": "2026-08-18T17:02:00-03:00",
  "pattern": "piv",
  "duration_s": 300,
  "items_found": 1,
  "actions_taken": 0,
  "escalations": 0,
  "tokens_estimate": 4000,
  "outcome": "no-op"
}
```

### Iteracion 54 - cierre (18/08/2026, sesion r54-UTEC-5260-20260818194015)

- **[I] commit 506c037** (feat(loop)): fix `mark_done` en scripts/loop_piv.py (filtro `int(m.group(1)) == task_id` + matched flag; repro 2/4 FAIL -> 4/4 PASS en loop_piv_mark_done.test.py) + skill `loop-concurrency-guard` + skill `state-integrity-check` (raiz + .opencode espejos) + agente `state-doctor` (opencode.json, read-only) + sync skills loop-piv/loop-verifier + docs/RAZONAMIENTO-AUDITORIA-HARNESS-2026-08-18.md + plan loop-54-harness-self-improvement.md.
- **[V] gates FULL GREEN**: typecheck core/web/runtime 0 errores (con WIP #25 en arbol) · lint 0 · test OK (aislamiento temporal de 3 archivos #25: connections.test.ts/publications.ts/publish.test.ts; flakes de red Tunetank content.live re-intentados hasta GREEN; runtime 193/193) · build OK (43 paginas).
- **[V] WIP #25 restaurado byte-exact**: 13/13 SHA256 == manifest wip-quarantine-20260818-r54 (leccion: `git checkout-index` escribe LF mientras el worktree original es CRLF -> restaurar desde backup, no desde index).
- **[V] concurrencia resuelta**: sesion r54-OVERRIDE-915455659 detectada (triage 16:44 + no-op JSON 17:02 + lock override 17:07) - registro explicito "sin commit" (outcome no-op); esta sesion retomo el lock y cerro la iteracion.
- **[R] DONE** - iteracion 54 cerrada (506c037). Push NO realizado (sin autorizacion explicita). Pendiente conocido: fila 53 de STATE.md sin entrada (drift bitacora, cerrar cuando el humano lo pida).