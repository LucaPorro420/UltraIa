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
- `(pendiente)` feat(core): AutoPub F4 - PublisherAdapter + YouTube/TikTok en TS (port RF-12) + tests mocks — publish.ts + publish.test.ts (staged) + docs (AUTO-PUBLICACION.md, AGENTS.md, STATE.md, loop-run-log.md).

**[V] Gates**
- Scoped: typecheck core ✅ · publish.test.ts **15/15 PASS** ✅
- FULL: (pendiente — typecheck → lint → test → build)

**[R] Veredicto**
- (pendiente)
