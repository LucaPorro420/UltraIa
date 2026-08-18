# UltraIa Desktop — Launcher MVP (Fase D, paso 2+3 completados)

MVP de la Shell Desktop en **Node, cero dependencias nuevas**. Es el paso 2+3 del plan de
`SHELL_DECISION.md` (decisión: WebView2 puro en Windows, Local API como único contrato IPC).

## Qué hace

1. **Compila** `packages/runtime` + `packages/core` a CJS en `dist/` con el tsc ya hoisted del
   repo (no añade toolchain; `tsconfig.build.json` mapea `@ultraia/core` a la fuente).
2. **Arranca** `UltraRuntime` (Fases A+B+C) con la factory `corePorts` keyless
   (`createCorePorts({ tools: createToolsAdapter(), omag: createOmagAdapter() })`) — sin DB ni LLM.
3. **Proxy HTTP**: sirve un dashboard Dark Obsidian embebido en `/` y reenvía `/api/*` a la
   Local API inyectando `Authorization: Bearer <token>` server-side. El token NUNCA llega al
   renderer (si un script en la página lo pidiera, el proxy no lo expone).
4. **Ventana WebView2 nativa** (paso 3 validado 18/08/2026): compila host C# WinForms
   (`webview2-host.cs` con `csc.exe` .NET Framework 4.8) + vendor binarios NuGet
   (`Microsoft.Web.WebView2 1.0.2903.40`: WebView2Loader.dll + ensamblados .NET).
   Abre `webview2-host.exe --url=<proxyUrl>` (ventana sin chrome, Dark Obsidian canvas).
   Fallback: `msedge.exe --app` si vendor/csc fallan.

## Uso

```
node desktopFase/launcher/launcher.mjs                 # compila + arranca UI + ventana WebView2
node desktopFase/launcher/launcher.mjs --no-window     # sin ventana (solo UI en el navegador)
node desktopFase/launcher/launcher.mjs --check         # auto-check: imprime JSON resumen y sale 0/1
node desktopFase/launcher/launcher.mjs --host-check    # test end-to-end WebView2 (headless, --check)
node desktopFase/launcher/launcher.mjs --no-build      # no recompila (usa dist existente)
node desktopFase/launcher/launcher.mjs --port=8765     # puerto fijo del proxy UI
```

### Modo prototipo (app real Next.js)

```
node desktopFase/launcher/launcher.mjs --web-dir apps/web [--web-port=3000]
```
Arranca `apps/web` standalone (`server.js`) como child process y la ventana navega a la app REAL
en `http://127.0.0.1:3000` (requiere `npm run build` previo en `apps/web`).

## `--check` salida esperada (validado 18/08/2026):

```json
{"ok":true,"state":"running","healthStatus":"healthy","core":{"configured":true,"healthy":true,"adapters":["tools","omag"],"tools":10},"apiUrl":"http://127.0.0.1:<p>","publicUrl":"http://127.0.0.1:<p>"}
```

## `--host-check` salida esperada (validado 18/08/2026):

```json
{"ok":true,"webview2":"151.0.4129.86","exit":0,"built":true,"error":null}
```

## Medidas reales MVP WebView2 (18/08/2026)

| Métrica | Valor |
|---|---|
| Bundle total | ~13.7 MB (dist 12.2 MB + vendor 1.5 MB + host.exe 7.5 KB) |
| RAM host WebView2 | 33 MB |
| RAM proxy Node (runtime + Local API) | 78 MB |
| **Total** | **~111 MB** |
| WebView2 Runtime | Evergreen 151.0.4129.86 (Windows 10/11 preinstalado) |

Muy por debajo de Electron (~300-600 MB) / Tauri (~60-150 MB).

## Cómo resuelve las deps (lecciones del spike)

El dist vive en `desktopFase/launcher/dist/`, fuera del árbol de `packages/`. Tres cosas
necesitan solución explícita (idempotente, en `build()`/`ensureJunction()`/`ensureCoreAlias()`):

| Problema | Solución |
|---|---|
| `@ai-sdk/google` aislado por npm en `packages/core/node_modules` (conflicto con apps/web) | Junction `dist/node_modules/@ai-sdk` → `packages/core/node_modules/@ai-sdk` |
| El emit de tsc mantiene `require("@ultraia/core")` (no reescribe specifiers) | Junction `dist/node_modules/@ultraia/core` → `dist/packages/core` + `package.json` propio (`type: commonjs`, `main: src/index.js`) |
| Salir con sockets de undici (`fetch`) abiertos → assert de libuv en Windows (`src\win\async.c`) | El auto-check usa `node:http` puro con `agent: false`; cierre ordenado (`closeAllConnections` → `runtime.stop()` → `exitCode` + timer) |

Fail-soft: si core no carga (p.ej. junctions fallidas), el runtime sigue sano y los comandos
`core.*` responden `{ configured: false }` — el launcher no crashea.

## Test de regresión

`packages/runtime/src/launcher.test.ts` spawns el launcher real con `--check --no-window` y
asserta: exit 0, `ok:true`, `state:running`, `healthStatus:healthy`, core configurado con
`tools`+`omag` y ≥1 capability. La primera corrida compila (20-40s); el test tiene timeout de
240s.

## Estado: COMPLETADO

- ✅ Paso 1: decision tomada (WebView2 puro, SHELL_DECISION.md)
- ✅ Paso 2: launcher Node (compila + runtime + Local API + proxy + msedge --app fallback)
- ✅ **Paso 3: ventana WebView2 nativa** (C# WinForms + vendor NuGet, compilado con csc.exe)
  - `--host-check` → exit 0, WebView2 151.0.4129.86 OK
  - Launcher normal → ventana visible, dashboard carga, health checks OK
- Upgrade path documentado: Tauri 2 si Fase E lo exige (sin tocar runtime ni contrato IPC)