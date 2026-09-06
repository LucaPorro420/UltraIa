# PLAN: Localhost estable + poda de conexiones obsoletas (tarea #180, prioridad P0)

Fecha: 2026-09-06 · Modo: P-B · Patrón: Sensado→Razonamiento→Acción→Ajuste · Presupuesto: ~3h / 1 ciclo

## Contexto
- Pedido usuario: push (HECHO 1add3d2..6beb234) + eliminar conexiones con error/obsoletas + apartado para conectar todo al localhost en todo el proyecto + corregir errores web pegados.
- Triage de los errores: (a) `EvalError unsafe-eval` en dev = NUESTRO CSP (middleware + next.config bloquean eval que react-refresh necesita) → fix real dev-only; (b) `favicon.ico 404` = no existe favicon → crear `app/icon.svg`; (c) `contentscript/ObjectMultiplex/DeepSeek/Plurality` = extensiones de terceros inyectadas, NO código del repo → documentar, sin fix posible.
- Obsoletos con evidencia (websearch 06/09/2026): LinkedIn `v2/ugcPosts` = Legacy (Microsoft Learn) → migrar a Posts API `/rest/posts` + `LinkedIn-Version: 202608`; Meta Graph v21 expira 21/01/2027 (latest v26) → subir a v25 (expira 29/07/2028) en IG/FB/WhatsApp. Threads v1.0, X v2, TikTok, YT: vigentes.

## Objetivo
- Localhost sin errores propios + LinkedIn migrado + Meta v25 + hub `/connections` con sección Localhost, FULL verde, un commit pathspec, sin push.

## Pasos
1. `middleware.ts` + `next.config.ts`: `unsafe-eval` en script-src SOLO si `NODE_ENV !== 'production'`; añadir `http://localhost:* http://127.0.0.1:*` a connect-src (probes del hub).
2. `apps/web/src/app/icon.svg` NUEVO (favicon geométrico violeta, sin emojis).
3. `publish.ts`: `LINKEDIN_POSTS_URL` + paso 3 a Posts API (commentary/visibility/content.video) + `Linkedin-Version: 202608`; `LINKEDIN_UGCP_URL` ELIMINADO (poda); `IG/FB_MEDIA + whatsapp` → v25.0; notas social-connect LinkedIn actualizadas.
4. `publish.test.ts`: tests LI a Posts API (URL /rest/posts, error 'posts', éxito con x-restli-id) + asserts v25 + quitar import UGCP.
5. `connections/local-services.tsx` NUEVO (client, probes same-host :8000/:8100/health + `/api/health`, fail-soft 2.5s, comandos start.py) + wire en `page.tsx`.
6. Scoped → FULL con quarantine stash → bitácora + STATE 180 → commit pathspec → sin push.

## Archivos a tocar
- `apps/web/src/middleware.ts` — CSP dev-only
- `apps/web/next.config.ts` — CSP dev-only
- `apps/web/src/app/icon.svg` — NUEVO favicon
- `packages/core/src/tools/publish.ts` — LinkedIn Posts API + Meta v25
- `packages/core/src/tools/publish.test.ts` — tests migrados
- `packages/core/src/tools/social-connect.ts` — nota LinkedIn Posts API
- `apps/web/src/app/(app)/connections/local-services.tsx` — NUEVO hub localhost
- `apps/web/src/app/(app)/connections/page.tsx` — wire sección
- `.opencode/plans/loop-180-localhost.md` — NUEVO (este plan)
- `loop-run-log.md` — APPEND iter-180
- `STATE.md` — fila 180 + Last run

## Criterios
- Scoped: vitest publish + social-connect verdes + tsc core/web 0 propios.
- FULL: typecheck → lint → test → build (quarantine stash WIP ajeno, pop byte-exacto).
- En dev (`npm run dev`): sin EvalError; `/favicon` resuelto vía icon.svg; `/connections` muestra Localhost.
- Prod: CSP sin unsafe-eval (assert: `NODE_ENV=production` no incluye la cadena — verificado por lectura, no test).

## TOLERANCIAS
- Máx 3 fixes propios; si FULL rojo ajeno → quarantine; sin commit en rojo.
- Si el hub rompe el prerender de /connections → convertir a client-only con `ssr:false` o quitar fetch SSR (el diseño ya es client con useEffect).

## Riesgos / guardas
- Denylist intacto; sin secretos; sin tocar `auth/`. `stash pop` verificado con status.
- No "arreglar" extensiones de terceros: solo documentado en bitácora + respuesta.

## Esfuerzo estimado
- alto — 11 archivos, migración de API real + CSP + UI + FULL.
