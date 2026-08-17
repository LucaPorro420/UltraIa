# Plan loop-28 — ScreenFlow: allowlist real de `exec`

## Contexto
- Pendiente documentado en AGENTS.md (capability screenflow): "allowlist real de `exec`
  (hoy fail-soft con warning)". La iteración 24 dejó `exec` con `cmd: z.string()` libre —
  el runner (`scripts/screenflow/actions.py`) hace fail-soft con warning en runtime.
- La validación en el dominio (`validateActionScript`) es el lugar correcto para la
  política: el modelo genera el ActionScript → la validación lo rechaza antes de grabar.
- `screenflow.ts`/`screenflow.test.ts` son territorio de la iteración 24 (míos); ninguna
  sesión concurrente los toca (git status verificado). `llm.ts` está commiteado y limpio.

## Objetivo
Política de seguridad de `exec` en el dominio ScreenFlow, determinista y testeable:
`EXEC_ALLOWLIST` (binarios) + `validateExecCmd(cmd)` (metachars, rutas, binario base)
integrada en `validateActionScript` (error, no warning). El runner conserva su fail-soft.

## Pasos
1. `packages/core/src/tools/screenflow.ts`:
   - `EXEC_ALLOWLIST: readonly string[]` — binarios seguros: python, py, python3, node,
     npm, npx, ffmpeg, ffprobe, yt-dlp, mkdir.
   - `validateExecCmd(cmd: string): { ok: boolean; error?: string }`:
     - trim, no vacío; sin saltos de línea
     - sin metachars shell: `;` `&&` `||` `|` `>` `<` `` ` `` `$(` `$((` `\n` `\r`
     - binario base = primer token; match exacto contra allowlist (tolera `.exe/.cmd/.bat`)
     - sin rutas absolutas como binario (empieza `/`, `\`, `./`, `../`, `C:`, `C:\`)
     - cmd ≤ 500 (ya en schema)
   - Integrar en `validateActionScript`: por cada acción `exec`, si `validateExecCmd`
     falla → error con el mensaje; acumular todos (no parar en el primero).
   - Exportar ambos en el namespace `screenflow`.
2. `packages/core/src/tools/screenflow.test.ts`: ~10 tests nuevos
   (`describe('screenflow · exec allowlist')`):
   - acepta `python scripts/topics.py --dry-run` y `ffmpeg -version`
   - rechaza `rm -rf x`, `powershell -c ...`, `cmd /c ...` (no en allowlist)
   - rechaza metachars: `;`, `&&`, `$(...)`, backticks, `|`
   - rechaza binario con ruta absoluta (`C:\Windows\System32\cmd.exe /c`)
   - validateActionScript: script con exec permitido → ok; con exec denegado → ok:false
     con error que menciona la allowlist; varios exec malos → todos los errores acumulados
   - namespace expone EXEC_ALLOWLIST + validateExecCmd
3. `packages/core/src/ai/llm.ts`: actualizar la descripción del tool `screenflow_plan`
   para mencionar la allowlist de exec (el modelo debe saber qué binarios genera).

## Archivos a tocar
- `packages/core/src/tools/screenflow.ts`
- `packages/core/src/tools/screenflow.test.ts`
- `packages/core/src/ai/llm.ts`
- `.opencode/plans/loop-28-screenflow-exec-allowlist.md` (este plan)
- `loop-run-log.md` + `STATE.md` (registro)

## NO tocar (sesiones concurrentes)
- recorder/automation + tests, web-automation.py, cloud-cli.py, TAREA-WIRING-CLOUD.md,
  AUTOMATION-WEB.md, RAZONAMIENTO-MEDIA-AUTOMATION.md, RAZONAMIENTO-GAME-DEV.md,
  media-automation.md, game-dev-ai.md, blueprint/reach/domain + tests, DOCS_TODO.md, enlaces.txt

## Criterios de verificación
- Scoped: `npx vitest run packages/core/src/tools/screenflow.test.ts` → 22 + ~10 = ~32 PASS
- FULL (orden CI): typecheck → lint → test → build
  (aislar archivos concurrentes a %TEMP%\opencode\loop28-bak como en iteración 26;
  restaurar byte-idénticos con hash verify)
- Commit: staging explícito, NUNCA `git add .`

## Riesgos
- Sesión concurrente activa: puede crear/borrar archivos durante los gates (patrón de la
  iteración 25: watcher de restauración + gates en cadena + commit apenas verdes).
- Cambio de comportamiento: scripts con exec previamente "válidos" ahora fallan la
  validación — es el objetivo (seguridad); los binarios legítimos del proyecto (python,
  ffmpeg, node) están en la allowlist.

## Esfuerzo
Bajo (~80 líneas en screenflow.ts + ~120 en test + 1 línea descripción en llm.ts).