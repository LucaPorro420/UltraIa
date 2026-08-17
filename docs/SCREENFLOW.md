# ScreenFlow — grabación de pantalla → acciones → edición → publicación local → continuidad

Capability `screenflow` (17/08/2026). Pipeline de producción de video de pantalla
automatizado, keyless-first, determinista y verificable con gates.

## Pipeline (5 fases)

1. **Captura** — `ffmpeg gdigrab` (Win32; ya instalado). argv generado por
   `buildFfmpegCapture`: fps 30, CRF 18, `pcm_s16le`→AAC 128k, `-f segment` por
   paso (60s). Sin audio device → pista de silencio (concatenable).
2. **Acciones** — ActionScript JSON declarativo ejecutado por
   `scripts/screenflow/actions.py` (pyautogui; Playwright opcional para
   `wait_selector`). Fail-soft por acción, retry máx 3 con backoff 1s, validación
   previa determinista (`validateActionScript`).
3. **Edición** — reutiliza la capability `video_edit` (WS-2): EDL + fades 30ms +
   concat lossless + self-eval (`Task/video-edit-demo.ts`). Extensible con
   `omag/sound` (banda sonora) y `loudnorm`.
4. **Publicación local** — paquete reproducible en `.ultraia/recordings/<run-id>/`:
   `final.mp4` (H.264+AAC `+faststart`), `master.mkv`, `final.webm`, `poster.png`,
   `manifest.json` (toolchain + hashes), `report.md`. Nomenclatura
   `YYYYMMDD-HHMMSS-<slug>-v<N>.mp4` + `latest.mp4`. Integrable con la cola
   `Publication` (canal `'local'`) para métricas sin código nuevo.
5. **Continuidad** — `state.json` por run (resume idempotente: status
   running/capturing + attempts<3 → retry; ≥3 → fail con error registrado),
   scheduling: (a) a demanda `Task/run_screenflow.ts`, (b) `schtasks` diario
   (`scripts/screenflow/schedule.ps1`), (c) cron en Linux, (d) watch de carpeta
   `hot/` (pendiente runner).

## ActionScript (ejemplo)

```json
{
  "name": "demo-tutorial",
  "capture": { "fps": 30, "region": "1920x1080+0+0" },
  "actions": [
    { "type": "open_url", "url": "https://ultraia.local" },
    { "type": "sleep", "ms": 1500 },
    { "type": "type", "text": "hola mundo" },
    { "type": "click", "x": 640, "y": 360 },
    { "type": "screenshot", "name": "step1" },
    { "type": "end" }
  ]
}
```

Tipos soportados: `sleep` `click` `type` `key` `scroll` `move` `open_url`
`exec` `screenshot` `wait_selector` `end`.

## Uso

```powershell
# validar + planear (sin ejecutar nada)
node_modules\.bin\vite-node.cmd Task/run_screenflow.ts scripts/screenflow/demo.json --dry-run

# ejecución real
node_modules\.bin\vite-node.cmd Task/run_screenflow.ts scripts/screenflow/demo.json

# acciones solas (fail-soft)
python scripts/screenflow/actions.py scripts/screenflow/demo.json --steps 0-2

# programar diario a las 09:30
powershell -ExecutionPolicy Bypass -File scripts\screenflow\schedule.ps1 `
  -ScriptPath Task\run_screenflow.ts -RunId 20260817120000-demo -Time "09:30"
```

## Seguridad

- `exec` usa **allowlist** de comandos (runner valida contra
  `scripts/screenflow/allowlist.txt`; sin allowlist → warning + fail-soft).
- El runner nunca ejecuta nada en `--dry-run`.
- Los tests unitarios no ejecutan ffmpeg/pyautogui (argv generation only).
- Los logs nunca incluyen secretos (las acciones no exponen env vars).

## Verificación

- Tests: `packages/core/src/tools/screenflow.test.ts` — 22 PASS (dominio puro,
  cero ejecución real).
- Gates repo: typecheck → lint → test → build (igual que el resto del monorepo).
