# PLAN: Mejoras para el autoprogramador (tarea #73 de STATE.md, prioridad P1)

Fecha: 2026-08-20 · Modo: build · Patrón: bucle IA 4 fases (Sensado→Razonamiento→Acción→Ajuste)
Presupuesto: ~90 min / autolearn.ts + runner Python (sin wiring — llm.ts/index.ts sucios de #25)

## Contexto
- Pedido usuario: "Continua o busca e implementa las mejoras para el autoprogramador".
- `autolearn` (iter-72, `7b39ff0`) dejó FASES pendientes en `docs/RAZONAMIENTO-AUTOLEARN.md`:
  FASE 3 = runner real `scripts/autolearn.py` (lee estado real → gaps → ESCRIBE el plan de
  mejora en `.opencode/plans/autolearn-<fecha>.md` — cierra el ciclo "autoprogramado real");
  FASE 4 = memoria externa persistente (diferida: requiere decisión Qdrant vs cloud).
- enlaces.txt (19/08) trae NUEVO contenido: (1) el post de Instagram DcL0G4MDiKV que el banner
  decía "bloqueado" — el usuario PEGÓ el contenido: un **Motor Automático de Priorización**
  (niveles A/B/C/D con impacto×confianza, plantilla JSON con expected_gain/knowledge_gain/
  compute_cost/strategic_importance/priority_score, regla 70% explotación/20% optimización/
  10% exploración, ciclo diario de 8 pasos) — espec para mejorar el autoprogramador; (2) dos
  URLs GitHub nuevas: mindmuxai/brain.md y Graphify-Labs/graphify ("instala el repo y úsalo
  para el agente propio") — se guardan como fuentes, análisis e implementación en iteración
  siguiente (solo registrar pendiente).
- Verificado: red RESTAURADA (registry.npmjs.org 443 True + fonts.googleapis.com 443 True) →
  gates FULL (incl. build) factibles otra vez.

## Objetivo
- Implementar FASE 3 del autoprogramador + el motor de priorización META-IA en dominio puro TS
  + runner `scripts/autolearn.py` con tests Python; sin tocar llm.ts/index.ts (WIP ajeno #25).

## Pasos
1. Registrar enlaces.txt nuevo: `learning/sources/meta-ia-experimentos.md` (bloque META-IA
   pegado, fuente=Instagram) + `docs/RAZONAMIENTO-META-IA.md` (mapeo
   implementado/pendiente) + fuentes mindmuxai/brain.md + graphify (curl a raw.githubusercontent,
   fail-soft, análisis diferido).
2. Extender `packages/core/src/tools/autolearn.ts` (dominio puro determinista, 0 deps):
   - `ExperimentCandidate` + `prioritizeExperiments(items, pesos?)`: score tipo
     priority_score (expected_gain×strategic_importance×confidence/(compute_cost+ε)
     normalizado a 0-1) + nivel A/B/C/D por umbrales (A≥0.75, B≥0.5, C≥0.3, D).
   - `classifyExperiment` → nivel + acción (Ejecutar inmediatamente / Programar corto plazo /
     Mantener en cola / Exploración ocasional) — determinista por score.
   - `planDailyLoop(gaps, {explotacion=0.7, optimizacion=0.2, exploracion=0.1})`:
     presupuesto por categoría (backlog→explotación, source/gap→optimización, resto→
     exploración) → `DailyExperimentPlan` con los 8 pasos del motor META-IA.
   - `buildImprovementPlan` ya existe — runner lo reutiliza.
3. `scripts/autolearn.py` (stdlib puro, patrón topics.py/cloud-cli.py):
   - Lee STATE.md + LEARNINGS.md + learning/sources + docs/RAZONAMIENTO-* + enlaces.txt.
   - Detects gaps (mismo esquema 4 kinds) + prioriza (RICE + nivel META-IA).
   - `--dry-run` (imprime, no escribe) / `--validate` (checks de estado) / `--out <dir>`
     (default `.opencode/plans`) — ESCRIBE `autolearn-<fecha>.md` con LearnPlan real.
   - Degradación elegante por fuente faltante.
4. `scripts/autolearn.test.py` (e2e con tempdir, patrón cloud-cli.test.py) + aserciones
   deterministas (fixtures inline, sin red).
5. Docs: `docs/RAZONAMIENTO-AUTOLEARN.md` FASE 3 ✅ + pendiente FASE 4/WIP wiring.

## Archivos a tocar (staging explícito)
- `packages/core/src/tools/autolearn.ts` — nuevas funciones de priorización/plan diario
- `packages/core/src/tools/autolearn.test.ts` — tests nuevos (objetivo +8)
- `scripts/autolearn.py` — runner (NUEVO)
- `scripts/autolearn.test.py` — e2e (NUEVO)
- `learning/sources/meta-ia-experimentos.md` — fuente cruda (NUEVO)
- `learning/sources/brain-md.md` + `learning/sources/graphify.md` — fuentes crudas (NUEVO, fail-soft)
- `docs/RAZONAMIENTO-META-IA.md` — análisis (NUEVO)
- `docs/RAZONAMIENTO-AUTOLEARN.md` — FASE 3 marcada, pendientes actualizados
- `.opencode/plans/loop-73-autolearn-runner.md` — este plan
- `STATE.md` + `loop-run-log.md` — fila 73 + bitácora

## RECURSOS / PRESUPUESTO
- Patrón previo: `scripts/topics.py` + `scripts/cloud-cli.py` (stdlib, fail-soft, e2e tempdir).
- `autolearn.ts` ya tiene detectGaps/prioritizeWork/buildImprovementPlan.
- Python: `py -3.12` (el único con pytest/ruff instalado).
- Tiempo: ~90 min. Tokens: ~30k.

## NO-hacer (guardas explícitas)
- NO tocar `packages/core/src/ai/llm.ts` ni `packages/core/src/tools/index.ts` — WIP ajeno #25
  (borró wiring autolearn/semantic_memory del worktree, reemplazó por creativo; restauración
  de wiring = FASE 2, requiere cuarentena byte-exact y NO es esta iteración).
- NO tocar `.env*`, scripts de la sesión ajena (web-automation.py, export_instagram_cookies.py,
  creativo.ts, connections.ts, automation.ts, recorder.ts), ni el mp4 del usuario.
- NO `git add .` — staging explícito con pathspec; commit con `-- <files>`.
- NO commitear el output del runner (`.opencode/plans/autolearn-*.md` generado es evidencia
  de demo: regenerable, no se commitea salvo que sea el plan oficial).

## Criterios de verificación
- Scoped: `npm run typecheck` (core) + `npx vitest run packages/core/src/tools/autolearn.test.ts`
- Python: `py -3.12 -m pyflakes scripts/autolearn.py`, `py -3.12 -m py_compile` ambos,
  `py -3.12 scripts/autolearn.test.py` (e2e PASS), ruff si disponible.
- FULL antes de commit: `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`
  (con kill de dev servers + `.next` limpio antes del build).
- Tests esperados: autolearn +8 (total autolearn ~29), e2e Python ~10.

## TOLERANCIAS
- Si los archivos críticos del repo (AGENTS.md/package.json/etc.) vuelven a 0 bytes →
  check-6/8 de state-integrity-check: restaurar desde HEAD antes de seguir.
- Si FULL queda RED por WIP ajeno (creativo.ts) → cuarentena de esos archivos
  (%TEMP%\opencode\wip-quarantine-20260820\) → gates → restaurar byte-exact, sin commitearlos.
- Máx 3 intentos por gate; si sigue RED → escalar a High Priority y NO commitear.

## Riesgos / guardas
- Concurrente #25 puede tocar llm.ts/index.ts durante la iteración → heartbeat + pathspec.
- Vitest stale cache → `Remove-Item node_modules/.vite -Recurse` antes de diagnosticar.
- PowerShell 5.1: nunca Set-Content para JSON (BOM); usar Write tool para docs/JSON.

## Esfuerzo estimado
- Medio-alto — dominio nuevo + runner Python + 2 fuentes + docs; sin wiring (diferido).