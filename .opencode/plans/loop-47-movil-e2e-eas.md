# Loop 47 — Móvil E2E + EAS build (apps/mobile)

## Contexto
- Iteración 47 del plan maestro (fila 46/128 STATE.md): la app móvil Expo SDK 57 se
  construyó en loop-45 (f106546) con tsc + expo export web OK, pero NUNCA se probó
  end-to-end contra la API real ni se configuró EAS para builds Android/iOS.
- El usuario confirmó (18/08): "cuenta Expo para EAS" disponible.
- Dev server: hubo deuda memory-fs (b601ec5/8ae11bf fixes .js); verificar si /login
  responde hoy antes de E2E.

## Objetivo
1. E2E de la API REST que consume el móvil (auth REST + endpoints que usa la app).
2. Config EAS build: `apps/mobile/eas.json` (development/preview/production) +
   verificación expo-doctor + documentación de comandos.
3. Gates FULL + commit + push.

## Pasos
1. Arrancar dev server web limpio (`python start.py --web` o npm run dev con logs a
   %TEMP%); health-check /login 200.
2. E2E auth: POST /api/auth/register (user de prueba efímero) → POST /api/auth/login →
   GET /api/auth/me con header x-ultraia-session → usar token en publications/metrics/
   cloud/blog (los 4 tabs de la app). Limpiar usuario de prueba tras el test.
3. Mobile: `npm run typecheck` en apps/mobile (tsc --noEmit) + `npx expo-doctor` +
   `npx expo export --platform web` (valida bundle). SIN tocar node_modules del web.
4. EAS: crear `apps/mobile/eas.json` con profiles (development: developmentClient,
   preview: internal distribution, production: store) — cli.appVersionSource local
   para no requerir EAS project linking remoto. NO hacer `eas login` (interactivo,
   requiere al usuario). Documentar en docs/MOBILE.md sección EAS los comandos exactos
   (`eas build --platform android --profile preview` etc.).
5. Gates FULL en orden CI (cuarentena tests #25 si aplica; taskkill antes de build;
   .next limpio; 2 intentos si raza).

## ARCHIVOS A TOCAR
- `apps/mobile/eas.json` (NUEVO)
- `docs/MOBILE.md` (sección EAS build)
- `apps/mobile/package.json` (script `eas` si conviene)
- (NO apps/web/*, NO packages/core/* — E2E es solo prueba manual de la API)

## Criterios
- Scoped: mobile tsc EXIT 0 + expo-doctor sin errores + expo export web OK.
- FULL: npm run typecheck → lint → test → build EXIT 0.
- E2E: login 200 + /me 200 + publicaciones 200 + cloud 200 + blog 200 (con token).

## Riesgos
- Dev server sigue roto por memory-fs → reportar y E2E vía `next start` sobre build
  previo (fallback) o marcar bloqueo.
- expo-doctor marca duplicación react web/mobile (intencional) — ignorar.
- EAS remote build requiere login del usuario (interactivo) → dejar config + docs;
  el build real lo dispara el usuario.

## Esfuerzo
Medio (config + E2E + gates ≈ 30-45 min).
