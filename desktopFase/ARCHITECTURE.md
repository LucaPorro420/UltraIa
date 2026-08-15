# UltraIa Desktop — Architecture & Implementation Report

> Generado el 14/08/2026 tras inspección completa del repositorio y verificación de baseline
> (typecheck ✅ · lint ✅ · test 189/189 ✅ · build ✅). Documento de decisión previo a la
> implementación incremental del **Backend + Core + Orquestación + Memoria + Instalador**
> (`@ultraia/runtime`). Fase Shell/UI Desktop (Tauri) es un trabajo posterior separado.

---

## 1. Arquitectura actual

```
monorepo npm workspaces (raíz UltraIa/)
├── apps/web            Next.js 15 App Router · Tailwind v4 · React 19 · Vercel AI SDK
├── packages/core       Lógica de dominio pura TS ESM · Prisma · Vitest (189 tests)
├── gen-engine/         Motor multimedia self-hosted (FastAPI :8100, Python 3.12)
├── webhook server      FastAPI auxiliar (:8000, orquestado por start.py)
├── learning/           Sistema de memoria verificada (truth/ + responses/ + verify.py)
├── start.py            Supervisor de procesos (setup + web + webhooks + gen-engine)
└── desktopFase/        (vacío) — destino de la fase Desktop
```

- `packages/core` se consume como **TS fuente** (`@ultraia/core → packages/core/src/index.ts`),
  sin build de paquete; el web lo transpila vía `transpilePackages`.
- Todo el runtime lee `process.env` al vuelo (provider, keys, URLs) → el desktop debe cargar
  `.env` antes de importar core.
- Sesión/auth actual es cookie HTTP; las funciones core (`auth/session`, `auth/apikey`,
  `domain/*`) son puramente funcionales y reutilizables con `Db = PrismaClient` inyectado.
- Prisma singleton global en `packages/core/src/db/client.ts` (patrón a replicar).
- Patrón registro + health-check ya establecido: `registerGenEngineIfHealthy()` en
  `packages/core/src/tools/gen-engine.ts`.
- 13 modelos Prisma (User, Session, Workspace, AgentBlueprint, AgentVersion, Conversation,
  Message, Feedback, EvalRun, EvalCase, ApiKey, TechRadar, PromptLibrary, FavoritePrompt,
  GeneratedAsset).

## 2. Funcionalidades existentes (documentadas y presentes en código)

| Sistema | Ubicación | Estado |
|---|---|---|
| Generación de agentes (blueprint) | `core/src/domain/blueprint.ts` | Implementado |
| Chat con agente (stream) | `apps/web/src/app/api/chat/route.ts` | Implementado |
| Historial de conversaciones | `/api/conversations*` | Implementado |
| API v1 pública (x-api-key) | `/api/v1/agents/[id]/chat` | Implementado |
| Evaluaciones ponderadas + regression gate | `core/src/domain/eval.ts` | Implementado |
| Improvement pipeline (PENDING→approve) | `core/src/domain/improve.ts` | Implementado |
| Version rollback | `core/src/domain/versions.ts` | Implementado |
| API keys (hash, rate limit) | `core/src/auth/apikey.ts` | Implementado |
| Feedback GOOD/BAD + críticas | `core/src/domain/feedback.ts` | Implementado |
| Guardrails + rubrics | `core/src/ai/schemas.ts` | Implementado |
| Tools de agente (9 capabilities) | `core/src/tools/*` | Implementado |
| OMAG (sistema operativo de mundo) | `core/src/omag/` | Implementado (187+ tests) |
| MeiGEN API + librería de prompts | `/api/generate/v2` (externo), seed-library | Implementado |
| AgentReach (readWeb/searchWeb/GitHub/RSS) | `core/src/tools/reach.ts` | Implementado |
| Skills de agente (plan/build/test/...) | `core/src/tools/skills.ts` | Implementado |
| Gen-Engine wiring + keyless fallbacks | `core/src/tools/gen-engine.ts` | Implementado |
| Sistema de aprendizaje verificado | `learning/` | Implementado (16/16 PASS) |
| Design System Dark Obsidian | globals.css + DESIGN.md | Implementado |

## 3. Funcionalidades realmente funcionales (verificadas)

Verificación ejecutada hoy: `npm run typecheck` ✅ · `npm run lint` ✅ ·
`npm run test` (189/189 PASS, 33 archivos) ✅ · `npm run build` ✅ (31 rutas estáticas).
El smoke E2E (13/13) y el pipeline Python ar-SA quedan documentados como verdes en AGENTS.md.

**Conclusión: todo lo listado en §2 está implementado y pasa su verificación.**

## 4. Funcionalidades incompletas / placeholders

| Área | Estado real |
|---|---|
| `desktopFase/` | **Docs de la fase** (DESKTOP_ARCHITECTURE/RUNTIME/MODULE_SYSTEM/MEMORY_SYSTEM/INSTALLER/SECURITY/IPC) |
| Infraestructura runtime (registry/event bus/task/resource) | **Implementada** en `packages/runtime` (Fase A, 132/132 tests) |
| Instalador Desktop / actualizador / backup | **Implementado** en `packages/runtime/src/installer.ts` (Fase E pendiente: firma/canal) |
| Memoria de sesión/proyecto estructurada (.ultraia/) | **Implementada** (MemoryManager + ContextSelector) |
| Local API (HTTP/WS localhost + token + rate limit) | **Implementada** (Fase B, 15/08/2026): `packages/runtime/src/api/` — ver `docs/IPC.md` |
| `lib/shared/http.ts` | Copia de referencia comentada (el real vive en studio-client) |
| `shared/domain.ts` | Copia de referencia (no usada en runtime) |
| TTS edge-tts, música keyless, video storyboard | Funcionan keyless; el Gen-Engine real requiere claves/ffmpeg (guía en AGENTS.md) |

## 5. Módulos reutilizables (sin reescritura)

1. `packages/core/src/ai/*` — gateway LLM multi-proveedor (ollama/openai/google/deepseek/lmstudio).
2. `packages/core/src/domain/*` — blueprint, eval, improve, versions, feedback (adapters `Db`).
3. `packages/core/src/auth/*` — sesión, apikey, password (funciones puras, inyectar `Db`).
4. `packages/core/src/tools/*` — 9 capabilities + TOOL_DESCRIPTIONS + skills.
5. `packages/core/src/omag/*` — orquestador multimedia completo.
6. `packages/core/src/db/client.ts` — singleton Prisma (patrón).
7. `packages/core/src/ai/loop.ts` — `refineLoop<T>` (patrón para task retry/learning loop).
8. `start.py` — supervisor de procesos (patrón para `UltraRuntime` y launcher).
9. `learning/` — verificación de memoria (patrón para `MemoryManager`).
10. `tools/gen-engine.ts` — patrón health-check/registro (`registerGenEngineIfHealthy`).

## 6. Dependencias (inventario)

- **Runtime TS**: @ai-sdk/google, @ai-sdk/openai, @google/stitch-sdk, @prisma/client, ai,
  bcryptjs, cheerio, fast-xml-parser, zod (core); next 15.3.3, react 19, gsap, lottie-react,
  three, sonner, date-fns, clsx, tailwind-merge, react-resizable-panels, lucide-react (web).
- **Dev**: prisma 6, typescript 5.8, vitest 3, @vitest/coverage-v8, @playwright/test, eslint 8,
  tailwind 4.
- **Python**: fastapi/uvicorn (webhooks), gen-engine (torch, fastapi), pytest.
- **Systema**: Node ≥20, Python ≥3.12, ffmpeg (ya instalado en win), git.
- **Nuevas para runtime**: ninguna — se usa Node builtins (`node:events`, `node:fs`,
  `node:os`, `node:child_process`, `node:crypto`) + `zod` (ya hoisted). Decisión: **cero
  dependencias nuevas** para el núcleo del runtime.

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Monolito Desktop si la Shell carga todo | `LOAD ONLY WHEN NEEDED`: ModuleRegistry metadata-only + lazy loader + política de recursos |
| Ruptura de `packages/core` | Runtime usa **adapters** (interfaces `Db`, `AiGateway`) — nunca importa core por path interno; enlaces por inyección |
| Ejecución arbitraria vía comandos | CommandExecutor con allowlist por niveles (safe/restricted/admin) + logging SECURITY |
| API local expuesta a red | Binding `127.0.0.1` por defecto + token de sesión + origin validation + rate limit |
| Aprendizaje destructivo automático | El learning loop solo propone; la promoción pasa por regression + aprobación humana (reutiliza `improve.ts`) |
| Memoria infinita / contexto inflado | ContextSelector con presupuesto; memos con importance/confidence/retention; reports agregados |
| Pérdida de datos en update | Backup (db + config + memoria) antes de update/migrate/repair |
| Falla de módulo secundario tumba todo | Recovery por módulo: error→log→notify→cleanup→retry-safe; HealthManager aísla |
| Build concurrente con dev server | Regla operativa existente (AGENTS.md): no correr build con dev server activo |

## 8. Propuesta Desktop

**Decisión de tecnología (analizada, no por preferencia):**

| Criterio | Tauri 2 | Electron |
|---|---|---|
| RAM en reposo | ~60-150 MB (WebView del SO) | ~300-600 MB (Chromium propio) |
| Bundle | ~5-15 MB | ~100-200 MB |
| Filesystem/processos | Rust backend + permisos granulares | Node backend, acceso directo |
| Seguridad | allowlist IPC por comando | requiere hardening manual (contextIsolation, sandbox) |
| Next.js embebido | Dev server + build estático export | igual |
| Windows/Linux/macOS | 3 plataformas | 3 plataformas |
| Stack del repo | El equipo ya es TS/Node; Rust es carga nueva | TS/Node nativo — cero curva |
| Instalador Windows | MSI/NSIS (crates) | electron-builder NSIS/MSI |

**Recomendación: Tauri 2 con el runtime Node como proceso hijo gestionado por el lado Rust**
(IPC por allowlist) **si** el equipo acepta Rust para el shell. Alternativa pragmática:
**Electron + hardening estricto** (contextIsolation:true, sandbox:true, preload sin `nodeIntegration`,
IPC con allowlist de comandos) — coste de desarrollo menor y cero idioma nuevo, a cambio de
RAM. **Decisión resuelta 15/08/2026 en `SHELL_DECISION.md`: MVP = WebView2 puro (Windows) +
Local API como único contrato de IPC; upgrade path a Tauri 2 si la Fase E (instalador/firma/
auto-update) o macOS/Linux lo exigen** — el shell (sea cual sea) solo habla HTTP+token con el
runtime y el runtime nunca expone el SO directamente al frontend.

## 9. Propuesta Shell (resumen, fase posterior)

Shell = capa de control, no terminal: `IntentRouter → ModuleRegistry → LazyLoader → Workspace`.
Modos SHELL/CHAT/VIDEO/AUDIO/WEB_BUILDER/CODE/AGENT/MONITOR/MEMORY, keyboard-first
(Ctrl+K palette, Esc back), ResourceMonitor con polling adaptativo, WindowManager con
fullscreen/window/split/overlay. Identidad Dark Obsidian (no copiar ningún producto). Documentada
en `DESKTOP.md` de la fase 2 — no se implementa en esta fase.

## 10. Estrategia de migración

1. **Fase A (hecha)** — `packages/runtime` (`@ultraia/runtime`): infraestructura pura TS
   (event bus, tasks, modules, resources, commands, health, memory, config, installer,
   runtime) + tests. No toca `apps/web` ni `packages/core` (adapter-based).
2. **Fase B (hecha, 15/08/2026)** — Local API HTTP/WS en `127.0.0.1` con Node builtins
   (`packages/runtime/src/api/`): token de sesión timing-safe, origin/host loopback, rate
   limit, body cap, eventos WS, módulo `system-api` + comandos `api.*`. Contrato en
   `docs/IPC.md`; 20 tests nuevos (runtime 152/152).
3. **Fase C (✅ 15/08/2026)** — Adaptadores a `@ultraia/core` bajo
   `packages/runtime/src/adapters/` (`ports.ts` — `DbAdapter`/`AiGatewayAdapter`/`ToolsAdapter`/
   `OmagAdapter`/`CorePorts`; `db.ts` — `createPrismaDb` singleton por datasourceUrl + ping
   SELECT 1 + close idempotente; `ai.ts` — `createCoreAiGateway` env-safe + ping por
   `resolveModel` sin gastar tokens; `tools.ts` — `createToolsAdapter` catálogo + dispatcher
   passthrough a las 10 capabilities de core; `omag.ts` — `createOmagAdapter` con gateway
   inyectado si hay ai adapter, keyless sin él; `core.ts` — `createCorePorts` isHealthy/close).
34 tests nuevos (runtime 186/186). Core tocado SOLO para exportar `audiolibrary`/`sound`
    por la API pública (visibilidad, sin cambio de comportamiento). **Wiring completado
    15/08/2026 (iteración 5)**: módulo `system-core` en `UltraRuntime` (metadata lazy + factory
    `corePorts` LOAD-ONLY-WHEN-NEEDED en `RuntimeOptions` + comandos `core.health`/`core.ports`/
    `core.tools`/`core.omag`/`core.run`/`core.close` + health check `core`; 5 tests, runtime
    191/191, repo 409/409).
4. **Fase D** — Shell Desktop (decisión §8 resuelta en `SHELL_DECISION.md`: MVP WebView2 puro
   en Windows + Local API como único contrato IPC; upgrade path a Tauri 2) consumiendo solo la
   Local API.
5. **Fase E** — Instalador real (NSIS/MSI) + actualizador + firma.

Cada fase mantiene verde la verificación del repo (typecheck → lint → test → build).

## 11. Estrategia de instalación

`Installer` en el runtime con operaciones `install/uninstall/repair/update`:
1. check prereqs (node ≥20, python ≥3.12 opcional, ffmpeg opcional, puertos libres);
2. crear `.ultraia/` (config/runtime/logs/cache/memory/modules/models/projects/state);
3. resolver `.env` (copiar `.env.example`, NUNCA sobrescribir valores existentes);
4. `npm install` si node_modules ausente/stale (patrón de `start.py`);
5. `prisma migrate deploy` si `dev.db` ausente (patrón `db:migrate`);
6. health-check post-instalación (db, core import, provider AI, API local);
7. registro de instalación en `.ultraia/state/install.json` (idempotente);
8. `uninstall` conserva datos del usuario (backup previo); `repair` re-ejecuta pasos 3-6;
   `update` = backup → install → migrate → health → rollback si falla (Fase E: firma y canal).

## 12. Estrategia de memoria

- Directorio `.ultraia/memory/` (reports/ learnings/ decisions/ errors/ sessions/) gestionado
  por `MemoryManager` + persistencia opcional en Prisma (modelos futuros `RuntimeMemory`,
  `MemoryReport` — no rompe schema actual).
- Categorías: PROJECT/ARCHITECTURE/MODULE/TASK/ERROR/SOLUTION/DECISION/LEARNING/
  USER_PREFERENCE/PERFORMANCE.
- Cada memo: id, type, source, content, importance (0-1), confidence (0-1), retention,
  timestamps, projectId, moduleId. **No guardar indiscriminadamente**: umbral de importancia
  configurable y deduplicación por hash de contenido.
- `MemoryReport` agregado al cierre de sesión/tarea (qué cambió, qué funcionó, qué falló,
  errores, soluciones, decisiones, performance, recomendaciones).
- Recuperación por índice (categoría + importancia + frescura); nunca volcar toda la memoria.

## 13. Estrategia de aprendizaje

Se **amplía** el loop existente, no se reemplaza:

```
EXECUTION → OBSERVATION → EVALUATION → MEMORY → LEARNING PROPOSAL
          → REGRESSION TEST → HUMAN APPROVAL → PROMOTION
```

- El runtime aporta señales nuevas: task success/failure, errores, resource usage,
  execution feedback (via MemoryManager → memoria tipo LEARNING).
- La propuesta de aprendizaje usa el pipeline existente `improve.ts` (PENDING + regression
  gate + approve) — nunca promoción automática destructiva.
- `learning/` del repo sigue siendo la verdad verificada para prompts; el runtime alimenta
  sus fuentes, no las sobrescribe.

## 14. Plan de implementación por fases (esta iteración)

| # | Entregable | Archivos | Tests |
|---|---|---|---|
| 1 | Workspace `packages/runtime` | package.json, tsconfig, vitest.config | — |
| 2 | Types + Logger + Config | `src/types.ts`, `src/logger.ts`, `src/config.ts` | 3 |
| 3 | UltraEventBus | `src/event-bus.ts` | 1 |
| 4 | TaskManager | `src/task-manager.ts` | 1 |
| 5 | ModuleRegistry + ModuleManager | `src/module-registry.ts`, `src/module-manager.ts` | 2 |
| 6 | ResourceManager | `src/resource-manager.ts` | 1 |
| 7 | CommandExecutor | `src/command-executor.ts` | 1 |
| 8 | HealthManager + Recovery | `src/health.ts`, `src/recovery.ts` | 2 |
| 9 | MemoryManager + ContextSelector | `src/memory.ts`, `src/context.ts` | 2 |
| 10 | UltraRuntime | `src/runtime.ts` | 1 |
| 11 | Installer | `src/installer.ts` | 1 |
| 12 | Wiring root scripts + verificación final | package.json raíz | — |
| 13 | Docs | DESKTOP_ARCHITECTURE.md, RUNTIME.md, MODULE_SYSTEM.md, MEMORY_SYSTEM.md, INSTALLER.md, SECURITY.md | — |

Regla de verificación por fase: `tsc --noEmit` en runtime + tests del runtime; al final
de todo: `npm run typecheck && npm run lint && npm run test && npm run build` (repo completo).

---

**Principios operativos:** LOCAL-FIRST · MODULAR · LAZY-LOADED · RESOURCE-AWARE · SECURE ·
OBSERVABLE · RECOVERABLE · EXTENSIBLE · AI-NATIVE. Nada se declara terminado sin test +
typecheck + verificación.