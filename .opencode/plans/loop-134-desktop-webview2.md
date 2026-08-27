# Plan — loop-134: Shell desktop WebView2 (Fase D, paso 3)

## Contexto
El usuario quiere el ítem #4 de "Todos": un shell desktop nativo para UltraIa, eligiendo la
opción **más duradera a largo plazo para un proyecto sin final**. Se descartan Electron (arrastra
Chromium propio, pesado, más frágil a largo plazo) y diferir. Se implementa un **launcher C# + WebView2**
porque WebView2 es evergreen (se actualiza solo con Edge) y .NET es estable y nativo en Windows.

## Objetivo
Ventana nativa Windows que hospeda la app web de UltraIa en WebView2, arrancando el servidor local
si hace falta, y abriendo enlaces externos en el navegador del sistema.

## Archivos a tocar
- `desktop/UltraIa.Desktop.csproj` (nuevo) — proyecto net8.0-windows + WinForms + WebView2 SDK.
- `desktop/Program.cs` (nuevo) — ShellForm: boot, espera servidor, navigate, NewWindowRequested.
- `desktop/README.md` (nuevo) — prerrequisitos, build/publish, comportamiento.
- `.gitignore` (edit) — ignorar `desktop/bin/`, `desktop/obj/`, `desktop/dist/`.
- `.opencode/plans/loop-134-desktop-webview2.md` (este plan).

## NO-hacer
- No tocar el monorepo web/core/runtime (no afecta gates npm).
- No añadir dependencias npm ni cambiar el workspace.
- No sobrescribir el backend existente de `/api/connections` (conexiones reales ya implementadas).

## Criterios de verificación (scoped)
- typecheck/lint/test/build del workspace quedan IGUAL que en c2f74fc (no se tocan archivos TS).
- El fuente C# es idiomático y compila con `dotnet build` (verificable por el usuario con .NET SDK;
  `dotnet` no está instalado en este entorno, por lo que no se compila aquí).

## Predicción
- Gates npm: GREEN (sin cambios en TS).
- Artefacto desktop: fuente válido + README; el usuario puede `dotnet run`/`dotnet publish`.
- Commit explícito + push (autorizado).
