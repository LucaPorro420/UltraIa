# UltraIa Desktop — Runtime Architecture

> Fase A (infraestructura runtime) — paquete `@ultraia/runtime` (`packages/runtime`).
> Fuente canónica de decisiones: `desktopFase/ARCHITECTURE.md` y el prompt maestro `AGENT.md`.
> Cross-ref: versión canónica verificada en `desktopFase/RUNTIME.md` (mismo contrato).
> Historial de movimientos y totales: `docs/HISTORIAL-PROYECTO.md`.

## Stack y principios

- **TS puro, cero dependencias de runtime** (solo Node builtins: `node:events`, `node:fs`,
  `node:os`, `node:crypto`, `node:child_process`, `node:http`, `node:net`, `node:stream`).
  DevDeps: typescript/vitest/@types/node (hoisted).
- Portable a **Tauri 2 o Electron**: la decisión de shell se toma en la Fase C. El contrato IPC
  ya existe como **Local API** en `127.0.0.1` (Fase B — ver `IPC.md`).
- Principios: LOCAL-FIRST, MODULAR, LAZY-LOADED, RESOURCE-AWARE, SECURE, OBSERVABLE,
  RECOVERABLE, EXTENSIBLE, AI-NATIVE.
- Integración con `@ultraia/core` **solo por adapters/inyección** (Db, AiGateway) — nunca imports
  internos de core (Fase C).

## Layout

```
packages/runtime/src/
  index.ts             exports públicos (@ultraia/runtime)
  types.ts             contratos: UltraModule, Task, MemoryEntry, HealthReport, RuntimeStatus…
  logger.ts            UltraLogger: ConsoleLogSink (plain/JSON), MemoryLogSink, child loggers
  config.ts            UltraPaths (.ultraia/), parseEnvFile/loadEnvFile, UltraConfig
  event-bus.ts         UltraEventBus: wildcards `*`/`module.*`, emit/emitAsync, aislamiento de errores
  task-manager.ts      TaskManager: prioridad, concurrency, cancel/retry/pause, abort por task
  module-registry.ts   ModuleRegistry: metadata-only, capabilityMap, search
  module-manager.ts    ModuleManager: lazy load/start/stop/unload/restart/stopAll
  resource-manager.ts  ResourceManager: CpuUsageSampler (delta real), MemoryUsageCollector
  command-executor.ts  CommandExecutor: allowlist, roles, allowShell guard, history
  health.ts            HealthManager: checks críticos/informativos, report + health.changed (transición)
  recovery.ts          Recovery: backoff, políticas restart/ignore/exhaust
  memory.ts            MemoryManager + JsonFileMemoryPersistence (dedup sha256)
  context.ts           ContextSelector: presupuesto de chars, prioridad por score
  runtime.ts           UltraRuntime: orquestación (start/stop/restart/status, comandos system.*)
  installer.ts         Installer: install/uninstall/repair/update/backup (exec inyectable)
  api/server.ts        LocalApiServer: token timing-safe, host/origin loopback, rate limit, WS upgrade
  api/ws.ts            WebSocketConnection: handshake RFC 6455 + framing manual (máx 16 MiB/frame)
  api/runtime-handlers.ts  runtimeApiHandlers(runtime): validación + gateway
```

## UltraRuntime (orquestador)

`UltraRuntime.create({ root, projectRoot, loader, ... })` compone: events + logger + config +
registry + moduleManager + resources + commands + health + recovery + memory + context + tasks.

- Comandos built-in: `system.status`, `system.health`, `system.modules`, `system.memory`,
  `system.capabilities`, `module.start|stop`, `task.list|cancel`.
- **Idempotente**: `restart()` no duplica modules/comandos/checks (guard `registerSystem*`).
- Eventos: `module.*`, `task.*`, `health.changed` (solo transición), `health.report` (siempre),
  `resource.*`, `memory.*`, `runtime.*`, `api.started/stopped`.
- Health check `resources` es **informativo** (`ok: true` siempre; la presión se ve por
  `resource.*` events) — no degrada el estado global por RAM alta en dev.
- **Local API (Fase B)**: `startLocalApi({port?, token?})` → URL `http://127.0.0.1:<puerto>`;
  `stopLocalApi()` idempotente descarta el token; `apiToken` (host-only) y `localApiUrl`
  como getters; módulo registrado `system-api` (capabilities `api.http`, `api.events`,
  `api.health`, lazy). `stop()` del runtime cierra la API primero.

## Buenas prácticas detectadas (tests)

- Cancel de task que aún no arrancó: el estado CANCELLED se preserva (guard en el body antes de
  RUNNING). Un AbortController por task, abortado en `cancel()`, limpiado en `finally`.
- Secrets: `UltraConfig.secret()` enmascara en disco (`'***'`) — el host las guarda en keychain/OS.
- `ContextSelector.selectFromMemory` exige keyword match cuando hay query y umbral `importanceMin`
  por defecto 0.3.
- En Windows `os.loadavg()` es `[0,0,0]` — el sampler usa delta de ticks de CPU.
- Token de la Local API: `sha256` + `timingSafeEqual`; Host/Origin loopback (bloquea DNS rebinding).

## Verificación

```
npm run typecheck -w @ultraia/runtime
npm run test -w @ultraia/runtime       # 152 tests (Fase A 132 + Fase B 20)
npm run typecheck && npm run lint && npm run test && npm run build   # repo completo
```