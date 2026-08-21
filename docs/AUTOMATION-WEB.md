# Automatización Web — Media Automation (F2)

Documenta las **tres vías** para automatizar acciones de navegador en UltraIa,
extraídas del bloque "Media Automation" de `enlaces.txt` (repos de referencia:
Argo Video, Playwright Recast, Pagecast, OBS Auto Recorder — ver
`docs/RAZONAMIENTO-MEDIA-AUTOMATION.md`).

El contrato común es un **ActionScript JSON declarativo** (mismo espíritu que
`screenflow`/`actions.py`): una lista de pasos `{action, selector, value, ...}`
que cualquier driver puede validar, planificar o ejecutar.

## El ActionScript

```json
{
  "id": "demo-01",
  "name": "Demo: grabar página y extraer datos",
  "url": "https://example.com",
  "steps": [
    { "action": "goto", "url": "https://example.com" },
    { "action": "wait", "ms": 500 },
    { "action": "click", "selector": "#start" },
    { "action": "type", "selector": "input[name='q']", "value": "ultraia" },
    { "action": "screenshot", "path": "shot-01.png" },
    { "action": "extract", "selector": "main", "as": "content" }
  ]
}
```

Acciones válidas: `goto | click | type | select | wait | screenshot | scroll | extract`.
Reglas de validación (deterministas): acción conocida, `selector` obligatorio en
click/type/select, `url` http/https en goto, `ms` 0–60000 en wait, duración
estimada ≤ 90 min (anti-runaway, mismo límite que screenflow).

## Vía A — Playwright (driver real, npm)

Ejecución real en Chromium headless. Uso (fuera del core; en la máquina de
runner, nunca en CI/tests):

```bash
npm i -D playwright && npx playwright install chromium
python scripts/web-automation.py --driver playwright -s script.json
```

El script abre el navegador, ejecuta cada paso en orden, imprime los
`extract` y captura los screenshots. Si playwright no está instalado falla con
guía de instalación (fail-soft, nunca crashea en silencio).

## Vía B — Python keyless (este script, solo stdlib)

Validación + planificación **sin ejecutar nada** (cero red, cero navegador):

```bash
python scripts/web-automation.py --dry-run                # plan de ejemplo a stdout
python scripts/web-automation.py --dry-run -s script.json # valida + planifica un script
python scripts/web-automation.py --validate -s script.json
python scripts/web-automation.py --dry-run --out plan.json
```

El reporte (`plan.json`) sigue el MISMO esquema que la tool TS
`automation_run` del core: `{id, name, url, status, errors, totalSteps,
estimatedMs, estimatedHuman, antiRunawayLimitMs, steps[], drivers[]}`.
Degradación elegante: un script inválido se reporta `invalid` con errores
legibles y el plan se sigue generando como informativo.

## Vía C — Tool TS `automation_run` (core, ciclo de 10 fases)

La capability `automation` en `packages/core/src/tools/automation.ts` orquesta
el **ciclo completo de producción** (PLAN → VALIDATE → AUTOMATE → RECORD →
ANALYZE → EDIT → AUDIO → RENDER → VERIFY → ARCHIVE) con recuperación
RETRY/RECOVER/RESUME (máx 3 intentos, nunca reinicia de cero). La grabación
de pantalla se delega a la capability `recording` (`recorder.ts`, OBS
WebSocket v5 con fallback ffmpeg gdigrab) y la edición a `video_edit`.
Un agente con las capabilities `automation` + `recording` + `video_edit` puede
producir un video completo desde un ActionScript.

## Composición recomendada

| Necesidad | Vía |
|---|---|
| Validar/planificar sin riesgos (CI, agentes) | B (`--validate` / `--dry-run`) |
| Ejecutar pasos reales en web | A (playwright, runner) |
| Pipeline end-to-end con grabación/edición/audio | C (`automation_run` + `recording_start` + `video_edit_*`) |

## Notas

- Keyless-first: la vía B no requiere claves ni deps; A requiere solo
  playwright (dev dep del runner); C es fetch-free por diseño.
- Los tests del core inyectan fakes (nunca ejecutan navegador/red/ffmpeg).
- El ActionScript de esta F2 comparte vocabulario con `screenflow/actions.py`
  (click/type/wait/screenshot) — un script de pantalla y uno de web se
  componen en el ciclo AUTOMATE de la vía C.