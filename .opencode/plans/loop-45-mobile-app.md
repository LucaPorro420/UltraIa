# Plan loop-45 — App móvil Android+iOS (Expo) + capability codevfx

## Contexto
- Usuario (17/08/2026): "crear una aplicación móvil para android e ios que sea con el mismo
  lenguaje" (TypeScript). Aprobado: Expo + TS, EAS free tier (sin pagar Apple Developer;
  iOS solo Expo Go + IPA diferido), alcance gestión completa, r.jina.ai para enlaces bloqueados.
- Petición adicional: analizar Instagram DcJDsghiJne (Elemental Sandbox VFX, repo
  achrefelouafi/LinearAbiltyCastingThreeJS MIT) → capability `codevfx` (efectos 100% código
  sin 3D: colorimetría, curvatura, perspectiva).
- Sesión concurrente #25 sigue activa con árbol sucio (discord/slack/telegram/publish/
  present.test/discord.test/slack.test/telegram.test/reach/blueprint/automation/recorder/
  shared/domain + docs). NO TOCAR sus archivos.

## Objetivo Fase 1 (app móvil)
apps/mobile (Expo SDK 57, RN 0.86, expo-router, TS) como cliente de la API HTTP de apps/web:
auth REST, publicaciones (cola + aprobar/rechazar), cloud (listar/subir/borrar), KPIs, blog.

## Pasos Fase 1
1. Backend auth REST (necesario: el web solo tiene server actions con cookies):
   - `apps/web/src/lib/server/context.ts`: `getCurrentUser(req?)` acepta header
     `x-ultraia-session` (y fallback cookie) → TODAS las APIs existentes sirven al móvil.
   - `apps/web/src/app/api/auth/login/route.ts` + `register/route.ts` + `me/route.ts`
     (devuelven {token, expiresAt, user}; register con assertStrongPassword; login por email o username).
2. Mobile scaffold: template default ya creado + expo-secure-store + @expo/vector-icons.
   package.json name → @ultraia/mobile; overrides react movidos del root a apps/web
   (mobile necesita react 19.2.3; web declara 19.1.0 exacto).
3. `src/api/client.ts`: base URL vía EXPO_PUBLIC_API_URL o hostUri de Expo Go (puerto 3000);
   token en SecureStore; helpers get/post/del con 401→logout.
4. `src/api/types.ts`: Publication, Canal, Kpis, CloudFile, BlogPost, AuthUser, MeResponse.
5. `src/theme/`: Dark Obsidian tokens (canvas #08080a, panel #111115, primary #8b5cf6,
   border #1f1f2a, acentos modalidad) + Fonts.
6. Auth: `src/auth/auth-context.tsx` (login/register/logout/me, token persistente,
   redirect según sesión) + `src/app/(auth)/login.tsx` + `register.tsx`.
7. Tabs (expo-router Tabs estable): `(tabs)/_layout.tsx` + index (dashboard KPIs con
   stat-cards), publicaciones (filtros por estado + aprobar/rechazar), cloud (lista +
   borrar + subir vía expo-document-picker), blog (posts PUBLICADOS canal blog).
8. UI kit `src/components/ui.tsx` (Card, Button, Input, Badge, StatCard, EmptyState,
   Loading) + themed text/view con Dark Obsidian.
9. Docs: `docs/MOBILE.md` (run, Expo Go, base URL, EAS build, iOS sin Apple Developer).
10. Limpiar archivos template sobrantes (explore, app-tabs, animated-icon...).

## Criterios Fase 1
- scoped: `npx tsc --noEmit` en apps/mobile (0 errores propios) + `npx expo export
  --platform web` (bundle sano) + typecheck web (auth routes nuevos).
- FULL pendiente árbol limpio (sesión concurrente).
- Commit por hito con staging explícito.

## Fase 2 — capability codevfx (petición Instagram)
- `packages/core/src/tools/codevfx.ts`: dominio puro zod sin deps (port ORIGINAL de
  principios, attribution): `planEffect(kind, opts)` — 6 kinds del sandbox (fire/ice/
  lightning/meteor/beam/ground) + 3 nuevos (void/plasma/frost) → spec 100% código
  (paleta colorimetría, gradiente de luz, partículas, forma SDF, args Canvas 2D — sin
  Three.js); `colorimetryAnalyze(colors)` (temperatura/contraste/canal dominante/curvas);
  `curvatureShade()` (highlight+falloff radial 2D); `perspectivePlan()` (punto de fuga);
  `renderEffectHtml(spec)` → HTML autocontenido canvas+JS inline sin deps.
- Tool `vfx_code` (capability codevfx) en ai/llm.ts + export index.ts.
- Tests deterministas codevfx.test.ts (~24). Demo vite-node → resultTask/codevfx/.
- Docs RAZONAMIENTO + fuente learning/sources/instagram-elemental-sandbox.md (hecho).

## Riesgos
- Metro vs node:* → mobile NO importa @ultraia/core (solo API HTTP + tipos propios).
- React versions: root overrides → local apps/web (npm no permite overrides por ruta;
  web declara 19.1.0 exacto).
- PS 5.1 BOM → usar tool Write siempre (package.json mobile ya corregido con node).
- Sesión concurrente puede tocar package-lock → verificar git status antes de commit.

## Esfuerzo
Fase 1 ~60 min · Fase 2 ~45 min. Un ciclo con 2 commits.
