# Sistema de Módulos (Fase A)

Contracto: `UltraModule` en `packages/runtime/src/types.ts`. Metadata en `ModuleRegistry`,
ciclo de vida en `ModuleManager`.

> Cross-ref: versión canónica verificada en `desktopFase/MODULE_SYSTEM.md` (mismo contrato).
> Historial de movimientos y totales: `docs/HISTORIAL-PROYECTO.md`.

## Registro (ModuleRegistry)

- `register(meta)` guarda **metadata solamente** (id, name, version, capabilities, deps) —
  no carga código.
- `capabilityMap` → qué módulo provee cada capability; `search(query)` filtra por id/name/
  description/capabilities.
- Reglas: id único, `ID_PATTERN /^[a-z0-9][a-z0-9-]{1,63}$/`, versión semver-ish.
- Los módulos **system** (`system`) se registran primero y nunca se desregistran.
- **`system-api`** (Fase B): módulo lazy del sistema que expone la Local API
  (capabilities `api.http`, `api.events`, `api.health`).

## Ciclo de vida (ModuleManager)

Estados: `registered → loading → installed → active ↔ stopped → error | disabled`.

- `load()`: ejecuta el `loader` inyectado (que retorna el objeto módulo) y resuelve deps.
- `start()`: lazy — solo cuando se pide. Si ya está `active` es no-op.
- `stop()/unload()`: eventos `module.stopped`/`module.unloaded`.
- `restart()`: stop + start.
- `stopAll()`: orden inverso de inicio (deps primero), con loader ausente → error claro.

## Comunicación

- `UltraEventBus` (event-bus.ts): topics planos `module.started` o wildcards `module.*` / `*`.
  Los handlers wildcard se matchean por patrón en cada emit (NO se invocan para todo).
- Un handler que lanza no rompe a los demás (error aislado + log).
- `emitAsync` secuencial con awaits; `emit` sincrónico (async handlers fire-and-forget con catch).
- La Local API (Fase B) puede suscribirse a eventos y re-emitirlos por WebSocket
  (`subscribeEvents` en `ApiHandlers`).

## Comandos

`CommandExecutor` permite a la shell/local API invocar capacidades de forma segura:

- Allowlist explícita; niveles `safe` (sin args shell) / `restricted` (revisión) / `admin`.
- `allowShell: true` opt-in por comando; nunca se pasa input del usuario a un shell sin ello.
- Historial con resultado truncado (500 chars + ellipsis).