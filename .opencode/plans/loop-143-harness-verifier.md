# Plan — loop-143: Verificador determinista del loop PIVR (Track G)

## Contexto
El skill `loop-verifier` (fase V del PIVR) debe leer el plan file, revisar el diff y la
evidencia de gates, y responder APPROVE/REJECT. Hoy eso solo existe como SKILL.md; no hay
una implementacion determinista reutilizable en CI. Esto lo materializa en `scripts/loop_verifier.py`
(puro, testeable, sin `opencode`), cerrando el subsistema de verificacion del harness
(doctor + triage + gate + verifier).

## Objetivo
- `scripts/loop_verifier.py`: lee un plan file y verifica (1) secciones obligatorias
  (Contexto/Objetivo/Pasos/ARCHIVOS A TOCAR/Criterios), (2) que los archivos listados en
  ARCHIVOS A TOCAR existan en el repo (o figuren en el diff si `--check-diff`), (3) opcional:
  que el diff toque al menos un archivo planificado. Devuelve APPROVE/REJECT + razones,
  exit 0/1, JSON opcional. `verify()` inyectable (git diff mockeable).
- `scripts/loop_verifier.test.py`: regresion (secciones faltantes, archivo inexistente,
  todo ok, check-diff sin solape). Standalone.
- `scripts/loop_piv.py`: accion `--verify <plan>` que delega a loop_verifier.
- `package.json`: `harness:test` incluye `loop_verifier.test.py`.
- Docs: menciones en `LOOP.md`, `AGENTS.md`, `.opencode/skills/loop-piv/SKILL.md`.

## Pasos
1. Crear `scripts/loop_verifier.py` (funciones puras + CLI).
2. Crear `scripts/loop_verifier.test.py` (4+ tests, standalone).
3. Editar `scripts/loop_piv.py`: import diferido + `run_verify()` + accion `--verify`.
4. Editar `package.json`: `harness:test` += `loop_verifier.test.py`.
5. Editar `LOOP.md`, `AGENTS.md`, `SKILL.md` (menciones breves).

## ARCHIVOS A TOCAR
- `scripts/loop_verifier.py` (nuevo)
- `scripts/loop_verifier.test.py` (nuevo)
- `scripts/loop_piv.py` (editar)
- `package.json` (editar)
- `LOOP.md` (editar)
- `AGENTS.md` (editar)
- `.opencode/skills/loop-piv/SKILL.md` (editar)
- `.opencode/plans/loop-143-harness-verifier.md` (este plan)

## NO-hacer
- No editar WIP de sesiones concurrentes (prototypes/lab, recorder/automation, mobile creaciones).
- No disparar el build inestable de Next (este cambio es Python puro, fuera del grafo npm).
- No hacer push.

## Criterios
- scoped: `py -3.12 scripts/loop_verifier.test.py` → OK.
- `npm run harness:test` → 7 suites verdes.
- `py -3.12 scripts/loop_piv.py --verify .opencode/plans/loop-143-harness-verifier.md` → APPROVE.
- `py -3.12 scripts/loop_piv.py --verify /ruta/inexistente.md` → REJECT (exit 1).

## Prediccion
Verifier operativo y testeable; el driver puede validar planes en CI. Commit unico
`feat(harness): verifier determinista (plan file -> APPROVE/REJECT)`.
