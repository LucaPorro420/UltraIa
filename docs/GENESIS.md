# GENESIS v0.1 — Autonomous Engineering Layer (UltraIa)

> **Fuente**: `InfoPeticion.txt` (26/08/2026) — visión "Genesis Autonomous Engineering"
> + Fase 0.5 "Infrastructure Discovery & Zero-Cost Integration".
> **Plan**: `.opencode/plans/loop-117-genesis-v01-operador.md` · **Motor commiteado**: `d4640e6→bd5a967`.

## 0) Principio rector

Genesis **NO es un sistema paralelo**. Es la capa federada que une lo que ya existe:

```
REUTILIZAR → si existe y funciona
ADAPTAR    → si existe pero es insuficiente (port ORIGINAL de principios, nunca código)
CREAR      → solo si no hay alternativa local/open-source/gratuita
PAGAR      → último recurso, SIEMPRE con aprobación humana
```

Cada proyecto futuro (terra-viva, mmorpg-ai…) = un `genesis/projects/<slug>/genesis.json`
sobre ESTE mismo ecosistema. Se instancia con:

```bash
py -3.12 scripts/genesis.py project new <slug>
```

## 1) Contrato operativo (`genesis.json` raíz)

Manifiesto ejecutable que REFERENCIA los sistemas vivos sin reemplazarlos:
objetivo/criterios de éxito · pipeline (12 pasos = ciclo PIVR ampliado) · quality gates ·
autonomía (nivel, repair_attempts=3, max_iterations, stop_when) · mapa de agentes ·
skills núcleo · política MCP · memoria (3 niveles) · reglas de seguridad · recuperación ·
aprendizaje · versionado · condiciones de finalización.

Validación: `py -3.12 scripts/genesis.py manifest` (schema en `packages/core/src/tools/genesis.ts`).
Resolución en el runner: `--manifest <ruta>` > **raíz `genesis.json`** > legacy `.ultraia/genesis/manifest.json`.

## 2) Mapa Genesis → UltraIa (auditoría Fase 0.5, evidencia commiteada)

| Concepto Genesis | Implementación REAL | Evidencia |
|---|---|---|
| Autonomous Loop OBSERVE→…→REPEAT | Loop PIVR completo (`piv-plan`/`piv-build`/`loop-triage`/`state-doctor` + driver `scripts/loop_piv.py`) | opencode.json; AGENTS.md §Loop PIVR |
| Director | agente `piv-plan` (read-only: decide qué/quién/cómo se verifica) | opencode.json |
| Coder | agente `piv-build` (gates FULL antes de commit, pathspec) | opencode.json |
| Tester / Verify | gates CI `typecheck→lint→test→build` + suites `*.test.py` standalone + subagent `verifier` | package.json; STATE.md evidencia |
| Reviewer | `loop-verifier` skill + gstack `review` | .opencode/skills |
| Researcher | `research_search` (+fuente pdf), `pdfsearch_search`, tools `reach_*` (r.jina.ai/DDG/Exa/GitHub/RSS/oEmbed) | packages/core/src/tools/reach.ts |
| Security | skill `gstack-cso` (OWASP Top 10 + STRIDE + supply chain) | skills globales |
| Debugger | skill `gstack-investigate` (Iron Law: no fix sin root cause) | skills globales |
| Documentation | skill `explain-code` + hook post-commit `[doc-reminder]` + DOCS_TODO.md | .githooks |
| Release | gstack `ship`/`land-and-deploy` (push/merge SIEMPRE humano) | skills globales |
| Scheduler local | schtasks `UltraIa-Cerebro` cada 120 min (`scripts/cerebro-schedule.ps1`) | verificado e2e 24/08 |
| Scheduler cloud | `.github/workflows/cerebro.yml` cron 4h ($0, corre con PC apagado) | .github/workflows |
| Memory corto plazo | lock `.ultraia/loop/session.lock` + plan files + `.ultraia/genesis/state.json` | runtime |
| Memory proyecto | `learning/LEARNINGS.md` + `STATE.md` + `loop-run-log.md` + truth separada de respuestas | learning/ |
| Knowledge base | `learning/sources/` + `docs/RAZONAMIENTO-*.md` + research-registry (§3) + qdrant `memoria_experiencial_v2` | repo |
| Semantic memory | `@ultraia/runtime` MemoryManager (dedup sha256, half-life 7d) + capability `memory` | packages/runtime |
| Self-healing | RED→máx 3 fixes→escalar High Priority; cuarentena WIP byte-exacta; `restore-empty-tracked.ps1` | loop-constraints |
| WiFi keepalive | capability `netwatch` (SENSE/DECIDE/ACT/AUDIT, dominio puro + fixtures) + `scripts/genesis.py wifi` | iter-112 |

## 3) Research Registry (`genesis/research-registry.json`)

Registro estructurado de TODO repo externo estudiado — nunca reinvestigar lo mismo.
Schema por entrada: `repository/url/license/stars/last_activity/architecture/
useful_components/integration_difficulty/security_risk/decision/reason/evidence[]`.
Regla anti-inventario: `stars`/`last_activity` = `null` si no se verificaron (NUNCA inventar);
toda entrada exige evidence commiteada (`learning/sources/*` o `docs/RAZONAMIENTO-*`).

**Estado**: 14 entradas sembradas — decisión: 9 adapt · 4 study · 1 reject (Titus archivado).

```bash
py -3.12 scripts/genesis.py registry validate          # esquema + conteo por decisión
py -3.12 scripts/genesis.py registry add --file E.json # insertar entrada validada
```

## 4) MCP registry (política selectiva)

Veredicto auditoría: **0 MCPs nuevos requeridos en v0.1.**

| Necesidad | Cobertura nativa existente |
|---|---|
| web search/fetch | tools `websearch`/`webfetch` + `reach_*` (DDG, r.jina.ai, Exa opcional) |
| GitHub (issues/PR/code search) | CLI `gh` + `exportVaultToGitHub` (Contents API) |
| filesystem | herramientas de workspace nativas |
| SQLite/Postgres | Prisma directo (`packages/core`) |

Instalar un MCP solo si aporta una capacidad que NO exista localmente; registrar aquí
la evaluación (utilidad/riesgo/coste/permisos/alternativa local) ANTES de instalar.

## 5) Consola operador (`scripts/genesis.py`, stdlib puro)

```bash
py -3.12 scripts/genesis.py manifest              # valida el contrato raíz contra el schema core
py -3.12 scripts/genesis.py doctor                # kill switch + lock + git + prereqs + wifi + estado
py -3.12 scripts/genesis.py inspect               # snapshot: capabilities/skills/backlog pendiente
py -3.12 scripts/genesis.py gates                 # typecheck→lint→test→build (delega npm)
py -3.12 scripts/genesis.py run [--cycles N]      # ciclos PIVR (delega scripts/loop_piv.py)
py -3.12 scripts/genesis.py triage                # triage diario (delega --triage)
py -3.12 scripts/genesis.py registry validate|add # research registry
py -3.12 scripts/genesis.py project new <slug>    # instancia multi-proyecto desde template
py -3.12 scripts/genesis.py wifi status           # netsh read-only (siempre seguro)
py -3.12 scripts/genesis.py wifi ensure --ensure  # connect SOLO con flag + GENESIS_WIFI_SSID
```

La consola **nunca reimplementa** el motor: envuelve `packages/core/tools/genesis*.ts`
(vía `npm run genesis` = `scripts/genesis-run.ts`) y el harness PIVR.

### WiFi — guardas estrictas (experimental, pedido InfoPeticion.txt L1)

- `status`: solo parse de `netsh wlan show interfaces`. Read-only, sin riesgos.
- `ensure`: requiere AMBAS condiciones (flag `--ensure` explícito Y env `GENESIS_WIFI_SSID`);
  ejecuta únicamente `netsh wlan connect name=<ssid>`. NUNCA disconnect ni cambios de adapter.
  Fuera del bucle automático: operación humana/explícita solamente.
- Dominio auditable completo en capability `netwatch` (`parseWlanInterfaces`,
  `decideNetAction` con anti-thrash, `auditEntry` NDJSON; runner `Task/netwatch-run.ts`).

## 6) Motor autónomo

```bash
npm run genesis                                    # ciclo con gates REALES (vite-node scripts/genesis-run.ts)
node_modules/.bin/vite-node.cmd scripts/genesis-run.ts --propose   # solo propuesta
node_modules/.bin/vite-node.cmd scripts/genesis-run.ts --dry-run   # sin gates
```

Cada ciclo: detectGaps (autolearn sobre LEARNINGS/STATE/sources/RAZONAMIENTO reales) →
runGenesisCycle (acción validada + prioridad) → gates npm reales → persiste
`.ultraia/genesis/state.json` → reevalúa → STOP según manifiesto (max_iterations,
repair budget, aprobación). Verificado 26/08: 21 gaps detectados, propuesta generada.

## 7) Kill switch & detectores (lección L2294)

El token `loop-pause-all` SOLO cuenta como orden de pausa cuando su contexto no es prosa.
Ambos detectores (`scripts/loop_piv.py::kill_switch_active` y `scripts/genesis.py`)
comparten semántica idéntica: ventana de 24 chars previos + negaciones
(sin/without/ausente/no activo) + marcadores de mención-meta (mencione/ocurrencia/
falso positivo/matches). La ventana NO se amplió a 48 porque ensombrece una orden
real en la misma línea (regresión cubierta por test). Suites: `genesis.test.py` 29 PASS,
`loop_piv_doctor.test.py` 11 PASS.

## 8) Roadmap restante (backlog)

1. `routeResource(capacidad)` determinista sobre registry+costes (Resource Router del pedido) — capability core.
2. Analytics de coste `$0` continuos (`genesis/costs.json` auto-actualizado por triage).
3. Conectar `/cloud` ↔ registry (artefactos de investigación versionados en R2 gratis).
4. Multi-proyecto real: primer proyecto externo instanciado desde template (decisión usuario).

## 9) Consola operador + contrato raiz (iteracion 117, genesis-v01-operador)

- Contrato canonico en raiz: `genesis.json` (workflow PIVR mapeado, agentes
  opencode.json, memoria 3 niveles, MCP registry selectivo CERO installs,
  stop conditions, reglas seguridad = loop-constraints).
- `scripts/genesis.py` consola: manifest|doctor|inspect|gates|run|triage|
  registry validate/add|project new|wifi status/ensure (doble guarda
  `--ensure` + `GENESIS_WIFI_SSID`; nunca disconnect). pyflakes 0.
- Suite standalone: `py -3.12 scripts/genesis.test.py` -> 27/27 PASS
  (manifest schema, registry 14 entradas validas, wifi parser EN/ES fixture,
  kill switch negaciones L1959/L2294, project e2e tempdir).
- `genesis/research-registry.json`: 14 repos con decision adapt(9)/study(4)/
  reject(1) + evidence commiteada. `genesis/projects/_TEMPLATE` + README.
- genesis-run.ts prefiere raiz `genesis.json` (--manifest > raiz > legacy);
  verificado: carga contrato y detecta 21 gaps reales (dry-run max-iter 1).
- Doctor real: kill switch inactive, lock cerrado detectado via utf-8-sig
  (BOM de PowerShell), wlan Norma-2.4 estado "No disponible" parseado en ES.
