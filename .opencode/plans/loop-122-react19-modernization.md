# Plan loop-122 — Retomar harness fix + verificación React 19 del proyecto

## Contexto
- Usuario (26/08): "retomalo y mejora el react e proyecto total para react 19.0 version en
  conjunto con otros agente e procesos".
- `loop_piv.py` (kill-switch) fix de iter-112 se perdió del árbol (sesión concurrente activa
  — commit `3ad2b1a` emailCode + WIP `apps/web/src/app/api/connections/*`). El usuario autoriza
  retomarlo.
- Investigación S-D/L-T: el proyecto YA está íntegramente en **React 19.2.3** (web + mobile,
  Next 15.3.3, `@types/react` 19.2). No quedan patrones legacy: 0 `forwardRef` reales (solo
  comentarios en label/textarea ya modernizados), 0 class components, 0 `React.FC`/`SFC`/
  `defaultProps`, 0 `prop-types`/`findDOMNode`/string refs. Bajar a 19.0.0 sería regresión y
  rompería Expo/RN 0.86 (requiere 19.2.x) → se interpreta "19.0" como "línea React 19".

## Objetivo
1. Re-aplicar el fix kill-switch en `scripts/loop_piv.py` (+ test en `loop_piv_doctor.test.py`):
   negaciones ampliadas con marcadores meta-mención (`mencione`/`ocurrencia`/`falso positivo`/
   `matches`) + `"without "` en inglés, ventana 24 chars.
2. Verificación React 19 de todo el proyecto (gates FULL): asegurar 0 warnings de React 19 en
   build y que typecheck/lint/test/build siguen GREEN tras el cambio.
3. Coordinar con la sesión concurrente: NO tocar `apps/web/src/app/api/connections/*`
   (WIP ajeno), NO push (requiere humano).

## Pasos
1. Editar `scripts/loop_piv.py`:
   - `KILL_SWITCH_NEGATIONS` += `"without "`.
   - docstring `kill_switch_active` += FIX 2026-08-26.
   - cuerpo: `extra_negations = (...)` + `if any(...) or any(...)` para meta-mención.
2. Editar `scripts/loop_piv_doctor.test.py` (clase `KillSwitchTests`):
   - `test_diagnostic_meta_mention_ignored` (L2294 falso positivo).
   - `test_english_without_negation_ignored`.
3. Verificar: `py -3.12 scripts/loop_piv_doctor.test.py` → OK.
4. Gates FULL (matar dev servers primero): `npm run typecheck` → `npm run lint` →
   `npm run test` → `npm run build`. Capturar warnings React 19; si los hay, corregir
   (esperado: 0).
5. Commit harness fix (pathspec `scripts/loop_piv.py scripts/loop_piv_doctor.test.py` +
   plan file). Commit aparte de cualquier fix React 19 que surgiera.
6. Report: estado real React 19 + fix reapicado; ofrecer adopción de features React 19
   (`use`/Server Actions/`useOptimistic`) como seguimiento opcional.

## ARCHIVOS A TOCAR
scripts/loop_piv.py (E) · scripts/loop_piv_doctor.test.py (E) ·
.opencode/plans/loop-122-react19-modernization.md (N) · (posibles fixes React 19 si el
build los revela).

## NO-hacer
- NO bajar React a 19.0.0 (regresión).
- NO tocar `connections/*` (WIP sesión concurrente), ni vendor/, ni push.

## CRITERIOS
scoped: py -3.12 doctor test OK. FULL: typecheck/lint/test/build GREEN.

## PREDICCIÓN
doctor test 13/13 OK; FULL idéntico al último verde (build sin warnings React 19 nuevos).
