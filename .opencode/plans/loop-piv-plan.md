# PLAN: Loop PIVR (Plan ⇒ Implement ⇒ Verificar ⇒ Reiniciar) + loop-engineering

Fecha: 15/08/2026 · Modo: plan (esperando aprobación para ejecutar)

## Contexto

- `cobusgreyling/loop-engineering` es un CLI npm (NO pip): `npx @cobusgreyling/loop` v0.1.2.
  **YA INSTALADO y scaffolded** (`loop init . --pattern daily-triage --tool opencode`,
  Loop Ready 100/100). No existe `generate_development_loop()` Python; el orquestador real =
  scaffold + skills + STATE/LOOP/run-log + `loop doctor/status/cost`.
- El scaffold generó: `AGENTS.md` (⚠ SOBRESCRIBIÓ el del proyecto), `STATE.md` (genérico),
  `LOOP.md` (daily-triage), `opencode.json`, `loop-budget.md`, `loop-constraints.md`,
  `loop-run-log.md`, `skills/loop-triage|loop-budget|loop-constraints/`.
- `LOOPENGINEER.TXT`: petición del usuario (PIVR + auto plan→build). Punto 1 del scan: **verificar**
  las adiciones del scaffold y corregir lo dañado.

## Auditoría del scan (verificación de adiciones) — completa

| Adición | Veredicto | Acción |
|---|---|---|
| `AGENTS.md` sobrescrito (220→23 líneas) | ⚠ daño | Merge: restaurar HEAD + sección Loop PIVR |
| `STATE.md` genérico nuevo | ⚠ pérdida | Reconstruir con estado real + backlog |
| `LOOP.md` daily-triage | ⚠ inadecuado | Reescribir a patrón PIVR continuo |
| `opencode.json` (loop-triage, implementer, verifier) | ✅ base útil | Extender con piv-plan + piv-build |
| `skills/loop-*` en skills/ raíz | ⚠ no cargables por opencode | Copiar a `.opencode/skills/` + crear `loop-piv` |
| `loop-constraints.md` | ✅ compatible | Añadir reglas UltraIa (gates npm, 1 commit/iteración) |
| `loop-budget.md` | ⚠ plantilla | Personalizar (100k tokens/día, kill switch) |
| `loop-run-log.md` | ✅ | Bitácora del bucle |
| `LOOPENGINEER.TXT` | ✅ input | Define el protocolo PIVR |

## Fases de implementación

### Fase A — Harness PIVR (commit `feat(loop): PIVR harness`)
1. **AGENTS.md**: `git show HEAD:AGENTS.md` → restaurar contenido original íntegro + sección
   `## Loop PIVR` (protocolo P/I/V/R, auto-conmutación, kill switch, archivos del harness).
2. **STATE.md**: estado real (Fase A ✅, Fase B ✅ commit `1f5a3fe`, tests 370/370) + backlog
   priorizado: [1] commit integraciones pendientes, [2] Fase C adapters, [3] Fase D Shell Desktop,
   [4] DOCS_TODO + coverage + perf, [5] Gen-Engine roadmap F5.
3. **LOOP.md**: patrón PIVR (cadencia por petición, gates duales, agentes del bucle).
4. **opencode.json**: agents `piv-plan` (primary, read-only: produce plan + criterios de
   verificación; bash ask/edit deny) y `piv-build` (primary: implementa, corre gates scoped, commitea;
   bash allow/edit allow — restringido por loop-constraints + denylist).
5. **`.opencode/skills/loop-piv/SKILL.md`**: protocolo PIVR en-sesión (cargable por cualquier modelo).
   Copiar también `loop-triage`, `loop-budget`, `loop-constraints` a `.opencode/skills/` (se dejan en
   `skills/` raíz como referencia del scaffold — decisión del usuario: ambas ubicaciones).
6. **`scripts/loop_piv.py`** (Python 3.12, patrón de start.py): driver híbrido:
   - Lee `STATE.md` → toma siguiente tarea del backlog → invoca
     `opencode run --agent piv-plan "<tarea>"` (P) → `opencode run --agent piv-build "<plan>"` (I)
     → gates (V): scoped por iteración, FULL (`npm run typecheck && npm run lint && npm run test &&
     npm run build`) en commit → registra en `loop-run-log.md` + `STATE.md` (R).
   - Auto plan→build: el driver emite la petición de build al terminar P (simula al usuario).
   - Flags: `--cycles N`, `--gate-only`, `--dry-run`, `--full-gate`; resolución de `opencode.cmd`;
     max 3 intentos por ítem; kill switch `loop-pause-all`; nunca push.
7. **loop-budget.md** y **loop-constraints.md** personalizados.
8. **Verificación Fase A**: `python scripts/loop_piv.py --dry-run` + `npx @cobusgreyling/loop doctor .`
   + gates FULL → commit Fase A.

### Fase B — Primeros ciclos del bucle (se ejecutan tras aprobación)
- **Ciclo 1**: commit integraciones pendientes (web-browse truth 10/10, `g0dm0d3` + tests,
  skills `ecc-*`, vendor/, nanoprompts, learning/, docs, cross-refs usuario) — gates FULL.
- **Ciclo 2..n**: Fase C — `packages/runtime/src/adapters/` a `@ultraia/core` (db, ai-gateway,
  tools, omag) con tests por adapter → Fase D Shell Desktop → mejoras (DOCS_TODO, coverage, perf).

### Fase C — Hardening
- `loop doctor .` por ciclo (exit 0/1/2), `loop-cost` para estimar, badge README, try/catch del
  driver (fallo → run-log + High Priority, sin loop silencioso), documentación multi-modelo
  (README del harness: cómo usarlo desde cualquier agente/modelo).

## Verificación del plan (V de esta fase)
- `loop doctor .` (audit + sync), dry-run del driver, gates npm FULL, commit por fase,
  evidencia en `loop-run-log.md` y `STATE.md`.
- Criterio de completitud del proyecto: backlog vacío + gates green + `loop audit .` ≥ 80.

## Decisiones del usuario (confirmadas)
1. **Híbrido**: driver autónomo + ciclos en-sesión + driver para trabajo mecánico; documentado y
   usable para cada modelo y agente del proyecto.
2. **Gates duales**: scoped por iteración + FULL al commit (la mejor combinación).
3. **Skills**: en `.opencode/skills/` (cargables) Y en `skills/` raíz (apoyo/habilidad general).

## Riesgos / guardas
- Nunca push/merge automático (aprobación humana obligatoria).
- Denylist paths intacta (`.env`, auth/, payments/, secrets/, credentials/).
- Max 3 fix attempts por ítem; luego escalar a High Priority.
- Kill switch `loop-pause-all` respetado por driver y agentes.