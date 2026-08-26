# Plan loop-112 — GENESIS v0.1 consolidación: contrato raíz + registry + consola operador + wifi

**Fuente**: `InfoPeticion.txt` (26/08/2026) — pedido GENESIS Autonomous Engineering completo.
**Prioridad**: P1 · **Esfuerzo**: M (~1 ciclo C1) · **Riesgo**: bajo

## SPEC

El usuario pide convertir el repo en entorno de ingeniería autónoma (árbol genesis,
genesis.json contrato, agentes, skills, MCP registry, memoria, research registry,
loop autónomo, wifi auto-connect). **Auditoría previa (Sensado)** demuestra que el
motor YA EXISTE commiteado (d4640e6→bd5a967):

- `packages/core/src/tools/genesis.ts` — schema manifest, autonomy levels, gates,
  priorización, propuesta siguiente acción (+tests).
- `packages/core/src/tools/genesis-runner.ts` — runGenesisCycle con gates reales npm (+tests).
- `scripts/genesis-run.ts` + `npm run genesis` — CLI del ciclo autónomo.
- Wiring COMPLETO en llm.ts (imports L104-106) e index.ts (export L58, tools L161, descriptor L239).
- Memoria runtime: `.ultraia/genesis/state.json` (aún sin generar — nunca corrido).

**GAPS REALES detectados** (lo único a construir, sin duplicar):
- **G1** No hay `genesis.json` canónico en RAÍZ (contrato escondido en scripts/genesis.manifest.json).
- **G2** No existe Research Registry estructurado (repos estudiados con decision/evidence).
- **G3** No hay consola operador unificada (doctor/inspect/gates/run/triage/registry/project/wifi).
- **G4** WiFi auto-connect (línea 1 de InfoPeticion.txt: "controla el wifi también") — inexistente.
- **G5** docs/GENESIS.md — auditoría Fase 0-10 condensada + mapeo Genesis→UltraIa + MCP registry clasificado.
- **G6** Skill `.opencode/skills/genesis/` para operación por cualquier agente (+ espejo raíz).
- **G7** Multi-proyecto `projects/<name>/genesis.json` (template + comando instantiate).

## DESIGN

Consola operador Python stdlib (`scripts/genesis.py`, patrón cloud-cli.py/loop_piv.py)
que ENVUELVE lo existente (nunca reimplementa):

```
py -3.12 scripts/genesis.py manifest            # valida genesis.json raíz contra el schema core
py -3.12 scripts/genesis.py doctor              # git status + kill switch + lock + prereqs + wifi status
py -3.12 scripts/genesis.py inspect             # snapshot: skills/capabilities/backlog pendiente
py -3.12 scripts/genesis.py gates               # typecheck→lint→test→build (delega npm)
py -3.12 scripts/genesis.py run [--cycles N]    # delega scripts/loop_piv.py --cycles N
py -3.12 scripts/genesis.py triage              # delega scripts/loop_piv.py --triage
py -3.12 scripts/genesis.py registry validate   # schema del research-registry
py -3.12 scripts/genesis.py project new <slug>  # instancia genesis/projects/<slug>/genesis.json
py -3.12 scripts/genesis.py wifi [status|ensure]# netsh read-only / connect CON GUARDAS
```

WiFi (guardas estrictas): `status` = parse `netsh wlan show interfaces` (read-only,
siempre seguro). `ensure` = SOLO con flag `--ensure` explícito Y env `GENESIS_WIFI_SSID`
definido → `netsh wlan connect name=<ssid>`; sin ellos imprime guía y exit 0 (fail-soft).
NUNCA disconnect ni operaciones destructivas.

Research Registry: `genesis/research-registry.json` con schema del pedido
(repository/url/license/stars/last_activity/architecture/useful_components/
integration_difficulty/security_risk/decision/reason/evidence[]), sembrado con los
~14 repos ya estudiados y verificados en la historia del repo (evidence → learning/sources + docs/RAZONAMIENTO-*).

Root `genesis.json`: contrato operativo que REFERENCIA sistemas existentes
(workflow PIVR, agents opencode.json, memory learning/, gates npm, stop conditions,
reglas seguridad = constraints). `genesis-run.ts` gana fallback: prefiere raíz
`genesis.json` si existe (retrocompatible con --manifest y default actual).

## ARCHIVOS A TOCAR (crear)

1. `genesis.json` (raíz) — contrato operativo v0.1
2. `scripts/genesis.py` — consola operador (stdlib, Windows-first)
3. `scripts/genesis.test.py` — suite standalone (patrón cloud-cli.test.py)
4. `genesis/research-registry.json` — registry sembrado
5. `genesis/projects/_TEMPLATE.genesis.json` + `genesis/projects/README.md`
6. `docs/GENESIS.md` — auditoría + mapeo + roadmap + MCP registry
7. `.opencode/skills/genesis/SKILL.md` + `skills/genesis/SKILL.md` (espejo hash-sync)
8. `STATE.md` fila 112 + `loop-run-log.md` [P]/[I]/[V]/[R] + `learning/LEARNINGS.md` lección

Modificar: `scripts/genesis-run.ts` (default manifest → raíz primero, ~4 líneas).

## RECURSOS/PRESUPUESTO

- Gates Python: `py -3.12 scripts/genesis.test.py` + py_compile + ruff/pyflakes si disponibles.
- Gates FULL npm antes de commit (orden CI). Kill dev servers antes de build.
- Presupuesto: 1 ciclo, ~60k tokens. Sin sub-agentes.

## NO-hacer

- NO duplicar el motor core (ya existe y está wired).
- NO tocar WIP ajeno: workspace-client.tsx, ide-shell.tsx, DOCS_TODO.md, plan viejo loop-108.
- NO instalar MCPs (registry declarativo only).
- NO push/merge (human gate). NO `git add .`.
- NO operaciones wifi destructivas; connect solo con doble guarda.

## TOLERANCIAS

- Registry seed: campos stars/last_activity pueden ir null si no verificables hoy (no inventar).
- Si ruff/pyflakes no están en PATH: py_compile basta como gate Python mínimo.
- Si FULL gates rojos por WIP ajeno TSX: cuarentena byte-exacta patrón iteraciones previas.

## TEST (criterios scoped + FULL)

1. `py -3.12 scripts/genesis.test.py` → 100% PASS (manifest schema, registry schema,
   template instantiate, wifi parser con salida netsh sintética, doctor fail-soft).
2. `node_modules/.bin/vite-node.cmd scripts/genesis-run.ts --dry-run` → carga raíz genesis.json OK.
3. `npm run typecheck && lint && test && build` GREEN.
4. Commit pathspec explícito; evidencia en run-log.

## PREDICCIÓN

Todo verde en primer intento salvo flake conocido de build (.next corrupto → retry ×2
tras Remove-Item .next). genesis.test.py puede fallar si netsh no disponible → parser
testeado con fixture string, no subprocess real en tests.
