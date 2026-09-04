# Plan — loop-121: Gate runner determinista del harness PIVR

## Contexto
El loop PIVR requiere correr 4 gates en orden CI (typecheck → lint → test → build) antes
de cada commit, matando dev servers antes del build (AGENTS.md: el build se corrompe si
`next dev` compila en caliente). Hoy esa lógica vive inline en `loop_piv.py:gates()` (sin
kill, sin JSON, no testeable de forma aislada). Esto lo formaliza en un script determinista
`loop_gate.py` reutilizable en CI y por el driver (`--gate`), con tests de regresión.

## Objetivo
- `scripts/loop_gate.py`: corre los 4 gates en orden, kill de dev servers antes de build
  (opt-in `--kill`), JSON opcional, exit 0/1. `run_gates()` inyectable (test mocking).
- `scripts/loop_gate.test.py`: regresión (orden, short-circuit, kill antes de build,
  no-kill por defecto, continue-on-failure).
- `scripts/loop_piv.py`: acción `--gate` que delega a `loop_gate.run_gates(kill_dev=True)`.
- `package.json`: `harness:test` incluye `loop_gate.test.py`; script `gate` de conveniencia.
- Docs: mención en `LOOP.md`, `AGENTS.md` (Health Stack) y `.opencode/skills/loop-piv/SKILL.md`.

## Pasos
1. Crear `scripts/loop_gate.py` (funciones puras + CLI).
2. Crear `scripts/loop_gate.test.py` (6 tests, standalone `py -3.12`).
3. Editar `scripts/loop_piv.py`: import del módulo en `run_gate()`, acción `--gate`,
   `run_singletons()` lo despacha, `doctor_only` lo excluye, argparse `--gate`.
4. Editar `package.json`: `harness:test` += `loop_gate.test.py`; añadir `"gate"`.
5. Editar `LOOP.md`, `AGENTS.md`, `SKILL.md` (menciones breves).

## ARCHIVOS A TOCAR
- `scripts/loop_gate.py` (nuevo)
- `scripts/loop_gate.test.py` (nuevo)
- `scripts/loop_piv.py` (editar)
- `package.json` (editar)
- `LOOP.md` (editar)
- `AGENTS.md` (editar)
- `.opencode/skills/loop-piv/SKILL.md` (editar)
- `.opencode/plans/loop-121-harness-gate-runner.md` (este plan)

## NO-hacer
- No tocar `gates()` inline existente (se mantiene para `--gate-only` sin kill).
- No tocar WIP de sesiones concurrentes (recorder/automation/reach/blueprint).
- No hacer push (gate humano).

## Criterios
- scoped: `py -3.12 scripts/loop_gate.test.py` → 6/6 OK.
- FULL: `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build` GREEN.
- `npm run harness:test` → 6 suites verdes.
- `py -3.12 scripts/loop_piv.py --gate --dry-run` lista los 4 gates sin ejecutar.

## Predicción
El gate runner queda operativo y testeable; `loop_piv.py --gate` mata dev servers y corre
los 4 gates en orden, con JSON para CI. Commit único `feat(harness): gate runner determinista`.
