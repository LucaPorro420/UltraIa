# Plan MAESTRO: Video Automation (video-use + Media Engine) + Análisis completo del repo

## Contexto
Petición del usuario (17/08/2026): "Verifica los archivos (sobre todo enlaces.txt)... Crea un
plan y build mode para lo que obtengas... análisis completo y guardar la información... dame
el archivo para leerlo yo también y tenerlo salvado en el proyecto". Aprobado en plan mode con
decisiones: video_edit núcleo completo keyless; recorder OBS sí con mocks; automatización web
= 3 vías (script Python + doc Playwright + tool TS con fetch inyectable); archivo maestro =
PLAN-COMPLETO.md + PDF (verificado: md2pdf SÍ genera contenido real, 117 Tj ops).

enlaces.txt pendientes (los otros 2 ya procesados: fable-5→memory, diagram-design→diagram):
1. https://github.com/browser-use/video-use (20.8k⭐, MIT) — edición de video con agentes:
   Transcribir → Pack → LLM razona → EDL → Render → Self-Eval (max 3). Transcript-first
   (12KB texto vs 45M tokens de frames), timeline_view on-demand, project.md de sesión,
   12 reglas duras de producción.
2. Bloque Media Automation (líneas 7-665): OBS WebSocket, video-editor, loop, Argo,
   Playwright Recast, Pagecast, OBS Agent, Pulsar + arquitectura Media Automation Engine
   (PLAN→VALIDATE→AUTOMATE→RECORD→ANALYZE→EDIT→AUDIO→RENDER→VERIFY→ARCHIVE +
   RECOVER/RETRY/RESUME).

## Objetivo
Procesar el 100% de enlaces.txt, auditar TODOS los archivos del repo, implementar las
capabilities `video_edit` / `recording` / `automation` en core (keyless-first, sin deps npm
nuevas), y consolidar todo en PLAN-COMPLETO.md (+ PDF) + memoria learning. Limpiar antes el
working tree pendiente (iteraciones 19-22).

## Pasos
### F0 — Limpieza working tree (High Priority de STATE.md)
1. Commit explícito (staging por archivo, NUNCA git add .):
   - Iteración 21: next.config.ts (standalone), launcher.mjs (--web-dir), build-prototipo.py,
     UltraIa-Prototipo.zip, .gitignore, PrototypeREADME.md, README.md
   - Iteración 22: packages/core/src/tools/diagram.ts + diagram.test.ts, Task/ (generate-diagrams.ts,
     Content/, Task1.md, _apps.json), resultTask/diagrams/, resultTask/README.md,
     docs/diagrams/, docs/RAZONAMIENTO-DIAGRAM-DESIGN.md, learning/sources/diagram-design.md
   - Registro: llm.ts, tools/index.ts, AGENTS.md, enlaces.txt, LEARNINGS.md, loop-run-log.md
2. Gates FULL → commits `feat(docs)` + `feat(core)`.

### F1 — video-use → capability `video_edit`
1. learning/sources/video-use.md (curl README+SKILL.md+install.md crudo).
2. docs/RAZONAMIENTO-VIDEO-USE.md (patrones + mapeo implementado/pendiente).
3. packages/core/src/tools/video-edit.ts:
   - buildEDL(transcript, opts): EDL determinista desde segmentos word-level inyectables;
     corta fillers (umm/uh/this is/you know), silencios > gapThresholdMs, false starts;
     reglas: no cortar dentro de palabra, duración mínima de clip, fades 30ms en cortes.
   - timelineView(src, t0, t1, out): comando ffmpeg filmstrip+waveform PNG (degradación:
     sin ffmpeg → devuelve {command} sin ejecutar).
   - renderEdl(edl, src, out, opts): comandos ffmpeg concat con fades audio 30ms por corte,
     color grade (warm/neutral/custom chain), subtítulos quemados (SRT patrón RF-11),
     loudnorm -16 LUFS (patrón omag/tts.ts).
   - selfEval(edl, rendered, opts): checks deterministas (duración, gap bounds, offset
     audio-video con umbral 0.1s patrón checkTimelineSync, pops) → {pass, issues[]};
     orquesta loop máx 3 intentos (patrón correction loop de OMAG).
   - projectMemo(projectPath): persistencia project.md de sesión (patrón memory-fs, atómico).
4. Tool `video_edit_pipeline` (capability video_edit) en llm.ts + export index.ts.
5. Tests video-edit.test.ts (~15, mocks, sin ffmpeg: buildEDL, reglas, render cmds,
   selfEval, loop máx 3, projectMemo).

### F2 — Media Automation → `recorder` + `automation` + web 3 vías
1. learning/sources/media-automation.md (bloque 7-665 de enlaces.txt).
2. docs/RAZONAMIENTO-MEDIA-AUTOMATION.md (9 repos + arquitectura + mapeo OMAG/Gen-Engine/
   AutoPub/Desktop).
3. packages/core/src/tools/recorder.ts — obs-websocket v5 JSON-RPC sobre WebSocket propio
   (patrón runtime/src/api/ws.ts, sin deps): connect(host, port, password), startRecord/
   stopRecord/listScenes/switchScene/getStreamStatus, autenticación, version guard
   (protocolo 1.6+, obs-websocket 5.x), fail-soft con guía de instalación si no responde.
   Tool `recorder_control` (capability recording). Tests con socket mock (~12).
4. packages/core/src/tools/automation.ts — orquestador del ciclo Media Engine como tool de
   agente: PLAN (brief topics) → VALIDATE (media-score) → AUTOMATE (enrutador contenido) →
   RECORD (recorder o storyboard) → ANALYZE (EDL video_edit) → EDIT → AUDIO (tts) → RENDER
   (ffmpeg cmd) → VERIFY (selfEval) → ARCHIVE (manifest .ultraia/). Reusa módulos existentes;
   fail-soft por etapa con RECOVER/RETRY (máx 3). Tests (~8).
5. scripts/web-automation.py — CLI Python keyless: --dry-run imprime plan de pasos web
   (Playwright opcional si está instalado; sin él, registro determinista de sesión) →
   EDL → video. Mismo esquema TS (fuente de verdad: TS).
6. docs/AUTOMATION-WEB.md — vía Playwright npm documentada (sin dep en repo; guía opcional).

### F3 — Análisis completo + PLAN-COMPLETO.md + PDF + memoria
1. Auditoría de TODOS los archivos raíz (masinfo.txt, proyectoNuevo.*, LOOPENGINEER.TXT,
   session-ses_009b.md, PLAN-ULTRAIA.md, AplicacionIaMatEtc.md, integracionModeloLocal.txt,
   integracionWebBrowse.txt, AUDIO/, STUDIES/, headroom/, automate/, BussinesModel/,
   IMAGE-INTEGRATIONS/, designs-ui-ux/, Task/, ULTRAIA/) → inventario {estado, pendientes}.
2. PLAN-COMPLETO.md (raíz): estado real, análisis enlaces.txt, plan F1-F2, backlog, decisiones,
   conexiones, comandos. Enlazado en README + AGENTS.md.
3. PLAN-COMPLETO.pdf con md2pdf.py + verificación binaria de contenido.
4. Memoria: LEARNINGS.md + regenerar learning/memory/ultraia_memory.zip.
5. STATE.md (backlog nuevos), loop-run-log.md (iteración 23), AGENTS.md.

### F4 — Verificación final
- Gates FULL orden CI (typecheck → lint → test → build; matar dev servers antes del build).
- Commit por fase; evidencia en STATE.md + run-log.

## Archivos a tocar
NUEVOS: .opencode/plans/loop-23-video-use.md (este), learning/sources/video-use.md,
learning/sources/media-automation.md, docs/RAZONAMIENTO-VIDEO-USE.md,
docs/RAZONAMIENTO-MEDIA-AUTOMATION.md, docs/AUTOMATION-WEB.md,
packages/core/src/tools/video-edit.ts + video-edit.test.ts,
packages/core/src/tools/recorder.ts + recorder.test.ts,
packages/core/src/tools/automation.ts + automation.test.ts,
scripts/web-automation.py, PLAN-COMPLETO.md, PLAN-COMPLETO.pdf
MOD: packages/core/src/tools/index.ts, packages/core/src/ai/llm.ts, README.md, AGENTS.md,
STATE.md, loop-run-log.md, learning/LEARNINGS.md, learning/memory/ultraia_memory.zip,
enlaces.txt (marcar procesado)

## Criterios
- Scoped por fase: video-edit.test.ts / recorder.test.ts / automation.test.ts verdes +
  typecheck core.
- FULL por commit: typecheck → lint → test → build (repo ~570 → ~610 PASS esperado).
- python scripts/web-automation.py --dry-run exit 0; md2pdf PLAN-COMPLETO.pdf con contenido
  binario verificable (Tj ops > 0).
- NUNCA git add .; staging explícito; sin push.

## Riesgos
- OBS no instalado → tests mock 100% + degradación documentada.
- ffmpeg presente en win pero no en CI → mocks, comandos generados no ejecutados.
- PDF blanco en visor del usuario → verificación binaria + ajuste writer si hace falta.
- Port de principios (NO copiar código de video-use; MIT OK con attribution header).
- PS 5.1 encoding → tool Write para archivos; scripts Python con UTF-8 sin BOM.

## Esfuerzo
~4 ciclos PIVR (F0 rápido, F1 medio, F2 medio-alto, F3 medio).
