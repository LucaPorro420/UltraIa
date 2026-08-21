# RAZONAMIENTO — Media Automation (enlaces.txt, bloque 2)

**Fuente**: bloque "Media Automation" de `enlaces.txt` (líneas 7–665, pegado por el usuario; 9 repositorios + arquitectura propuesta).
**Cruda descargada**: `learning/sources/media-automation.md` (659 líneas).
**Aplicado**: 17/08/2026 → capability `recording` (recorder OBS WebSocket v5) + `automation` (ciclo Media Engine) + `scripts/web-automation.py`.

## Qué es

Análisis (generado por el usuario vía chat) de 9 repositorios open source que implementan partes
del ciclo de producción multimedia automatizada: **automatizar acciones → grabar → analizar →
editar → audio → renderizar → guardar localmente**, con arquitectura modular y recuperación
ante fallos. La propuesta central es un **Media Automation Engine** con módulos independientes
(orchestrator / automation / recording / analysis / editing / audio / rendering / storage / logs),
un **manifest JSON por proyecto** (`project.json`) y un **ciclo de 10 fases** con error-recovery.

## Repositorios de referencia (verificados 17/08/2026)

| Proyecto | Repo | Rol |
|---|---|---|
| OBS WebSocket | obsproject/obs-websocket | Control remoto de OBS vía WS (v5, JSON-RPC): grabar, escenas, fuentes, eventos. Base de grabación |
| OBS Auto Recorder | iturdikulov/obs_auto | Script Python: hotkeys globales, iniciar/detener, nombres personalizados, config.ini |
| video-editor | noeltock/video-editor | Pipeline de edición local: denoise → normalize → whisper → cortes → Remotion → ffmpeg |
| loop | tadaspetra/loop | Desktop Electron: grabar → transcribir → editar → renderizar |
| Argo Video | shreyaskarnik/argo | Playwright actions → scenes → TTS → align → ffmpeg → MP4 (demos de producto) |
| Playwright Recast | ThePatriczek/playwright-recast | Trace Playwright → video → edición → subtítulos → TTS → speed → zoom |
| Pagecast | mcpware/pagecast | Grabar páginas web como GIF/video vía MCP + Playwright + ffmpeg |
| OBS Agent | haasonsaas/obs-agent | Multiagente IA (AI DIRECTOR → AUDIO/PRODUCER/OBS CONTROL) sobre OBS |
| Pulsar | ZabLaboratory/Pulsar | Broadcast engine headless (fork de OBS): obs-websocket v5 + multi-destination |

## Ciclo propuesto (10 fases) — implementado en `automation.ts`

```
PLAN → VALIDATE → AUTOMATE → RECORD → ANALYZE → EDIT → AUDIO → RENDER → VERIFY → ARCHIVE
```

Recuperación (implementada): `ERROR → DIAGNOSTIC → RECOVER | RETRY → RESUME` — la automatización
**nunca empieza de cero** cuando falla una etapa (state.json + resume desde la última fase OK).

## Patrones extraídos (transferibles)

1. **Ciclo de fases explícito como estado** — cada fase es un paso con `status` (pending/running/
   ok/failed/skipped); el manifest `project.json` es la fuente de verdad de la ejecución.
2. **RESUME desde la última fase OK** — `state.json` guarda `currentPhase` + `attempts`; al
   reintentar se salta a la fase fallida sin re-ejecutar las OK (mismo patrón que PIVR del repo).
3. **RECOVER vs RETRY** — RETRY = reintentar la misma fase (con backoff y límite de intentos);
   RECOVER = ejecutar un paso de reparación (ej. matar procesos zombie, liberar puerto) antes de
   reintentar. Máx `MAX_ATTEMPTS = 3` (coherente con MAX_SELF_EVAL_ATTEMPTS de video_edit).
4. **OBS WebSocket v5 = JSON-RPC 2.0 sobre WebSocket** — request con `requestId` (uuid), response
   con `requestStatus.code` (100 = OK); evento `Identified` tras `identify` con `rpcVersion: 1`.
   Implementado en `recorder.ts` con el WebSocket global de Node 22+ (patrón `omag/tts.ts`,
   sin dep `ws`), con degradación elegante si no hay OBS.
5. **Fallback de grabación sin OBS** — si OBS no responde: grabación vía ffmpeg `gdigrab`
   (Windows) con `-f gdigrab -i desktop`, sin dependencias nuevas (ffmpeg ya está instalado).
6. **Manifest por proyecto** — `project.json` con `{ id, name, automation, recording, audio,
   editing, rendering, output, createdAt, updatedAt }`; la tool `automation_run` lo genera y
   actualiza tras cada fase.
7. **Composición con capabilities existentes** — la fase EDIT usa `video_edit` (buildEdl +
   renderFfmpeg), AUDIO usa `omag/sound` (synth) y AUDIO search, VERIFY usa ffprobe (duración
   vs EDL). El engine es un *orquestador de fases*, no reimplementa editores.
8. **Keyless-first** — transcribir (ANALYZE) con provider configurable (Gemini si
   `GOOGLE_API_KEY`, si no se salta con nota); nunca inventar timestamps.

## Mapeo implementado → código UltraIa

| Patrón | Implementación |
|---|---|
| Ciclo 10 fases | `automation.ts` → `PHASES` (PLAN..ARCHIVE) + `runAutomation({steps})` determinista, fetch-free |
| RESUME/RETRY/RECOVER | `state.ts` interno: `{currentPhase, attempts, lastError}` + `resumeFrom` + `MAX_ATTEMPTS=3` |
| OBS WebSocket v5 | `recorder.ts` → `createObsRecorder({url, password})` (WS global, JSON-RPC, requestId, Identified) |
| Grabación fallback | `recorder.ts` → `ffmpegGdigrabCommand(projectId)` (Windows, gdigrab, sin deps) |
| Manifest project.json | `automation.ts` → `buildManifest(project)` + fases lo actualizan |
| Edit con video_edit | fase EDIT: opcional, `{edl, renderCommand}` del paquete |
| Audio con omag | fase AUDIO: opcional, `{music, synth}` (busca Tunetank + synth WAV) |
| Verify con ffprobe | fase VERIFY: opcional, `{durationCheck}` — solo genera el comando |
| Tools de agente | capability `recording` → `recording_start` / `recording_stop`; capability `automation` → `automation_run` |
| Script Python | `scripts/web-automation.py` (keyless, `--dry-run`) — 3 vías documentadas en `docs/AUTOMATION-WEB.md` |

## Decidido NO implementar (con razón)

- **Pulsar headless engine**: es un binario C++ pesado (fork de OBS); el recorder TS cubre el
  contrato JSON-RPC v5 y la grabación real se delega a OBS/ffmpeg. Referencia futura para la
  Fase D Desktop.
- **PyAutoGUI / AutoHotkey**: automatización de sistema operativo nativo; el repo usa Playwright
  (web) y la vía documentada permite PyAutoGUI como driver externo sin importarlo al core.
- **Whisper local**: requiere pesos/GPU; UltraIa es keyless-first → ANALYZE con provider
  configurable o skip documentado.
- **Remotion/MoviePy como deps**: la animación de UltraIa vive en three.js/GSAP (web) y el
  render en ffmpeg (runner); el engine genera comandos, no ejecuta render en tests.
- **Copy de código**: port de *conceptos y protocolos* (JSON-RPC v5, ciclo, manifest), nada
  copiado de los repos (attribution en headers).

## Lecciones aprendidas

- El activo real del bloque es el **ciclo + recovery model** (RESUME desde fase OK), no ningún
  repo individual — mismo patrón que PIVR del repo.
- El JSON-RPC de obs-websocket v5 es un contrato estable: `requestId`/`requestStatus.code`/
  `Identified`; implementarlo en TS puro sin dep `ws` fue directo con el patrón de `omag/tts.ts`.
- Manifest-first: escribir `project.json` por fase hace la ejecución inspeccionable y resume-able
  (mismo principio que `manifest.json` idempotente de `generarContenido` en F2 AutoPub).
- La integración con capabilities existentes (video_edit/omag) evita duplicar editores: el
  engine solo orquesta fases y delega los renders al runner.
