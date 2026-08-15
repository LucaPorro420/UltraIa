# RUNTIME.md — UltraRuntime (@ultraia/runtime)

> Cross-ref: versión paralela del autor en `desktopFase/docs/RUNTIME.md` (mismo contrato).
> Historial de movimientos y totales: `docs/HISTORIAL-PROYECTO.md`.

Runtime local de ejecución: dueño único de servicios, módulos, tareas, recursos, comandos,
salud, memoria y eventos. El Shell habla con este objeto (directo o vía Local API) — nunca
con el SO.

## Creación

```ts
import { UltraRuntime } from '@ultraia/runtime';

const runtime = UltraRuntime.create({
  // root:        ruta de .ultraia/ (default <projectRoot>/.ultraia)
  // projectRoot: raíz del proyecto (default process.cwd())
  // resourceCollectors: collectores extra (GPU, disco...)
  // loader:      (module) => Promise<LoadedModule>  — host-provided, lazy
  // memoryPersistence: persitencia alternativa de memoria
  // loggerSinks: sinks de log extra
});
```

## Servicios expuestos (readonly)

`paths`, `config`, `logger`, `memoryLogs`, `events`, `tasks`, `registry`, `modules`,
`resources`, `commands`, `health`, `recovery`, `memory`, `context`, `version`.

## Ciclo de vida

| Método | Comportamiento |
|---|---|
| `start()` | Idempotente. dirs → `.env` (projectRoot y apps/web, sin sobrescribir) → memory.init → módulos/commands/health del sistema → resources.start |
| `stop()` | resources.stop → modules.stopAll → reporte + memo de cierre → memory.persist → evento `runtime.stopped` |
| `restart()` | stop + start |
| `status()` | `{ state, startedAt, uptimeMs, modules[], tasks{}, memory{}, version }` |
| `healthReport()` | `health.runAll()` |

## Registro de módulos del host

```ts
runtime.registerModules([
  { id: 'video', name: 'Video Studio', version: '0.1.0', description: '...',
    category: 'video', capabilities: ['video.generate'], weight: 'HEAVY', lazy: true },
]);
```

Solo metadata — nada se carga en boot. Los módulos se arrancan bajo demanda con
`module.start` (comando restricted).

## Comandos del sistema

`safe`: `system.status`, `system.health`, `system.modules`, `system.memory`,
`system.capabilities`, `task.list`.
`restricted` (operator+): `module.start`, `module.stop`, `task.cancel`.

## Eventos emitidos

`runtime.starting/started/stopping/stopped/error` · `module.registered/unregistered/
status/loading/loaded/started/stopped/unloaded/error/recovered` · `task.created/started/
completed/failed/cancelled/paused/resumed/progress/log` · `memory.updated` ·
`resource.updated/warning/critical` · `command.executed/denied/failed` ·
`health.report/changed` · `install.started/failed/completed/uninstalled` · `module.failure/
recovery-exhausted/recovered/retry-failed`.

Wildcards soportadas: `*` y `modulo.*` (ej. `module.*` matchea `module.started`, no `task.done`).

## Config

`UltraConfig` en `.ultraia/config/config.json`. `set(key, value, secret=true)` enmascara
el valor en disco (`***`); solo se recupera con `secret(key)` en memoria. `toPublicView()`
nunca expone secretos.

## Health

`HealthManager.runAll()` → `{ status: 'healthy'|'degraded'|'unhealthy', checks, criticalFailures, degraded }`.
Un check critical fallido → `unhealthy`; no-critical → `degraded`. Timeout por check
(default 5000ms). `health.changed` solo se emite en transiciones de estado.

## Uso mínimo

```ts
const rt = UltraRuntime.create();
await rt.start();
const health = await rt.healthReport();
await rt.stop();
```