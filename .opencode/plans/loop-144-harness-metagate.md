# Plan — loop-144: meta-gate incluye harness:test en `npm run gate`

## Contexto
El gate runner determinista (`scripts/loop_gate.py`, Track F) corre los 4 gates CI
(typecheck->lint->test->build) con kill de dev servers. El harness Python tiene su propia
bateria (`npm run harness:test`, 7 suites) que hoy NO se valida dentro del gate. Por lo tanto
una regression del harness (p.ej. en loop_piv.py o loop_verifier.py) no se detecta en CI al
correr `npm run gate`. Este plan la integra como 5o check.

## Objetivo
- `scripts/loop_gate.py`: insertar `("harness", "npm run harness:test")` en GATES, justo
  despues de `test` y antes de `build`, para fallar rapido (sin el build de 5 min) si el
  harness regresa.
- Docs: mencionar en `LOOP.md` y `AGENTS.md` que `npm run gate` ahora valida tambien el
  harness (5 checks).
- `package.json` no cambia (ya existe `harness:test`).

## Pasos
1. Editar `scripts/loop_gate.py`: GATES con entrada harness.
2. Editar `LOOP.md` + `AGENTS.md` (mencion breve).

## ARCHIVOS A TOCAR
- `scripts/loop_gate.py` (editar)
- `LOOP.md` (editar)
- `AGENTS.md` (editar)
- `.opencode/plans/loop-144-harness-metagate.md` (este plan)

## NO-hacer
- No tocar WIP de sesiones concurrentes (prototypes/lab, recorder/automation, mobile).
- No disparar el build salvo como parte del propio gate.
- No push.

## Criterios
- `py -3.12 -c "import sys; sys.path.insert(0,'scripts'); import loop_gate; print([g[0] for g in loop_gate.GATES])"` -> incluye 'harness'.
- `npm run harness:test` -> 7 suites verdes.
- `npm run gate` -> FULL GREEN (5 checks, build incluido).

## Prediccion
Meta-gate operativo; `npm run gate` ahora tambien protege el harness Python. Commit unico
`feat(harness): meta-gate incluye harness:test en npm run gate`.
