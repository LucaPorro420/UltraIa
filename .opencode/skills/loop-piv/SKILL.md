---
name: loop-piv
description: >
  Protocolo en-sesión del bucle PIVR (Plan ⇒ Implement ⇒ Verificar ⇒ Reiniciar) de UltraIa.
  Usar SIEMPRE que se reciba una tarea de desarrollo o se quiera continuar el proyecto:
  leer STATE.md, tomar la primera tarea del backlog, planificar, implementar, verificar con
  gates npm y reiniciar el ciclo sin esperar confirmación (autorización permanente del usuario).
user_invocable: true
---

# Loop PIVR — Protocolo del bucle de desarrollo continuo

Harness: `npx @cobusgreyling/loop` (CLI npm v0.1.2) + archivos del bucle + driver
`scripts/loop_piv.py`. Detalle completo en `AGENTS.md` §Loop PIVR.

## Archivos del harness (leer SIEMPRE al inicio)

- `STATE.md` — backlog priorizado + High Priority + Watch List.
- `loop-run-log.md` — bitácora de ciclos (plan, commits, evidencia de verificación).
- `LOOP.md` — configuración del bucle. `loop-constraints.md` — reglas vinculantes.
- `learning/LEARNINGS.md` — lecciones verificadas (no romperlas).
- `learning/memory/ultraia_memory.zip` — memoria comprimida (`learning-memory` skill).

## Protocolo obligatorio

### P — Planificar
1. Leer `STATE.md`, `learning/LEARNINGS.md`, `loop-run-log.md`.
2. Si existe `loop-pause-all` en STATE.md o run-log → **detener el bucle** e informar.
3. Tomar la PRIMERA tarea del backlog priorizado de STATE.md.
4. Escribir el plan en `loop-run-log.md`: objetivo, pasos, criterios de verificación
   (gates + tests esperados). NO editar código fuente en esta fase.

### I — Implementar
5. Ejecutar el plan con las tools del proyecto (workspaces, worktree si aplica).
6. Un commit por iteración: `feat|fix|chore(scope): <descripción>`.
7. NUNCA push ni merge (aprobación humana). NUNCA tocar paths denylisted
   (`.env`, `.env.*`, `auth/`, `payments/`, `secrets/`, `credentials/`).

### V — Verificar
8. Gates duales en orden CI:
   - Scoped (tests del paquete afectado + typecheck) en iteraciones intermedias.
   - FULL en cada commit: `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`.
9. Opcional: verifier sub-agent (APPROVE/REJECT).
10. Registrar evidencia en `loop-run-log.md` y actualizar `STATE.md`.

### R — Reiniciar
11. V=GREEN → siguiente ciclo inmediato (auto plan→build, sin esperar al humano).
12. V=REJECT → reinyectar el error al plan (máx 3 intentos por ítem; luego escalar a
    High Priority en STATE.md).
13. Backlog vacío o límites agotados (loop-budget.md) → reportar resumen en STATE.md y parar.

## Auto-conmutación Plan→Build

- Driver: `python scripts/loop_piv.py [--cycles N] [--gate-only] [--dry-run]` — emite la
  petición de build automáticamente al terminar P (`opencode run --agent piv-build "<plan>"`).
- En-sesión: conmutar de plan a build sin esperar confirmación (autorización permanente del
  usuario 15/08/2026). Los gates humanos aplican SOLO a push/merge.

## Reglas de oro

- Gates FULL antes de CADA commit. Nunca deshabilitar tests para pasar CI.
- Máx 3 fix attempts por ítem. Un fix por run (no refactorizar código no relacionado).
- Si el estado es confuso → leer STATE.md y run-log ANTES de actuar; nunca inventar estado.
- El driver puede fallar → registrar el fallo en run-log y escalar; nunca loop infinito silencioso.