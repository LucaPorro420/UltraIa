# PLAN: Prototipo empaquetado descargable Web + Desktop (tarea #21 de STATE.md)

Fecha: 2026-08-15 · Modo: build (aprobado por el usuario)

## Contexto
- Petición del usuario: "Inicia a construir todo lo que necesitas para realizar el prototipo"
  + alcance elegido: **Web + Desktop** (zip con app web de producción + launcher con ventana
  WebView2 nativa abriendo la app real).
- Hoy el prototipo solo corre en dev (`start.py`/`next dev`); no hay artefacto descargable.
  `next.config.ts` NO tiene `output: 'standalone'`. El proxy del launcher sirve un dashboard
  mínimo (dashboardHtml), no la app real. Fase E (empaquetado) pendiente en DESKTOP_ARCHITECTURE.md.
- `dev.db` con seed admin existe localmente (gitignored) → embebible en el artefacto.

## Objetivo
- `UltraIa-Prototipo.zip` (raíz): web standalone Next.js + DB SQLite embebida (seed admin) +
  launcher desktop (launcher.mjs + dist + vendor + webview2-host.exe) + `UltraIa.bat` (1 clic)
  + INSTRUCCIONES.txt + .env generado. Enlace en README y PrototypeREADME (Descargables).

## Pasos
1. `apps/web/next.config.ts`: `output: 'standalone'` (único cambio de paquete).
2. `desktopFase/launcher/launcher.mjs`: flag `--web-dir <ruta>` — arranca la web standalone
   (child process `node server.js`) y la ventana WebView2 navega a `http://127.0.0.1:3000`
   (app real). Sin flag → comportamiento actual intacto (spike + tests sin cambios).
   Shutdown: matar el child del server.js (árbol completo).
3. `scripts/build-prototipo.py` (NUEVO, stdlib puro):
   - build web → copia `.next/standalone/*` → `web/` + `.next/static` → `web/.next/static` +
     `apps/web/public/*` → `web/public/`
   - `packages/core/prisma/dev.db` → `web/prisma/dev.db`; escribe `web/.env`
     (PORT=3000, DATABASE_URL=file:./prisma/dev.db; HOSTNAME=127.0.0.1)
   - copia `desktopFase/launcher/*` (launcher.mjs, dist/, vendor/, webview2-host.cs) → `desktop/`
   - `UltraIa.bat` + `INSTRUCCIONES.txt` (español: login admin/admin, API keys opcionales,
     Windows-only, solución de problemas)
   - zip → `UltraIa-Prototipo.zip`; flags `--skip-build`, `--out`, `--check-zip`
4. Smoke scoped del artefacto: descomprimir en temp → `node server.js` → GET / 200,
   GET /login 200, login admin/admin (patchright), apagado limpio.
5. Docs: README.md + PrototypeREADME.md sección Descargables → enlace del zip.
6. STATE.md fila #21 (DONE tras commit) + loop-run-log Iteración 21 ([P]/[I]/[V]/[R]).

## Archivos a tocar (staging explícito)
- `apps/web/next.config.ts` — + output standalone
- `desktopFase/launcher/launcher.mjs` — + flag --web-dir (default intacto)
- `scripts/build-prototipo.py` — NUEVO empaquetador
- `UltraIa-Prototipo.zip` — NUEVO artefacto (precedente: PDF en git)
- `README.md`, `PrototypeREADME.md` — enlace descargable
- `STATE.md`, `loop-run-log.md`, `.opencode/plans/loop-21-prototipo-empaquetado.md`

NO se tocan: paquetes de dominio (packages/core, packages/runtime), ruido working tree
(.gitignore, DOCS_TODO.md), ni `git add .`/`-A`.

## Criterios de verificación
- Scoped: `python scripts/build-prototipo.py` sin error + `--check-zip` OK (server.js, dev.db,
  webview2-host.exe presentes) + smoke del zip (login admin/admin real).
- FULL antes de commit: `npm run typecheck` → `npm run lint` → `npm run test` (555/555) →
  `npm run build` (pre-build: taskkill dev servers).
- Tests vitest: 0 nuevos esperados (launcher default intacto; el flag nuevo se valida en el smoke).

## Riesgos / guardas
- `standalone` cambia el build → gates FULL + smoke lo validan (imágenes remotas, CSP,
  instrumentation ya configurados).
- Prisma en standalone: query engine vía serverExternalPackages; el smoke del login lo confirma.
- Zip Windows-only (webview2-host.exe win-x64) → documentado (Linux/macOS: node server.js +
  navegador).
- Launcher: child server.js debe morir con el árbol (taskkill /T /F en terminate).
- Secretos: NO se copian .env con claves reales; solo el .env generado (PORT/DATABASE_URL/HOSTNAME).
- Sin push ni merge (aprobación humana).

## Esfuerzo
Medio — 1 flag config + 1 flag launcher + 1 empaquetador ~200 líneas + smoke + docs.