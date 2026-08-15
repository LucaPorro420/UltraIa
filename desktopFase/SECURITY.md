# SECURITY.md — Modelo de seguridad del runtime

## Postura

LOCAL-FIRST y SECURE por diseño: el runtime nunca expone el SO directamente al frontend;
toda interacción pasa por el `CommandExecutor` (allowlist) o por la Local API (implementada,
127.0.0.1 + token). El shell (Tauri/Electron) solo habla HTTP + token.

## Comandos: allowlist + niveles + roles

- Solo se ejecutan comandos **registrados** (`register()` con `id`, `level`, `handler`).
  `execute()` de un id desconocido → `unknown command (allowlist only)`.
- Niveles: `safe` (user) · `restricted` (operator+) · `admin` (admin).
  `ROLE_RANK >= LEVEL_RANK` es la única vía; denegación → evento `command.denied` +
  log `SECURITY`.
- **Shell/exec**: cualquier comando `admin` cuyo id matchee `/shell|exec/i` requiere
  que el host active `allowShell: true` explícitamente; sin eso, el `register()` mismo
  falla. Nunca hay shell implícito.
- Historial: máx. 200 registros; `sanitize()` trunca resultados string > 500 chars
  (`…`) y registra `actor` (user/rol).

## Secretos

- `UltraConfig.set(key, value, secret=true)`: el valor vive en memoria; `save()` escribe
  `***` en disco; `toPublicView()`/`getAll` nunca lo expone; se recupera solo con
  `secret(key)`.
- `.env` se carga con `loadEnvFile()` que **no sobrescribe** valores ya presentes en
  `process.env`.

## Red (Fase B — Local API, implementada 15/08/2026)

- Binding `127.0.0.1` por defecto (nunca 0.0.0.0).
- Token de sesión (timing-safe) + origin/host validation + rate limit + body cap —
  implementado en `packages/runtime/src/api/`; detalle en `docs/IPC.md` y `docs/SECURITY.md` §7.

## Aislamiento y resiliencia

- **Módulos**: una falla queda aislada — `Recovery` reintenta con backoff (maxAttempts
  default 2) y nunca tumba el runtime; los errores se surfacean como eventos/verdicts.
- **Recursos**: `ResourceManager` solo SUGIERE descarga de módulos HEAVY/GPU en CRITICAL;
  no mata nada.
- **Health**: check con timeout individual (default 5000ms); un check colgado no bloquea
  los demás; `health.changed` solo en transiciones.
- **Logging**: `UltraLogger` nunca lanza (sink roto → se traga y avisa al siguiente);
  categoría `SECURITY` para denegaciones y fallos de comandos.

## Riesgos documentados (ARCHITECTURE.md §7) y mitigación

| Riesgo | Mitigación |
|---|---|
| Monolito Desktop | ModuleRegistry metadata-only + lazy loader + política de recursos |
| Ruptura de core | Runtime usa adapters por inyección; nunca imports internos |
| Ejecución arbitraria | Allowlist + niveles + `allowShell` explícito + logging SECURITY |
| API local expuesta | 127.0.0.1 + token + origin + rate limit (Fase B) |
| Aprendizaje destructivo | El loop solo propone; promoción con regression + aprobación humana |
| Pérdida de datos | Backup (db+config+memoria) antes de update/migrate/repair |

## Verificación

- Tests de seguridad: `command-executor.test.ts` (allowlist, roles, shell-gate),
  `config.test.ts` (masking), `health.test.ts` (aislamiento), `recovery.test.ts`,
  `api/server.test.ts` (auth/origin/rate limit/body), `api/runtime-api.test.ts` (roles + secrets).
- 152/152 tests runtime (132 Fase A + 20 Fase B).