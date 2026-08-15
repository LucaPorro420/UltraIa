# UltraIa Desktop — Launcher spike (Fase D, paso 2)

MVP de la Shell Desktop en **Node, cero dependencias nuevas**. Es el paso 2 del plan de
`SHELL_DECISION.md` (decisión: WebView2 puro en Windows, Local API como único contrato IPC).

## Qué hace

1. **Compila** `packages/runtime` + `packages/core` a CJS en `dist/` con el tsc ya hoisted del
   repo (no añade toolchain; `tsconfig.build.json` mapea `@ultraia/core` a la fuente).
2. **Arranca** `UltraRuntime` (Fases A+B+C) con la factory `corePorts` keyless
   (`createCorePorts({ tools: createToolsAdapter(), omag: createOmagAdapter() })`) — sin DB ni LLM.
3. **Proxy HTTP**: sirve un dashboard Dark Obsidian embebido en `/` y reenvía `/api/*` a la
   Local API inyectando `Authorization: Bearer <token>` server-side. El token NUNCA llega al
   renderer (si un script en la página lo pidiera, el proxy no lo expone).
4. **Ventana**: abre `msedge.exe --app=<url> --user-data-dir=<tmp>` — Edge ES el WebView2
   Runtime de Windows, preinstalado (x86 en Windows de 64 bits: `Program Files (x86)`).

## Uso

```
node desktopFase/launcher/launcher.mjs                 # compila + arranca UI + ventana
node desktopFase/launcher/launcher.mjs --no-window     # sin ventana (solo UI en el navegador)
node desktopFase/launcher/launcher.mjs --check         # auto-check: imprime JSON resumen y sale 0/1
node desktopFase/launcher/launcher.mjs --no-build      # no recompila (usa dist existente)
node desktopFase/launcher/launcher.mjs --port=8765     # puerto fijo del proxy UI
```

`--check` salida esperada (spike verificado 15/08/2026):

```json
{"ok":true,"state":"running","healthStatus":"healthy","core":{"configured":true,"healthy":true,"adapters":["tools","omag"],"tools":10},"apiUrl":"http://127.0.0.1:<p>","publicUrl":"http://127.0.0.1:<p>"}
```

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

## Pendiente (paso 3 del spike)

La ventana WebView2 "de verdad": hoy se abre `msedge --app` como demostración del runtime
WebView2. El paso 3 reemplaza eso por una ventana nativa mínima (C#/.NET o directo a Tauri 2
si Fase E lo justifica) que apunte a `http://127.0.0.1:<puerto>` — el contrato IPC no cambia.