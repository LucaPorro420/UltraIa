# Security Batch 2 — C02, H02, M10, M12

## Context
Second round of security fixes from `docs/SECURITY-AUDIT.md`. Batch 1 (C04, M09, H01, H05-H08) already committed. M05 (cookie secure flag) already correct (`NODE_ENV === 'production'`).

## Changes

### C02 — Admin credentials from env (seed-data.mjs)
- `ADMIN_PASSWORD` and `DEMO_PASSWORD` now read from `process.env` with safe defaults
- `.env` is gitignored; no secrets leak
- File: `packages/core/prisma/seed-data.mjs`

### H02 — Strengthen password policy (password.ts)
- Added common passwords blocklist (top 20 NIST/SecLists)
- Require uppercase + lowercase + number
- New test file: `packages/core/src/auth/password.test.ts`

### M10 — execSync → execFileSync (coordinator.ts)
- All `execSync('git ...')` calls replaced with `execFileSync('git', [...args])`
- Eliminates shell injection via crafted filenames or commit messages
- File: `packages/runtime/src/orchestrator/coordinator.ts`

### M12 — Cloudflare Worker CORS (worker.ts)
- Removed `'Access-Control-Allow-Origin': '*'` from static CORS_HEADERS
- `Access-Control-Allow-Origin` now always computed from origin + CLOUD_ALLOWED_ORIGINS
- Refactored rateLimit → checkRateLimit (returns boolean) so CORS headers available
- File: `cloudflare/worker.ts`

## Scope
- 4 files modified, 1 new test file
- Scoped tests: vitest for password.test.ts + existing auth tests
- Full gates: typecheck → lint → test → build
