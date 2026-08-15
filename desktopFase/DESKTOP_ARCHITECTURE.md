# UltraIa Desktop — Arquitectura

> Estado: Fase A (runtime) implementada y verificada (132/132 tests runtime + repo verde).
> Ver también: `ARCHITECTURE.md` (reporte de decisión), `RUNTIME.md`, `MODULE_SYSTEM.md`,
> `MEMORY_SYSTEM.md`, `INSTALLER.md`, `SECURITY.md`.

## Principios operativos

LOCAL-FIRST · MODULAR · LAZY-LOADED · RESOURCE-AWARE · SECURE · OBSERVABLE · RECOVERABLE ·
EXTENSIBLE · AI-NATIVE. Nada se declara terminado sin test + typecheck + verificación.

## Capas

```
Shell (Tauri 2 o Electron — Fase D)
   │  solo HTTP + token (Local API, Fase B)
   ▼
UltraRuntime  (packages/runtime, TS puro, cero deps nuevas)
   │  nunca expone el SO directamente
   ▼
packages/core (adapters Db/AiGateway/tools/omag — Fase C)
```

El shell habla con el runtime (directo o vía Local API en `127.0.0.1`); el runtime nunca
expone el sistema operativo al frontend. La decisión Tauri vs Electron queda diferida a la
Fase D: el contrato es la Local API, portable a ambos.

## Componentes del runtime (Fase A)

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `UltraPaths` | `config.ts` | Layout canónico `.ultraia/` (9 directorios) |
| `UltraConfig` | `config.ts` | Config JSON con secretos enmascarados |
| `UltraLogger` | `logger.ts` | Logs estructurados por categoría, sinks, `child()` |
| `UltraEventBus` | `event-bus.ts` | Pub/sub con wildcards `*` y `modulo.*` |
| `TaskManager` | `task-manager.ts` | Tareas con prioridad, cancelación cooperativa (AbortSignal) |
| `ModuleRegistry` | `module-registry.ts` | Metadata de módulos (nunca código) |
| `ModuleManager` | `module-manager.ts` | Ciclo de vida: load/start/stop/unload/restart |
| `ResourceManager` | `resource-manager.ts` | CPU/Memoria reales, niveles NORMAL/WARNING/CRITICAL |
| `CommandExecutor` | `command-executor.ts` | Allowlist de comandos por nivel/rol |
| `HealthManager` | `health.ts` | Checks agregados, timeout por check, transiciones |
| `Recovery` | `recovery.ts` | Reintentos por módulo con backoff |
| `MemoryManager` | `memory.ts` | Memoria estructurada con importancia/confianza/dedup |
| `ContextSelector` | `context.ts` | Presupuesto de contexto para el LLM |
| `Installer` | `installer.ts` | install/uninstall/repair/update + backup/rollback |
| `UltraRuntime` | `runtime.ts` | Orquestador: dueño único de todo lo anterior |

## Ciclo de vida

```
start()   → dirs → .env (projecto + apps/web) → memory.init() → módulos/commands/health
            del sistema → resources.start() → estado 'running'
stop()    → resources.stop() → modules.stopAll() → reporte + persist de memoria → 'stopped'
restart() → stop() + start() (idempotente)
```

- `start()` es idempotente (no-op si ya corre).
- En `stop()` se genera un `MemoryReport` y se persiste un memo `PROJECT` de cierre.

## Módulos del sistema (registrados en boot)

- `system` (LIGHT): capabilities `system.status`, `system.health`, `system.memory`.
- `memory` (LIGHT): capabilities `memory.store`, `memory.search`, `memory.report`.
- Comandos del sistema: `system.status`, `system.health`, `system.modules`, `system.memory`,
  `system.capabilities`, `module.start` (restricted), `module.stop` (restricted),
  `task.list`, `task.cancel` (restricted).
- Health checks: `runtime` (critical), `modules`, `memory`, `resources` (informativos).

## Registro de hosts

- `registerModules(RuntimeModule[])`: metadata-only, nada se carga en boot.
- `loader` opcional en `RuntimeOptions`: sin loader, los módulos quedan lazy (nunca cargan).
- Collectors extra de recursos: `resourceCollectors`.

## Fases

| Fase | Contenido | Estado |
|---|---|---|
| A | `packages/runtime` (infraestructura pura TS + tests) | ✅ Implementada (132/132) |
| B | Local API HTTP/WS en 127.0.0.1 + token (contrato REST en `RUNTIME.md`) | Pendiente |
| C | Adaptadores a `@ultraia/core` (Db, AiGateway, tools, omag) | Pendiente |
| D | Shell Desktop (Tauri 2 o Electron) consumiendo solo la Local API | Pendiente |
| E | Instalador real (NSIS/MSI) + actualizador + firma | Pendiente |

## Verificación

- Runtime: `npm run typecheck -w @ultraia/runtime` + `npm run test -w @ultraia/runtime` (132 tests).
- Repo completo: `npm run typecheck && npm run lint && npm run test && npm run build`.
- Si vitest da fallos raros tras editar: limpiar `node_modules/.vite` (caché de transform stale).