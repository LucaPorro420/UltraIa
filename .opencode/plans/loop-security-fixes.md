# PLAN: Security Fixes — C04, H01, H05-H08, M09

Fecha: 2026-09-03 · Modo: P-B · Presupuesto: ~30 min

## Contexto
Security audit identified 6 code-level findings to fix before production deployment.

## Objetivo
Fix path traversal (C04/M09), logout session destruction (H01), and SSRF guards (H05-H08).

## Pasos
1. Export `isPublicUrl` from `packages/core/src/tools/web.ts` (currently private)
2. Fix C04 + M09: Path traversal guard in `apps/web/src/app/api/bridge/route.ts` (applyEdit, createCommit, rollbackFiles)
3. Fix H01: Logout session destruction in `apps/web/src/app/(app)/actions.ts`
4. Fix H05-H06: SSRF guard in `packages/core/src/tools/reach.ts` (readWeb, parseRss)
5. Fix H07: SSRF guard in `apps/web/src/app/api/assets/[id]/derive/route.ts`
6. Fix H08: SSRF guard in `apps/web/src/app/api/library/assets/route.ts`
7. Write tests for path traversal and SSRF guards
8. Run full gates

## Archivos a tocar
- `packages/core/src/tools/web.ts` — export isPublicUrl
- `apps/web/src/app/api/bridge/route.ts` — path traversal guard
- `apps/web/src/app/(app)/actions.ts` — destroySession on logout
- `packages/core/src/tools/reach.ts` — SSRF guard on readWeb + parseRss
- `apps/web/src/app/api/assets/[id]/derive/route.ts` — SSRF guard on frame URLs
- `apps/web/src/app/api/library/assets/route.ts` — SSRF guard on saveBinary URL
- `packages/core/src/tools/reach.test.ts` — SSRF tests (new)
- `packages/core/src/tools/web.test.ts` — isPublicUrl tests (new)

## RECURSOS / PRESUPUESTO
- isPublicUrl already exists in web.ts, just needs export
- reach.ts has no SSRF guard, needs import from web.ts
- session.ts already has destroySession, just needs call in actions.ts

## NO-hacer
- Don't touch .env, seed-data.mjs, or AUTH_SECRET (loop constraints)
- Don't change session token generation
- Don't modify CSP headers (M06-M07 — too complex without testing)

## Criterios de verificación
- FULL: typecheck → lint → test → build
- New tests: SSRF guard rejects private IPs, path traversal guard rejects relative paths
