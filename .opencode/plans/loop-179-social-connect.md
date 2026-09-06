# PLAN: Conexiones sociales + inicio de sesión (tarea #179, prioridad P0)

Fecha: 2026-09-06 · Modo: P-B · Patrón: Sensado→Razonamiento→Acción→Ajuste · Presupuesto: ~3h / 1 ciclo

## Contexto
- Pedido usuario: "crea la conexion para instagram, tiktok, facebook, linkedin e otras redes e conexiones e inicio sesion para que puedas navegar libremente y subir automatizaciones".
- Sensado: los 14 adapters de publicación YA existen (`publish.ts`: youtube/tiktok/x/instagram/threads/facebook/linkedin/telegram/discord/slack/reddit/pinterest/whatsapp/zernio) + dominio `connections.ts` (tokens AES-256-GCM en DB) + `browser-agent.ts` (Playwright con fallback plan-only). Falta: (1) capa unificada de ESTADO de conexión por red (qué env falta), (2) guías de login/OAuth por red, (3) contrato de sesión de navegador (cookies → storageState) para navegación autenticada. Sin símbolos colisionados (grep vacío).

## Objetivo
- Capability `social-connect` (dominio puro + tool `social_connect` + wiring + docs + 22 tests) con gates FULL verdes en un commit pathspec, sin secretos en el repo y sin tocar `auth/`, `.env*` ni WIP ajeno.

## Pasos
1. Crear `packages/core/src/tools/social-connect.ts` (SOCIAL_NETWORKS 14 redes, socialStatus, loginGuide, validateSessionCookies, buildStorageState, planBrowserLogin).
2. Crear `packages/core/src/tools/social-connect.test.ts` (22 tests, env inyectado, cero red).
3. Wiring: `ai/llm.ts` tool `social_connect` (dynamic import) + `tools/index.ts` (`export *`, `import * as socialConnect`, `tools.socialConnect`, TOOL_DESCRIPTIONS, Capability `'social-connect'`).
4. Docs: sección en `docs/CANALES-CONFIG-2026.md` tras "Cómo probar" (conexión + sesión navegador + regla anti-secretos).
5. Scoped (vitest archivo + tsc core) → FULL con cuarentena stash del WIP ajeno → bitácora + STATE fila 179 → commit pathspec → sin push.

## Archivos a tocar
- `packages/core/src/tools/social-connect.ts` — NUEVO (dominio + schemas)
- `packages/core/src/tools/social-connect.test.ts` — NUEVO (22 tests)
- `packages/core/src/ai/llm.ts` — bloque tool `social_connect`
- `packages/core/src/tools/index.ts` — export/import/tools/TOOL_DESCRIPTIONS/Capability
- `docs/CANALES-CONFIG-2026.md` — sección conexión e inicio de sesión
- `.opencode/plans/loop-179-social-connect.md` — NUEVO (este plan)
- `loop-run-log.md` — APPEND iter-179
- `STATE.md` — fila 179 + Last run

## Criterios
- Scoped: vitest social-connect 22/22 + `tsc --noEmit` core 0 propios.
- FULL antes de commit: typecheck → lint → test → build (con stash-quarantine del WIP: 15 M + untracked intactos tras `stash pop`).
- Verifier: APPROVE sobre este plan. Cero secretos en diff (`grep -i token` solo nombres de ENV, ningún valor).

## TOLERANCIAS
- Si FULL rojo por WIP ajeno → quarantine stash, re-run; si sigue rojo por causa propia → máx 3 fixes, luego High Priority sin commit.
- Si `stash pop` conflicta (improbable, no tocamos esos archivos) → resolver a favor del WIP ajeno y reportar.

## Riesgos / guardas
- Denylist: `.env*`, `auth/`, `payments/`, `secrets/`, `credentials/`, `.vscode/` — prohibido.
- Los tokens viven SOLO en env del proceso o DB cifrada existente; el módulo nuevo NUNCA persiste ni imprime valores (solo nombres de vars + faltantes).
- Studio AGPL / licencias: no aplica (código original). Login de redes con anti-bot (IG/TikTok/FB): la navegación autenticada es vía sesión importada por el HUMANO (cookies), nunca credential-stuffing.

## Esfuerzo estimado
- medio-alto — módulo ~300 líneas + 22 tests + wiring + docs + FULL con quarantine.
