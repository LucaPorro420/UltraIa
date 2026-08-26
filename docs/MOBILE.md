# MOBILE.md — App móvil UltraIa (Android + iOS)

App nativa Android/iOS en el mismo lenguaje del monorepo (TypeScript), construida con
**Expo SDK 57** (React Native 0.86, expo-router). Es un **cliente de la API HTTP de
`apps/web`** (auth, publicaciones, cloud, métricas, blog) — NO importa `@ultraia/core`
(Metro no resuelve `node:*` con webpackIgnore).

## Stack

| Pieza | Detalle |
|---|---|
| Framework | Expo SDK 57 (`~57.x`, versión de agosto 2026 — reversionó todos los paquetes a `~57.*`) |
| UI | expo-router (tabs), RN core, `@expo/vector-icons`, SecureStore |
| Tema | Dark Obsidian (canvas `#08080a`, primary `#8b5cf6`) — port de globals.css del web |
| Backend | API REST de apps/web en `:3000` (header `x-ultraia-session` con el token de sesión) |

## Correr en desarrollo

```bash
# 1. Backend web (terminal 1)
npm run dev            # web en :3000

# 2. App (terminal 2)
npm run mobile         # = expo start en apps/mobile  (o: cd apps/mobile && npx expo start)
```

- Escanea el QR con **Expo Go** (Android/iOS) en el mismo wifi que la máquina.
- La **base URL se resuelve sola**: si no hay `EXPO_PUBLIC_API_URL`, toma el host del dev
  server de Expo Go (hostUri) y usa el puerto 3000. En emulador Android, hostUri ya es la
  IP LAN de la máquina → funciona directo.
- Alternativa explícita: `EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 npm run mobile`
  (crea `apps/mobile/.env` con `EXPO_PUBLIC_API_URL=...`).

## Pantallas (gestión completa)

1. **Login / Registro** — `POST /api/auth/login|register` (REST; email o username en login).
   Token guardado en SecureStore.
2. **Dashboard** — KPIs de la cola (`GET /api/publications/metrics`): stat-cards totales +
   tabla por canal con tasa de éxito; logout.
3. **Publicaciones** — cola con filtros por estado (`GET /api/publications?estado=`) +
   **aprobar/rechazar** (`POST /api/publications/[id]/approve|reject`) para paquetes DRAFT.
4. **Cloud** — archivos personales (`GET /api/cloud/files`, `DELETE /api/cloud/files`),
   resumen de tamaño (unidades binarias).
5. **Blog** — posts publicados del blog propio (`GET /api/publications?estado=PUBLISHED&canal=blog`).
6. **Creaciones** (nueva, loop-108) — media hub del Studio en el móvil:
   `GET /api/library/assets` con chips de filtro por tipo (imagen/música/vídeo/diseño/nota),
   miniaturas inline de imágenes, y acciones **Abrir/Reproducir** + **Descargar** +
   **Borrar** (`DELETE /api/assets/[id]`).
   - Los assets durables se sirven desde el cloud local/R2 del web; las URLs
     relativas se absolutizan contra `EXPO_PUBLIC_API_URL` (o host dev).
   - **Auth por query**: abrir/descargar usa `?session=<token>` porque el
     navegador del sistema no puede mandar headers — soportado en
     `GET /api/assets/[id]` y `/download` (loop-108).

## API REST de auth (nueva en el web)

El web autentica con server actions + cookies httpOnly (no usables en RN). Añadido:

- `POST /api/auth/login` — `{ email, password }` → `{ token, expiresAt, user }`
- `POST /api/auth/register` — `{ name?, email, password }` → `{ token, expiresAt, user }`
- `GET /api/auth/me` — header `x-ultraia-session` (o cookie) → `{ user }`

`getCurrentUser(req?)` en `apps/web/src/lib/server/context.ts` acepta el header
`x-ultraia-session` (o `Authorization: Bearer`) con el MISMO token de sesión del web —
todas las APIs existentes (publications, metrics, cloud, approve/reject) sirven al móvil
sin cambios de lógica.

## Builds (instalables)

- **Android APK**: EAS Build free tier → `npx eas-cli build -p android --profile preview`
  (requiere cuenta Expo gratuita + `eas login`; build en la nube, sin Android Studio).
- **iOS IPA**: requiere cuenta Apple Developer ($99/año) — **diferido** por decisión del
  usuario (17/08/2026). Validación iOS actual: Expo Go (gratis, sin build nativo).
- **Chequeo previo**: `npx expo-doctor` (20/21 en monorepo; el aviso de duplicación de
  react 19.1.0 web vs 19.2.3 mobile es intencional — Metro resuelve el de mobile en el
  build nativo), `npx tsc --noEmit`, `npx expo export --platform web`.

## EAS build (configurado 18/08/2026, iteración 47)

`apps/mobile/eas.json` (ya commiteado) define 3 perfiles:

| Perfil | Uso | Android |
|---|---|---|
| `development` | development client (Debug) | APK (buildType apk) |
| `preview` | distribución interna / testers | APK (buildType apk) |
| `production` | store (Play) | AAB (app-bundle, autoIncrement) |

`cli.appVersionSource: "local"` → la versión viene de `app.json` (`version: 1.0.0`), sin
necesitar el servicio de versionado remoto de EAS. `autoIncrement: true` solo en
production (sube versionCode/versionName automáticamente por build en la nube).

Comandos (requieren `eas login` con la cuenta Expo del usuario — no es automatizable):

```bash
cd apps/mobile
npx eas login                                # una vez (cuenta Expo gratuita)
npx eas build -p android --profile preview   # APK instalable (testers/uso directo)
npx eas build -p android --profile production # AAB para Play Console
npx eas submit -p android --profile production # sube a Play (requiere cuenta Google Play)
```

E2E verificado (18/08/2026, iteración 47): register 201 / login token / me 200 /
publications 200 / blog 200 contra el dev server real; `cloud/status` y `cloud/upload`
arreglados para aceptar el header `x-ultraia-session` (bug: solo leían la cookie →
401 en la app móvil).

## Estructura

```
apps/mobile/
├── app.json                 # name/slug UltraIa, dark, scheme ultraia
├── src/
│   ├── app/
│   │   ├── _layout.tsx      # AuthProvider + Stack
│   │   ├── (auth)/login.tsx, register.tsx
│   │   └── (tabs)/_layout.tsx + index (dashboard), publicaciones, cloud, blog
│   ├── api/client.ts        # fetch + SecureStore + base URL (EXPO_PUBLIC_API_URL/hostUri)
│   ├── api/types.ts         # tipos de la API (sin importar core)
│   ├── auth/auth-context.tsx# login/register/logout/me
│   ├── components/ui.tsx    # Card, Badge, StatCard, Loading, EmptyState, ErrorBanner, Screen
│   └── constants/theme.ts   # Dark Obsidian tokens
```

## Notas monorepo

- `package.json` raíz: sin `overrides` de react — apps/web declara `react@19.1.0` exacto y
  mobile `19.2.3`; npm workspaces instala ambas (react duplicado es esperado).
- Workspace: `@ultraia/mobile` (`apps/*` en workspaces raíz).
- La sesión concurrente del repo puede tocar `package-lock.json` — verificar
  `git status` antes de commits.
