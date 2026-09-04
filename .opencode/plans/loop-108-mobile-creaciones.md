# Plan loop-108 — Mobile Creaciones (Studio en el bolsillo)

**Sesión**: r108-UTEC-5695-20260825-MOBILE · Base: 63503a5 · Origen: Watchlist "movil tipos assets" (iter-104 §5) tras "Sigue".

## Pasos
1. **web auth por query** (móvil abre medios en navegador sin headers): GET /api/assets/[id] y /download aceptan `?session=<token>` además del header/cookie. PATCH/DELETE siguen con getCurrentUser.
2. **mobile types.ts** += AssetRecord/AssetsResponse + parseMeta (réplica manual, LECCIÓN Metro).
3. **client.ts** += assetOpenUrl/assetDownloadUrl (`?session=` desde SecureStore).
4. **tab creaciones.tsx**: chips filtro por tipo, tarjetas con miniatura (uri c/ token), acciones Abrir·Descargar·Borrar, RefreshControl; registro en _layout (icono 'images').
5. docs/MOBILE.md sección Creaciones.
6. NO tocar WIP ajeno (reporeview.ts, package.json raíz). Sin deps nuevas RN.

## Verificación
tsc mobile --noEmit 0 · repo FULL CI order (typecheck/lint/test/build) con atribución si su WIP interfiere. Commit pathspec temprano (lección 107).
