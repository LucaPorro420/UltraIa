# Loop 50 — Desktop WebView2 (Fase D paso 3: ventana real)

## Contexto
- Fase D decisión tomada (SHELL_DECISION.md): **MVP WebView2 puro en Windows**.
- Spike completado 15/08/2026 (iteración 6): `desktopFase/launcher/launcher.mjs` (Node, cero deps):
  - Compila runtime+core a CJS (`dist/`) con junctions `@ai-sdk` y `@ultraia/core`.
  - Arranca `UltraRuntime` + Local API HTTP/WS en `127.0.0.1` + token.
  - Proxy UI en mismo puerto (inyecta token en `/api/*` → Local API; token NUNCA al renderer).
  - `--check`: health-checks system/core via Local API → JSON + exit 0/1 (verificado).
  - `--host-check`: intenta compilar y probar `webview2-host.exe` (C# WinForms + WebView2).
- WebView2 host (`webview2-host.cs`): WinForms + `Microsoft.Web.WebView2.Core/WinForms`, compila con `csc.exe` (System .NET Framework 4.8, presente en todo Windows), vendor binaries desde NuGet `Microsoft.Web.WebView2 1.0.2903.40` (WebView2Loader.dll + ensamblados .NET).
- **Falta real del MVP**: probar la **ventana WebView2 nativa** (no el fallback `msedge --app`). El `--host-check` existe pero no se ha validado en entorno real (necesita WebView2 Runtime Evergreen instalado, que ya viene en Windows 10/11).

## Objetivo
1. Validar end-to-end: launcher → runtime → Local API → proxy UI → **webview2-host.exe --check** (exit 0, navegación OK) → **webview2-host.exe normal** (ventana visible, UI carga).
2. Medir RAM/bundle reales del MVP WebView2 (comprometer cifras en docs).
3. Documentar pasos y flags del launcher (`desktopFase/launcher/README.md` actualizado).
4. Gates FULL intactos (typecheck → lint → test → build).

## Pasos
1. Ejecutar `node desktopFase/launcher/launcher.mjs --host-check` (compila vendor + host, prueba navegación headless con --check).
   - Si falla vendor/extracción: arreglar descarga/descompresión nupkg (tar.exe o Expand-Archive).
   - Si falla csc: verificar .NET Framework 4.8 (o usar `dotnet build` si preferible, pero csc es zero-toolchain).
   - Si WebView2 Runtime no está: documentar que requiere Windows 10/11 con Evergreen.
2. Ejecutar launcher normal (`node desktopFase/launcher/launcher.mjs`) → abre ventana WebView2 real.
   - Verificar que la UI carga (dashboard HTML del proxy → health checks verdes).
3. (Opcional) Modo prototipo `--web-dir apps/web` → arranca `apps/web` standalone (`server.js`) y ventana abre la app REAL (Next.js build estático) en `http://127.0.0.1:3000`.
4. Medir RAM (Task Manager / `Process.GetCurrentProcess().WorkingSet64`) y tamaño del bundle (`dist/` + vendor + exe).
5. Actualizar `desktopFase/launcher/README.md` + `SHELL_DECISION.md` con cifras reales.
5. Gates FULL (typecheck/lint/test/build) con cuarentena tests #25 si aplica.

## ARCHIVOS A TOCAR
- `desktopFase/launcher/launcher.mjs` (fixes si hay en vendor/download/compile/host)
- `desktopFase/launcher/webview2-host.cs` (fixes si hay en navegación/check)
- `desktopFase/launcher/README.md` (documentación final)
- `desktopFase/SHELL_DECISION.md` (cifras RAM/bundle reales)
- `docs/DESKTOP.md` (guía de uso para el usuario final)

## Criterios
- `--host-check` → exit 0, imprime `{"ok":true,"version":"..."}`.
- Launcher normal → ventana WebView2 visible, dashboard carga, health checks OK.
- Gates FULL: typecheck 0, lint 0, test 193/193 runtime, build 43 páginas.
- Cifras RAM/bundle documentadas en `SHELL_DECISION.md` y `README.md`.

## Riesgos
- Vendor download: NuGet URL puede cambiar / tar.exe o Expand-Archive fallan en Windows sin admin.
- csc.exe: .NET Framework 4.8 no presente (raro en Windows 10/11) → fallback a `dotnet build` con proyecto SDK style (añade toolchain).
- WebView2 Runtime Evergreen: no instalado en Windows 7/8 (no soportado); Windows 10/11 sí.
- Memoria: medir con `WorkingSet64` del proceso host + proxy + runtime (no solo Edge).

## Esfuerzo
Medio (validación real + fixes de entorno + docs ≈ 30-45 min).