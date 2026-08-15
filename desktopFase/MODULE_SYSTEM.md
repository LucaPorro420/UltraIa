# MODULE_SYSTEM.md — Sistema de módulos

> Cross-ref: versión paralela del autor en `desktopFase/docs/MODULE_SYSTEM.md` (mismo contrato).
> Historial de movimientos y totales: `docs/HISTORIAL-PROYECTO.md`.

Política: **LOAD ONLY WHEN NEEDED**. El registry guarda metadata; nada carga código en boot.
El ModuleManager decide cuándo un módulo se carga/arranca (lazy por defecto).

## Metadata (`UltraModule`)

```ts
interface UltraModule {
  id: string;            // ^[a-z0-9][a-z0-9-]{1,63}$ (validado)
  name: string;
  version: string;       // semver-ish ^\d+\.\d+\.\d+ (validado)
  description: string;
  category: 'ai'|'video'|'audio'|'web'|'code'|'automation'|'system'|'data';
  capabilities: string[];   // descubrimiento sin cargar nada
  status: 'available'|'installed'|'loading'|'active'|'error'|'disabled';
  entryPoint?: string;  route?: string;  api?: string;
  dependencies?: string[];
  estimatedMemory?: number;
  lazy?: boolean;
  weight?: 'LIGHT'|'MEDIUM'|'HEAVY'|'GPU'|'EXTERNAL';
  maxRetries?: number;  // auto-recovery antes de surface error
}
```

## ModuleRegistry (qué existe)

- `register()` valida id + version; rechaza duplicados.
- `list()`, `listByCategory()`, `findByCapability()`, `hasCapability()`, `search()`,
  `capabilityMap()` (para el orquestador AI), `describe()` (vista compacta).
- `setStatus()` emite `module.status`.

## ModuleManager (cuándo corre)

`LoadedModule` = handle del host: `{ start?, stop?, unload?, health? }`.

| Operación | Comportamiento |
|---|---|
| `load(id)` | Idempotente; solo con loader configurado; estados `loading → installed`; error → `error` + evento |
| `start(id)` | Load si falta (lazy); `installed → active`; llama `handle.start()` |
| `stop(id)` | `handle.stop()`; `active → installed` |
| `unload(id)` | stop previo si activo; `handle.unload()`; `→ available` (libera memoria) |
| `restart(id)` | stop + start |
| `recoverError(id)` | `error → available` |
| `stopAll()` | Todos los activos, orden inverso de registro |
| `health(id)` | `handle.health()`; `{ok:false, detail:'not loaded'}` si no hay handle |

Sin loader configurado, `load()`/`start()` lanzan `ModuleManager has no loader configured` —
los módulos quedan registrados pero inertes (comportamiento esperado en tests/hosts sin loader).

## Recursos y descarga

`ResourceManager` sugiere descarga de módulos inactivos `HEAVY`/`GPU` solo en nivel
CRITICAL (`unloadSuggestions`). Nunca mata nada por su cuenta — la Shell decide.

## Recuperación

`Recovery` por módulo: `setPolicy(id, {maxAttempts, backoffMs, action})` (defaults
2 / 1000ms / restart). Falla de un módulo → `module.failure` → retry con backoff →
`module.recovered` o `module.recovery-exhausted`. Un módulo roto NUNCA tumba el runtime.

## Categorías de peso

`LIGHT` (sys/mem) cargan siempre; `MEDIUM` bajo demanda; `HEAVY`/`GPU` solo por
comando explícito y con monitoreo; `EXTERNAL` delega a un proceso/servicio externo.