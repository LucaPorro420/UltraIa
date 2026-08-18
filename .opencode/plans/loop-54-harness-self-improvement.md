# PLAN: Harness self-improvement — fix mark_done + concurrency guard + state integrity (tarea #54 propuesta)

Fecha: 2026-08-18 · Modo: build (parcial — código+tests entregados, sin gates FULL ni commit)

## Contexto

Auditoría solicitada por el usuario sobre el proyecto y su planificación general (ver
`docs/RAZONAMIENTO-AUDITORIA-HARNESS-2026-08-18.md` para la evidencia completa). Hallazgos que
motivan este plan: (1) bug verificado en `mark_done` que puede cerrar tareas ajenas bajo
sesiones concurrentes; (2) STATE.md con IDs duplicados, filas fuera de tabla y un banner de
pausa desincronizado del kill switch real; (3) el patrón de aislamiento de sesiones
concurrentes (`%TEMP%\opencode\*`) se reinventó a mano en las iteraciones 25, 26, 41 y 46 sin
quedar nunca como skill/script reusable; (4) los planes de 9 iteraciones ya cerradas y
pusheadas nunca se commitearon; (5) los skills `loop-piv`/`loop-verifier` no estaban espejados
en `skills/` raíz. No se tocó STATE.md/loop-run-log.md ni el WIP sin trackear (ver razones en el
doc de auditoría §5) — esos quedan como Watch List / siguiente paso humano.

## Objetivo

Cerrar los cuatro puntos accionables sin decisión humana previa (bug + 2 skills + 1 agente +
sync de skills), dejando documentado y listo-para-pegar lo que sí requiere una decisión del
usuario (fila de STATE.md, triage del árbol sucio).

## Pasos (ya ejecutados en este paquete)

1. **Fix `mark_done`** en `scripts/loop_piv.py`: filtrar el reemplazo por
   `int(m.group(1)) == task_id` en vez de por cualquier fila `pendiente`. Reproducido el bug
   contra el original (2 de 4 tests fallan) y confirmado el fix (4/4 pasan) — ver
   `scripts/loop_piv_mark_done.test.py`.
2. **Skill `loop-concurrency-guard`** (`skills/` y `.opencode/skills/`): protocolo de lock file
   (`.ultraia/loop/session.lock`) + cuarentena formalizada, reemplaza la reinvención manual de
   las iteraciones 25/26/41/46.
3. **Skill `state-integrity-check`** (`skills/` y `.opencode/skills/`): 5 checks de lectura
   sobre STATE.md (IDs duplicados, filas huérfanas, banner vs. kill switch, encoding, banner
   obsoleto). Nunca escribe STATE.md.
4. **Agente `state-doctor`** en `opencode.json`: primary, `edit: deny`, corre la skill anterior
   y reporta — compañero read-only de `loop-triage`. JSON validado (`python -c "import json..."`,
   ver Verificación).
5. **Sync de skills**: copiados `loop-piv/SKILL.md` y `loop-verifier/SKILL.md` de
   `.opencode/skills/` a `skills/` raíz (contenido idéntico, verificado con `diff`) — ahora
   `skills/` tiene los 5 skills de loop completos, no solo 3.

## Pasos pendientes (requieren decisión humana — NO ejecutados)

6. Confirmar si el banner "ITERACIÓN 46 PAUSADA" de STATE.md sigue vigente o es obsoleto
   (evidencia en el doc de auditoría §2) y actualizarlo.
7. Triage de los ~30 archivos sin trackear: decidir cuál de los 3 planes del "slot 53"
   (`loop-53-ia-generativa-procedural.md`, `loop-53-hud-conexiones.md`,
   `loop-media-synthesis-full.md`) sigue vigente, y si el borrado de
   `publications.test.ts`/`publish.test.ts` fue intencional.
8. Una vez limpio el árbol: pegar la fila de backlog de abajo en STATE.md con estado
   `pendiente`, dejar que el ciclo PIVR normal (`loop-piv` + `piv-build`) corra gates FULL y
   commitee este paquete.
9. (Opcional, ciclo futuro) Referenciar `loop-concurrency-guard` desde los prompts de
   `piv-plan`/`piv-build` en `opencode.json` — no se tocó en esta ronda para no modificar el
   comportamiento de los agentes ya en uso sin al menos un ciclo real de validación de la skill
   nueva primero.

### Fila de backlog lista para pegar en STATE.md (paso 8)

```
| 54 | **Harness self-improvement**: fix `mark_done` (marcaba DONE cualquier fila pendiente, no solo `task_id` — repro + test en `scripts/loop_piv_mark_done.test.py`) + skill `loop-concurrency-guard` (lock `.ultraia/loop/session.lock`, reemplaza la cuarentena manual de iteraciones 25/26/41/46) + skill `state-integrity-check` + agente `state-doctor` (IDs duplicados #16/#17/#36/#41, filas 45/47-52 fuera de tabla, banner "iteración 46 pausada" desincronizado — `loop-pause-all` ausente) + sync `.opencode/skills/{loop-piv,loop-verifier}` a `skills/` raíz | scripts + .opencode + skills + docs | gates Python (ruff/pyflakes/py_compile + `loop_piv_mark_done.test.py` 4/4) — FULL npm pendiente de árbol limpio | pendiente — requiere triage previo (ver docs/RAZONAMIENTO-AUDITORIA-HARNESS-2026-08-18.md §3) |
```

## Archivos a tocar (staging explícito)

- `scripts/loop_piv.py` — fix `mark_done` (única función tocada)
- `scripts/loop_piv_mark_done.test.py` — nuevo, 4 tests
- `opencode.json` — agrega bloque `state-doctor` (aditivo, ningún agente existente se modificó)
- `skills/loop-concurrency-guard/SKILL.md` — nuevo
- `skills/state-integrity-check/SKILL.md` — nuevo
- `.opencode/skills/loop-concurrency-guard/SKILL.md` — nuevo (espejo cargable por opencode)
- `.opencode/skills/state-integrity-check/SKILL.md` — nuevo (espejo cargable por opencode)
- `skills/loop-piv/SKILL.md` — nuevo (sync desde `.opencode/skills/`)
- `skills/loop-verifier/SKILL.md` — nuevo (sync desde `.opencode/skills/`)
- `docs/RAZONAMIENTO-AUDITORIA-HARNESS-2026-08-18.md` — nuevo
- NO TOCAR (fuera de este plan, ver §3 del doc de auditoría): `STATE.md`, `loop-run-log.md`,
  `automation.ts`/`recorder.ts` (#25), `publications.test.ts`/`publish.test.ts` (borrados sin
  resolver), los 3 planes del slot 53, `cuentas.txt`, `.ultraia/`.

## Criterios de verificación

- Ejecutado en esta ronda: `python -m py_compile scripts/loop_piv.py` (OK) · JSON válido de
  `opencode.json` (OK, agente `state-doctor` presente) · `python scripts/loop_piv_mark_done.test.py`
  → 4/4 PASS, y contra una copia sin el fix → 2/4 FAIL (confirma que el test detecta la
  regresión real).
- Pendiente (paso 8, ciclo futuro): scoped `npm run typecheck` (ninguno de los archivos
  tocados es TypeScript excepto ninguno — este paquete es Python/JSON/Markdown puro, no debería
  afectar el build de npm) + FULL antes de commit por norma del proyecto de todos modos.

## Riesgos / guardas

- El fix de `mark_done` cambia comportamiento: antes marcaba DONE de más bajo concurrencia; con
  el fix, si se llama con un `task_id` que ya no está en la tabla (por ejemplo si alguien
  renumeró la fila a mano), ahora NO marca nada y avisa por consola en vez de marcar la primera
  fila `pendiente` que encuentre. Es el comportamiento correcto, pero es un cambio observable.
- Ningún archivo con cambios sin commitear (según `git status` en el momento de esta auditoría)
  fue tocado.
- `opencode.json`: el nuevo bloque es puramente aditivo; los 7 agentes existentes quedaron
  byte-a-byte iguales (verificado por inspección del diff aplicado).

## Esfuerzo

Bajo-medio — ya ejecutado (código + tests + docs); lo que resta (pasos 6-8) es triage humano,
no desarrollo.
