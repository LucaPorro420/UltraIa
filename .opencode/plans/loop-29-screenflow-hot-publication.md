# Plan loop-29 — ScreenFlow: watch de carpeta `hot/` + puente cola Publication

## Contexto
- Pendientes restantes de AGENTS.md (capability screenflow, iteración 27 DONE): "watch de
  carpeta `hot/` y conexión opcional con la cola `Publication` canal `'local'` para métricas".
- `screenflow.ts`/`screenflow.test.ts` son territorio mío (iteraciones 24/27) — nadie los toca.
- NO tocar `publications.ts`/`present.ts`/`topics.ts`: la sesión concurrente trabaja
  Publications (TAREA-CLOUD-PUBLICATIONS.md) y el canal `'local'` NO existe en `PresentChannel`
  (youtube_shorts/tiktok/instagram/blog). El puente será: screenflow construye un
  `PublicationPackage` válido (canal `blog` — texto, auto-aprobado) vía la tool `present`
  (importada, no modificada) y el runner la enruta a `createPublication` si quiere métricas.

## Objetivo
1. `resolveHotWatch(current, known)` — dominio puro determinista del watch `hot/`:
   lista de scripts JSON nuevos (diferencia ordenada, idempotente, ignora no-.json).
2. `buildPublicationPackage(runId, script, manifest)` — paquete `PublicationPackage` válido
   para la cola: tema = nombre del script, caption = descripción, media = final.mp4 del run,
   canal blog (auto-aprobado). Keyless, determinista.

## Pasos
1. `packages/core/src/tools/screenflow.ts`:
   - `HOT_DIR = '.ultraia/hot'` (constante, patrón RECORDINGS_ROOT)
   - `resolveHotWatch(current: string[], known: string[]): { nuevos: string[]; conocidos: string[] }`
     — filtra `*.json`, ordena, diferencia; `conocidos` = known ∪ nuevos (para persistir estado).
   - `buildPublicationPackage(runId, script, manifest)` — importa `present` de `../tools/present`
     y `buildOutputNaming` para armar: tema `script.name`, contenido `script.description ?? nombre`,
     media `[final.mp4]`, canales `['blog']` → devuelve el paquete.
   - Exportar ambos en namespace `screenflow` + HOT_DIR.
2. `packages/core/src/tools/screenflow.test.ts`: ~8 tests
   (`describe('screenflow · hot watch + publication bridge')`):
   - resolveHotWatch: archivos nuevos detectados; idempotente (2ª llamada con conocidos → 0);
     ignora no-.json; orden estable; vacío → sin nuevos
   - buildPublicationPackage: tema/caption/media correctos; canal blog en canales;
     captionsByChannel.blog existe; horarioSugerido.blog existe; determinista
   - namespace expone HOT_DIR + resolveHotWatch + buildPublicationPackage
3. `ai/llm.ts` (opcional si hay tool nueva — NO: el watch/puente son del runner, no tools del
   modelo; la descripción de screenflow_plan ya cubre la allowlist. NO tocar llm.ts en esta
   iteración salvo que un test lo requiera).

## Archivos a tocar
- `packages/core/src/tools/screenflow.ts`
- `packages/core/src/tools/screenflow.test.ts`
- `.opencode/plans/loop-29-screenflow-hot-publication.md` (este plan)
- `loop-run-log.md` + `STATE.md` (registro)

## NO tocar (sesiones concurrentes)
- recorder/automation + tests, web-automation.py, cloud-cli.py/.test.py,
  TAREA-WIRING-CLOUD.md, TAREA-CLOUD-PUBLICATIONS.md, CLOUD-CLI-GUIDE.md, AUTOMATION-WEB.md,
  RAZONAMIENTO-*.md, learning/sources/*, blueprint/reach/domain + tests, DOCS_TODO.md, enlaces.txt
- publications.ts / present.ts / topics.ts (importar present SOLO como read, nunca editarlos)

## Criterios de verificación
- Scoped: `npx vitest run packages/core/src/tools/screenflow.test.ts` → 31 + 8 = ~39 PASS
- FULL (orden CI): typecheck → lint → test → build
  (aislar 9 archivos concurrentes a %TEMP%\opencode\loop29-bak, restaurar hash-OK)
- Commits: feat + chore(logs); PUSH autorizado por el usuario (17/08/2026) al final
- Staging explícito, NUNCA `git add .`

## Riesgos
- Sesión concurrente activa: watcher de restauración + gates en cadena + commit apenas verdes.
- Importar `present` en screenflow.ts: si la sesión concurrente modifica present.ts a mitad de
  ciclo, el import podría romper typecheck → aislar present.ts también si pasa.

## Esfuerzo
Bajo (~90 líneas + tests ~130).