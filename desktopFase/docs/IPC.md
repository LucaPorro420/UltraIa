# Local API & IPC (Fase B — IMPLEMENTADA 15/08/2026)

> Cross-ref: `desktopFase/DESKTOP_ARCHITECTURE.md` (fases) y `desktopFase/SECURITY.md`
> (threat model). Historial de movimientos y totales: `docs/HISTORIAL-PROYECTO.md`.

Contrato que conecta la Shell (Tauri/Electron) con el runtime: **Local API HTTP/WebSocket en
`127.0.0.1`** (puerto efímero elegido en runtime y comunicado al host).

## Stack

- Server HTTP + WebSocket con **Node builtins** (`node:http`, `node:crypto`, `node:stream`) —
  cero dependencias. Código en `packages/runtime/src/api/`:
  - `server.ts` — `LocalApiServer` (auth, origin/host, rate limit, body limit, rutas, upgrade WS).
  - `ws.ts` — `WebSocketConnection` (handshake RFC 6455 + framing manual, máx. 16 MiB/frame).
  - `runtime-handlers.ts` — adapter `runtimeApiHandlers(runtime)` (validación + gateway).
- El runtime lo expone vía `UltraRuntime.startLocalApi()` / `stopLocalApi()` / `localApiUrl` /
  `apiToken` y como módulo registrado `system-api` (capabilities `api.http`, `api.events`,
  `api.health`, lazy) + comandos `api.start` / `api.stop` / `api.url`.
- Puerto efímero (0) por defecto; host fijo `127.0.0.1`. Nunca `0.0.0.0`.

## Contrato implementado

```
GET  /health                → HealthReport (runtime health checks)
GET  /status                → RuntimeStatus (modules, tasks, memory, version)
GET  /modules               → metadata de módulos registrados
POST /modules/:id/start     → lazy start (404 si el módulo no existe)
POST /modules/:id/stop      → (404 si no existe)
POST /commands/execute      → { command, args, role } (allowlist + roles user/operator/admin)
POST /tasks                 → { type, priority?, module? } → Task
GET  /tasks/:id             → Task (404 si no existe)
POST /memory                → { type, source, content, importance?, confidence?, ... } → MemoryEntry
GET  /memory?query=&types=&budgetChars= → ContextSelector selectFromMemory (budget)
GET  /config                → UltraConfig.toPublicView() (secrets SIEMPRE '***')
WS   /events?token=…        → {type:'connected'} + eventos {type:'event', topic, payload, at}
```

Errores: `400` (JSON inválido / validación), `401` (token), `403` (host/origin no loopback),
`404` (ruta o recurso), `413` (body > 64 KiB), `429` (rate limit, con `Retry-After`), `500`.

## Seguridad

- **Token de sesión** por request (`Authorization: Bearer <token>`) y en WS vía `?token=`.
  Generado por el runtime (`crypto.randomBytes(32).hex`), comparación **timing-safe**
  (sha256 + `timingSafeEqual`), descartado al `stopLocalApi()`. El token NO se expone vía
  `GET /config`; solo el host lo lee con `runtime.apiToken`.
- **Loopback enforcement**: `Host` y `Origin` deben ser `127.0.0.1`/`localhost`/`[::1]` (bloquea
  DNS rebinding y llamadas cross-origin del navegador). Clientes no-browser (curl, Node) sin
  `Origin` pasan igualmente.
- **Rate limit** por peer (ventana fija, default 120 req/min) aplicado antes de la autenticación.
- **Body cap** 64 KiB (413). El runtime NO expone secrets (siempre `'***'`).
- Alcance: el token es la frontera de confianza del host — las **roles de comandos** siguen
  aplicándose dentro de `POST /commands/execute` (p.ej. `module.start` exige operator+).
  Los endpoints directos (`/modules/:id/start`) equivalen a acceso de host; documentado en
  `SECURITY.md` como elección deliberada (la Shell es el único cliente esperado).

## Uso desde la Shell

```ts
const url = await runtime.startLocalApi();          // http://127.0.0.1:<port>
const token = runtime.apiToken;                     // host-only
await fetch(`${url}/status`, { headers: { authorization: `Bearer ${token}` } });
// WS:
const ws = new WebSocket(`${url.replace('http', 'ws')}/events?token=${token}`);
```

## Verificación

- `packages/runtime/src/api/server.test.ts` (11 tests: auth/origin/ratelimit/body/rutas/WS/close).
- `packages/runtime/src/api/runtime-api.test.ts` (9 tests de integración con `UltraRuntime` real:
  status/health, idempotencia + comandos `api.*`, roles sobre HTTP, tasks, memory, secrets,
  módulos, eventos WS, cierre limpio). Runtime 152/152 PASS.