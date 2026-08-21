# Modos de operación de UltraIa (P-P / P-B / L-T / S-D)

> Fuente: `fundamentosdelaprogramacion.txt` (verificado iter-56) · Implementación:
> iteración 75 (loop-75, 20/08/2026) · Generador del plan por modo: tool
> `autolearn_run` (capability `autolearn`, accion `mode_plan`) → `ModePlan`
> determinista (`buildModePlan` en `packages/core/src/tools/autolearn.ts`).

Este documento es el **mapa central** que el usuario pidió al finalizar el trabajo:
dónde ver cada modo — características, exigencias, funcionalidades e invocación.

---

## Resumen ejecutivo

Los 4 modos del harness UltraIa se unifican en un solo protocolo: **P-P (Piv-Plan)
integra S-D (Spec-Design) y L-T (Learn-Test)** como sub-fases ANTES de escribir el
plan; **P-B (Piv-Build) implementa el plan (con las mejoras adicionadas) y verifica
el proyecto completo**. L-T y S-D también existen como modos independientes
(planificación de aprendizaje y de especificación).

Nuevas capacidades transversales (iter-75, pedido del usuario):
- **Repositorio propio** (local + nube + GitHub opcional): `.ultraia/vault/<kind>/`
  con tool `vault_manage`.
- **Búsqueda de PDFs**: tool `pdfsearch_search` + fuente `pdf` en `research_search`.

---

## Tabla comparativa de modos

| Modo | Rol | Sub-fases | Exigencias | Verificación | Dónde verlo |
|---|---|---|---|---|---|
| **P-P** | Planificar (Piv-Plan) | Sensado → S-D → L-T → Investigación → Razonamiento | Estado real, lock, S-D+L-T integrados, investigación obligatoria, predicción | Plan file + [P] en run-log + criterios scoped/FULL | `buildModePlan('P-P')` · `.opencode/plans/loop-*.md` |
| **P-B** | Construir (Piv-Build) | Leer plan → Adicionar mejoras → Implementar → Verificar proyecto completo → Ajuste | Plan del archivo, staging explícito, cuarentena WIP, gates FULL | Gates FULL en orden CI + commit pathspec | `buildModePlan('P-B')` · commits del repo |
| **L-T** | Aprender y testear | Learn → Test | Lecciones + truth + fracasos + gaps; evidencia | Evidencia de aprendizaje (gates/casos) | `buildModePlan('L-T')` · `learning/` |
| **S-D** | Especificar y diseñar | Spec → Design | Requisitos precisos + diseño + diagrama | Artefactos spec/design | `buildModePlan('S-D')` · secciones SPEC/DESIGN del plan |

---

## P-P (Piv-Plan) — características, exigencias y funcionalidades

**Características**: planificador del harness; integra S-D y L-T como sub-fases
(no modos separados); plantilla de plan ampliada (SPE/…/MEJORAS A ADICIONAR /
TECNOLOGÍAS EVALUADAS); produce PREDICCIÓN antes de actuar.

**Exigencias**:
1. Pre-flight de integridad (state-integrity-check checks 1/2/6/8/13) antes de confiar en STATE.md.
2. Tomar la PRIMERA tarea `pendiente` en orden de archivo; ceder si el lock está activo.
3. S-D: escribir SPEC (requisitos/criterios de aceptación/límites) + DESIGN
   (arquitectura/flujo, diagrama opcional vía capability `diagram`).
4. L-T: LEARN (LEARNINGS + truth verificada vía `semantic_memory` + biblioteca de
   fracasos + gaps de autolearn que la tarea cierra) y TEST (estrategia de
   verificación: casos, fixtures, gates scoped).
5. Investigación obligatoria: web/arXiv/GitHub/**PDFs** (`research_search` con
   fuente `pdf`, `pdfsearch_search`), `enlaces.txt`, MCP, Docker, otros lenguajes.
6. Razonamiento: plan file + `[P]` en run-log + predicción. NO edita código.

**Funcionalidades disponibles**: `autolearn_run` (mode_plan/scan/gaps/plan/metrics),
`research_search` (arxiv/web/github/**pdf**), `pdfsearch_search` (OpenAlex + DDG
filetype:pdf), `vault_manage`, `diagram_render`, `semantic_memory`.

---

## P-B (Piv-Build) — características, exigencias y funcionalidades

**Características**: constructor del harness; ejecuta el plan LEÍDO DEL ARCHIVO;
"adiciona mejoras" declaradas en el plan; persiste artefactos en el repositorio
propio; verifica el **proyecto completo** (gates FULL + cuarentena de WIP ajeno).

**Exigencias**:
1. Leer `.opencode/plans/loop-<id>-<slug>.md` (nunca el prompt) + pre-flight `git status`.
2. Adicionar mejoras: aplicar MEJORAS A ADICIONAR + guardar creaciones/pruebas/
   prototipos/PDFs en el vault (`vault_manage`; export GitHub opcional con GH_TOKEN).
3. Implementar con staging explícito (`git add <archivos del plan>`, NUNCA `.`).
4. Verificar proyecto completo: gates FULL en orden CI (typecheck → lint → test →
   build) con cuarentena de WIP ajeno antes; kill de dev servers antes de build.
5. Commit pathspec por iteración `feat|fix|chore(scope): <desc>` SOLO con gates GREEN.
6. Ajuste: LEARNINGS + fracasos + autolearn post-ciclo + evidencia en STATE.md/run-log.

**Funcionalidades disponibles**: las de P-P + `vault_manage` (sync/export_github),
adapters de cloud (`cloud.ts`) y de distribución (`publish`).

---

## L-T (Learn-Test) — características, exigencias y funcionalidades

**Características**: modo de aprendizaje y verificación; la verdad vive APARTE de
las respuestas (`learning/truth/`), se verifica (`learning/scripts/verify.py`) y se
empaqueta comprimida (`learning/memory/ultraia_memory.zip`, skill `learning-memory`).

**Exigencias**:
- Learn: parsear LEARNINGS.md (`parseLearnings`), escanear truth (`scanTruthStats`,
  `semantic_memory`), detectar gaps (`detectGaps`), priorizar (RICE simplificado +
  motor META-IA de experimentos A/B/C/D + presupuesto 70/20/10).
- Test: verificar con evidencia (gates, casos, comparación contra la verdad) y
  registrar el resultado; nunca inventar datos (API directa > búsqueda web).

**Funcionalidades**: `autolearn_run` (scan/gaps/plan/metrics/mode_plan),
`memory_search`, `learning-memory` skill, `learning/scripts/verify.py`.

---

## S-D (Spec-Design) — características, exigencias y funcionalidades

**Características**: modo de especificación y diseño; convierte intención vaga en
artefactos accionables (SPEC + DESIGN + diagrama determinista).

**Exigencias**:
- Spec: entradas/salidas, criterios de aceptación, límites, NO-hacer.
- Design: arquitectura/flujo elegido + diagrama (capability `diagram`:
  timeline/data-flow/architecture/loop, HTML/SVG autocontenido, Dark Obsidian).

**Funcionalidades**: `diagram_render`, plantillas SPEC/DESIGN del plan loop-piv,
`docs/design-dna.json` + skill `ultraia-design-system` para diseño.

---

## Repositorio propio (vault) — características

| Aspecto | Detalle |
|---|---|
| Layout | `.ultraia/vault/<kind>/` — `data` · `files` · `creations` · `tests` · `prototypes` · `pdfs` (VAULT_LAYOUT en `tools/vault.ts`) |
| Índice | `manifest.json` (version 1, conteos por kind, totalBytes, entradas) |
| Clasificación | `classifyVaultKind`: patrones test/prototype → tests/prototypes; extensiones media/datos → creations/data; `.pdf` → pdfs; resto → files |
| Cloud | `vaultToCloud` con CloudStorageAdapter (R2 si env, si no local `.ultraia/cloud`) |
| Sync | `planVaultSync`: diff determinista local vs cloud (toUpload/toRemove) |
| GitHub | `exportVaultToGitHub`: Contents API por archivo, fail-soft sin GH_TOKEN/GITHUB_TOKEN |
| Búsquedas | `pdfsearch_search` (OpenAlex keyless + DDG `filetype:pdf`) → harvest → vault/pdfs |

## Invocación rápida

```text
Tool autolearn_run: { accion: 'mode_plan', modo: 'P-P'|'P-B'|'L-T'|'S-D' }
Tool vault_manage:  { accion: 'plan'|'manifest'|'search'|'summary'|'sync'|'export_github', ... }
Tool pdfsearch_search: { accion: 'search'|'harvest', query: '<tema>', ... }
Skill modos-operacion: .opencode/skills/modos-operacion/SKILL.md (espejo skills/)
Skill loop-piv:        plantilla de plan ampliada (SPEC/DESIGN/LEARN/TEST/MEJORAS/TECNOLOGÍAS)
```

## Archivos clave

- `packages/core/src/tools/autolearn.ts` — `buildModePlan` + motor de aprendizaje.
- `packages/core/src/tools/vault.ts` + `vault.test.ts` (25 tests) — repositorio propio.
- `packages/core/src/tools/pdfsearch.ts` + `pdfsearch.test.ts` (14 tests) — búsqueda PDFs.
- `packages/core/src/tools/research.ts` — fuente `pdf` (18 tests research).
- `packages/core/src/ai/llm.ts` — tools `vault_manage` / `pdfsearch_search` / `autolearn_run(mode_plan)`.
- `packages/core/src/tools/index.ts` — capabilities `vault` / `pdfsearch` registradas.
- `.opencode/skills/loop-piv/SKILL.md` — plantilla ampliada (S-D/L-T integrados).
- `.opencode/skills/modos-operacion/SKILL.md` — este contrato como skill cargable.
- `opencode.json` — prompts `piv-plan` v2 / `piv-build` v2 (S-D + L-T + vault + investigación).