# PLAN: Fase D WebView2 real window validation (tarea #181, prioridad P0)

Fecha: 2026-09-06 · Modo: P-B · Patrón: Sensado→Razonamiento→Acción→Ajuste · Presupuesto: ~1h / 1 ciclo

## Contexto
- Código Fase D paso 3 YA implementado: `webview2-host.cs` (WinForms + WebView2 control), `launcher.mjs` ya lo usa como primera opción en `openWindow()`, `--host-check` flag para test end-to-end.
- DESKTOP_ARCHITECTURE.md dice "Falta: ventana real (paso 3)" pero el código está completo.
- Spike del launcher validado (commit 3196ce4: `--check` exit 0, core configured true).
- Objetivo: validar end-to-end la ventana WebView2 real, documentar resultado, cerrar Fase D paso 3.

## Objetivo
- Ejecutar `node desktopFase/launcher/launcher.mjs --host-check` (compila + arranca runtime + proxy + lanza WebView2 host con --check) → exit 0 + JSON con `ok:true`.
- Si falla: diagnosticar y fixear (vendor WebView2, csc, DLLs, user-data-dir, navigation timeout).
- Documentar en DESKTOP_ARCHITECTURE.md y STATE.md.

## Pasos
1. `cd desktopFase/launcher && node launcher.mjs --host-check --no-build` (usa dist existente si válido).
2. Si falla vendor WebView2 → descargar/extraer DLLs (tar.exe o PowerShell).
3. Si falla csc.exe → verificar .NET Framework 4.8 / csc.exe path.
4. Si falla navegación → timeout 35s, user-data-dir, WebView2Loader.dll version.
5. Verificar JSON salida: `{"ok":true,"version":"...","status":0}`.
6. Documentar en DESKTOP_ARCHITECTURE.md (cambiar "Falta" a "✅ Implementada") + STATE.md fila 181.

## Archivos a tocar
- `desktopFase/launcher/webview2-host.cs` — fix si hay bug navegación/timeout
- `desktopFase/launcher/launcher.mjs` — fix si hay bug vendor/csc/build
- `desktopFase/DESKTOP_ARCHITECTURE.md` — actualizar estado Fase D
- `STATE.md` — fila 181
- `loop-run-log.md` — entrada iter-181

## Criterios de verificación
- Scoped: `node launcher.mjs --host-check` exit 0 + `ok:true`
- FULL: typecheck/lint/test/build repo completo (con stash WIP ajeno)
- Ventana WebView2 real abre, navega al dashboard, cierra tras NavigationCompleted

## Riesgos
- Windows sin WebView2 Runtime Evergreen → vendor fallback a msedge --app (ya implementado)
- csc.exe no en .NET Framework 4.8 path → log warning + fallback msedge
- NavigationCompleted timeout 35s → ajustar si red lenta / cold start

## Esfuerzo estimado
- medio — validación + fix potencial + docs