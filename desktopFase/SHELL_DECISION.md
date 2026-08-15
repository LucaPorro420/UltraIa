# UltraIa Desktop — Shell Decision: MVP WebView2 first

> Fase D, paso 1 (15/08/2026). Decisión de stack para la Shell Desktop, diferida en
> `ARCHITECTURE.md` §8 ("Decisión diferida a la fase Shell"). Este documento cierra esa
> deuda con el contexto REAL del repo hoy: `@ultraia/runtime` (Fases A+B+C completas,
> 186/186) + Local API HTTP/WS en `127.0.0.1` con token (contrato en `docs/IPC.md`) +
> adapters a `@ultraia/core` (Db/AiGateway/tools/omag).

## Contexto que ya existe (no se reescribe)

| Pieza | Estado |
|---|---|
| `packages/runtime` — orquestador, memoria, tasks, módulos, health, installer | ✅ Fase A (132 tests) |
| Local API HTTP/WS `127.0.0.1` + token timing-safe + rate limit + eventos | ✅ Fase B (20 tests) |
| Adapters a core: Db, AiGateway, tools (10 capabilities), OMAG | ✅ Fase C (34 tests) |
| `apps/web` Next.js 15 — UI Dark Obsidian completa | ✅ en repo (build OK) |
| Contrato IPC | `desktopFase/docs/IPC.md` |

Consecuencia directa: **la Shell NO necesita acceso al SO por sí misma**. Todo lo que la
UI del desktop necesita (estado, memoria, tasks, tools, OMAG, health) llega por HTTP+WS a
`127.0.0.1` con token. El trabajo restante de la Fase D es: (1) una ventana que muestre la
UI, (2) un launcher que levante el runtime + la Local API, (3) que el frontend apunte al
puerto local en vez de a Next dev.

## Candidatos evaluados

### A. MVP WebView2 puro (recomendado para el MVP)

- **Qué es**: ventana nativa mínima que embebe el WebView2 Runtime (Evergreen, preinstalado
  en Windows 10/11) apuntando a `http://127.0.0.1:<puerto>` servido por la Local API.
- **Coste**: un launcher pequeño (Node o C#/.NET) + `createWebView2EnvironmentWithOptions` /
  `WebView2` — sin framework de shell.
- **Pros**: cero dependencias nuevas en el repo; cero idioma nuevo; máximo reuso de
  `apps/web` (build estático) y de la Local API; RAM mínima (WebView2 del SO, ~100-200 MB
  compartidos); bundle ~1-2 MB de launcher; seguridad por diseño (solo habla con
  `127.0.0.1` + token, nunca expone el SO al frontend).
- **Contras**: Windows-first (WebView2); para macOS/Linux habría que evaluar WKWebView/WebKitGTK
  (el contrato IPC es idéntico — la Local API no cambia); sin API de fs/OS nativa en la UI
  (el runtime las expone vía Local API con allowlist — de hecho es lo deseado).

### B. Tauri 2

- **Pros**: RAM ~60-150 MB, bundle ~5-15 MB, 3 plataformas, Rust backend con permisos
  granulares (allowlist IPC).
- **Contras**: añade Rust al equipo/CI (curva nueva); el backend Rust duplicaría funciones que
  `@ultraia/runtime` ya cumple (orquestador, memoria, tasks) — riesgo de arquitectura doble;
  build toolchain más pesada.
- **Cuándo elegirlo**: cuando el desktop necesite capacidades OS profundas (tray, protocolos
  de archivo, auto-update con firma) que la Local API no cubra — Fase E puede justificarlo.

### C. Electron

- **Pros**: 3 plataformas, TS/Node nativo (cero idioma nuevo), ecosistema maduro.
- **Contras**: RAM ~300-600 MB, bundle ~100-200 MB; hardening manual obligatorio
  (contextIsolation, sandbox, preload sin nodeIntegration) — y aún así el modelo
  "main process con Node" invita a duplicar el runtime.
- **Cuándo elegirlo**: si el equipo prioriza la curva cero sobre RAM/bundle y descarta WebView2
  por alcance (p.ej. Linux/macOS desde el día 1 sin adaptar la ventana).

## Decisión

**MVP: A (WebView2 puro) en Windows**, con la Local API como único contrato de IPC:

1. Launcher mínimo (Node, sin deps) que: levanta el runtime (`UltraRuntime` + `startLocalApi`),
   abre la ventana WebView2 hacia `http://127.0.0.1:<puerto>`, y cierra la API al cerrar la
   ventana.
2. El frontend = `apps/web` con un modo "desktop" (mismo bundle, base URL a la Local API).
3. Upgrade path documentado: si Fase E (instalador/firma/auto-update) o macOS/Linux exigen
   más, migrar la ventana a **Tauri 2** SIN tocar el runtime ni el contrato IPC (el backend
   Rust solo gestiona la ventana y delega todo al runtime Node).

Esta decisión maximiza el reuso del trabajo ya verificado (Fases A+B+C) y respeta los
principios del repo: LOCAL-FIRST, SECURE (token + loopback), sin deps nuevas en el núcleo.

## Plan de spike (siguiente paso de la Fase D — criterios de aceptación)

- [ ] Launcher Node sin deps que arranca `UltraRuntime` + Local API en un puerto libre.
- [ ] Ventana WebView2 (Windows) apuntando a la URL local; recarga el build estático de web.
- [ ] Health-check: la UI muestra `system.health` y `core.isHealthy()` vía Local API.
- [ ] Comando `system.core` (wiring de los adapters al runtime) expuesto por la API.
- [ ] Gates del repo intactos (typecheck → lint → test → build).

> Nota de rigor: las cifras de RAM/bundle de Tauri/Electron citadas en ARCHITECTURE.md §8 son
> aproximaciones de mercado (2024-2026), no mediciones propias; el spike medirá las reales del
> MVP WebView2 antes de comprometer una cifra en docs.