# Plan: Fix localhost:3000 dev server — MIME type errors + chunk 404s

## Context
After opening localhost:3000, the browser console shows:
- CSS files served as `text/html` (MIME type error)
- JS chunks returning 404
- `productionSourceMaps` is an invalid Next.js config option (build warning)

Root cause: stale `.next` cache from previous builds + invalid config option causing dev server instability.

## Objective
Make localhost:3000 load cleanly with no console errors.

## Steps

### Step 1: Remove invalid config option
- **File**: `apps/web/next.config.ts`
- **Change**: Remove `productionSourceMaps: false` (line 9)
- **Why**: Not a valid Next.js option; causes build warning

### Step 2: Deep clean caches
- Kill ALL node processes (`taskkill /F /IM node.exe`)
- Remove `apps/web/.next/` directory
- Remove `node_modules/.cache/` if present
- This ensures no stale chunks remain

### Step 3: Start dev server fresh
- `npm run dev` with clean state
- Wait for "Ready" message

### Step 4: Verify
- Check CSS loads with `text/css` Content-Type
- Check JS chunks load (no 404)
- Check page renders (HTTP 200)

### Step 5: Commit
- `fix(web): remove invalid productionSourceMaps option from next.config.ts`
- Push to origin

## Files to modify
- `apps/web/next.config.ts` (remove line 9)

## Verification criteria
- No MIME type errors in browser console
- No 404 errors for chunks
- Page renders with correct styling
