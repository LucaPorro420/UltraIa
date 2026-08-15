# Seguridad del Runtime Desktop (Fase A)

Aplica OWASP Top 10 / STRIDE a la superficie desktop. Detalle por componente:

> Cross-ref: versión canónica verificada en `desktopFase/SECURITY.md` (mismo contrato).
> Historial de movimientos y totales: `docs/HISTORIAL-PROYECTO.md`.

## 1. Secrets (config)

- `UltraConfig.secret()` **nunca persiste valores en claro**: en disco queda `'***'`; el host
  guarda el valor real en keychain del SO (o env). Al recargar, el valor real se re-inyecta por
  el host, no por el archivo.
- `.env` se parsea con `parseEnvFile` (formato estricto) y se carga solo desde rutas permitidas
  (`UltraPaths`).

## 2. Comandos (CommandExecutor)

- **Allowlist explícita** de comandos; nada se ejecuta por reflejo del input del usuario.
- Roles: `safe` / `restricted` / `admin` — el rol se valida antes de ejecutar.
- `allowShell` es **opt-in por comando**: sin él, los args nunca tocan un shell. (Mitiga
  command injection / OS command injection — OWASP A03.)
- Historial de ejecución con resultados truncados.

## 3. Módulos (ModuleRegistry/ModuleManager)

- Carga lazy solo tras validación de id/version (`ID_PATTERN`, semver).
- El `loader` es inyectado por el host (path allowlist); el runtime no ejecuta código arbitrario.
- Comunicación interna por event bus tipado; sin import de core (boundary de confianza LLM).

## 4. Tareas (TaskManager)

- Concurrency limitada por config; **AbortController por task** — cancel cooperativo y limpio.
- Tareas fallidas no se reintentan infinitamente (`retry` explícito).

## 5. Datos locales

- `.ultraia/` con permisos mínimos (0o700 en POSIX); en Windows ACLs por defecto del usuario.
- Backups del instalador no contienen secrets.
- Logs: `MemoryLogSink` en runtime; `ConsoleLogSink` JSON — sin datos sensibles (se sanitizan
  payloads de error en `logger`).

## 6. Health/Recovery (observabilidad y resiliencia)

- `HealthManager`: checks `critical` (fallo → `unhealthy`) vs `informative` (`resources` siempre
  `ok: true`, la presión se ve por eventos) — evita falsos `degraded` por RAM en dev.
- `Recovery`: backoff exponencial, políticas `restart`/`ignore`, estado `exhaust` — sin loops
  calientes.

## 7. Local API (Fase B — implementada 15/08/2026)

- **AuthN**: token de sesión (`crypto.randomBytes(32)` → hex) por request — header
  `Authorization: Bearer` (HTTP) o `?token=` (WS). Comparación **timing-safe** (sha256 +
  `timingSafeEqual`). El token se descarta al `stopLocalApi()` y nunca viaja por `/config`.
- **Loopback enforcement**: `Host` y `Origin` restringidos a `127.0.0.1`/`localhost`/`[::1]`
  → bloquea DNS rebinding y llamadas cross-origin del navegador (OWASP A01/A08).
- **AuthZ**: roles `user`/`operator`/`admin` se aplican dentro de `POST /commands/execute`
  (allowlist del CommandExecutor). El token es la frontera de confianza del host: los
  endpoints directos (`/modules/:id/start`) equivalen a acceso de host — decisión deliberada
  (la Shell es el único cliente esperado en loopback).
- **DoS**: rate limit por peer (ventana fija, default 120 req/min, `Retry-After` en 429) y
  body cap 64 KiB (413) — mitigación de flooding local.
- **Information disclosure**: `/config` devuelve solo `toPublicView()` (secrets `'***'`);
  `/memory` pasa por `ContextSelector` (budget) — nunca se drena toda la memoria.

## Threat model resumido (STRIDE)

| Threat | Mitigación |
|---|---|
| Spoofing (proceso impostor) | Local API con token de sesión (Fase B, timing-safe) + host/origin loopback |
| Tampering (config/estado) | Secrets fuera del disco; install.json sin secrets |
| Repudiation | Logs estructurados con timestamp + categoría |
| Information disclosure | Allowlist de comandos; sanitización de logs; CSP heredada de web |
| DoS (task/recursos) | Concurrency limit, abort, umbrales de recursos, rate limit API |
| Elevation (shell) | `allowShell` opt-in + roles admin |

## Checklist pendiente (Fases C/E)

- [ ] Binding a keychain del SO para secrets reales
- [ ] Validación de firmas de actualizaciones (Installer.update)
- [ ] Sandbox del loader de módulos (path allowlist estricto)
- [ ] Re-auditoría con gstack-cso antes de release