---
name: modos-operacion
description: >
  Modos de operación de UltraIa (P-P / P-B / L-T / S-D) con L-T (Learn-Test) y
  S-D (Spec-Design) integrados dentro de Piv-Plan para que Piv-Build los implemente.
  Define el contrato de cada modo: características, exigencias, funcionalidades,
  sub-fases y estrategia de verificación. Usar SIEMPRE que se planifique o ejecute
  una tarea del harness (P-P = planificar con S-D + L-T; P-B = construir y verificar
  el proyecto completo) o se necesite la herramienta autolearn_run (accion mode_plan).
user_invocable: true
---

# Modos de operación (P-P / P-B / L-T / S-D)

Mapa central: `docs/MODOS-OPERACION.md` · Fuente: `FundamentosDeLaProgramcon.txt`
(renombrado a `fundamentosdelaprogramacion.txt`) verificado iter-56; implementación
iter-75 (loop-75). Genera el plan de un modo con la tool `autolearn_run` (capability
`autolearn`, accion `mode_plan`, param `modo`) → `ModePlan` determinista.

## Mapeo de modos

| Modo | Rol | Sub-fases | Verificación |
|---|---|---|---|
| **P-P** | Piv-Plan (planificar) | Sensado → S-D (spec+design+diagrama) → L-T (learn+test) → Investigación → Razonamiento | Plan file completo + [P] en run-log + predicción |
| **P-B** | Piv-Build (construir) | Leer plan del archivo → Adicionar mejoras → Implementar → Verificar proyecto completo → Ajuste | Gates FULL en orden CI |
| **L-T** | Aprender y testear | Learn (LEARNINGS + truth + memoria) → Test (evidencia) | Evidencia de aprendizaje |
| **S-D** | Especificar y diseñar | Spec (requisitos/criterios) → Design (diseño + diagrama) | Artefactos spec/design |

## P-P (Piv-Plan) — contrato

1. **Sensado**: leer STATE.md, LEARNINGS.md, run-log, constraints; lock; git status;
   primera tarea `pendiente` en orden de archivo. Nunca inventar estado.
2. **S-D integrado**: especificación precisa + diseño + diagrama (capability `diagram`:
   timeline/data-flow/architecture/loop) ANTES de escribir el plan.
3. **L-T integrado**: LEARN = lecciones verificadas (LEARNINGS.md) + truth
   (semantic_memory) + biblioteca de fracasos + gaps de autolearn que la tarea cierra;
   TEST = estrategia de verificación explícita (casos, gates scoped, criterios).
4. **Investigación obligatoria**: búsquedas web/arXiv/GitHub/PDFs (research_search con
   fuente `pdf` + pdfsearch_search), enlaces.txt, MCP, Docker, otros lenguajes cuando
   aplique. Decisión documentada en TECNOLOGÍAS EVALUADAS del plan.
5. **Razonamiento**: escribir `.opencode/plans/loop-<taskid>-<slug>.md` (plantilla
   ampliada loop-piv: SPEC/DESIGN/LEARN/TEST/MEJORAS A ADICIONAR/TECNOLOGÍAS
   EVALUADAS) + entrada [P] en loop-run-log + PREDICCIÓN.

## P-B (Piv-Build) — contrato

1. **Leer el plan del archivo** (no del prompt) + pre-flight git status.
2. **Adicionar mejoras**: aplicar las mejoras declaradas; guardar creaciones/
   prototipos/evidencias en el repositorio propio (`vault_manage`, `.ultraia/vault/`).
3. **Implementar** con staging explícito y commit pathspec (nunca `git add .`).
4. **Verificar proyecto completo**: gates FULL en orden CI (typecheck → lint → test →
   build) con cuarentena de WIP ajeno antes; smoke si aplica.
5. **Ajuste**: LEARNINGS + biblioteca de fracasos + autolearn post-ciclo + evidencia
   en STATE.md/run-log + cierre del lock propio.

## L-T (Learn-Test) — contrato

- Learn: parsear LEARNINGS.md (parseLearnings), escanear truth verificada
  (scanTruthStats/semantic_memory), detectar gaps (detectGaps) y priorizar (RICE/META-IA).
- Test: verificar con evidencia (gates + casos) y registrar el resultado.

## S-D (Spec-Design) — contrato

- Spec: requisitos precisos (entradas/salidas/criterios de aceptación/límites/NO-hacer).
- Design: arquitectura/flujo elegido + diagrama determinista (`diagram_render`) si el
  diseño es visualizable.

## Repositorio propio (pedido usuario 20/08/2026)

- Layout: `.ultraia/vault/<kind>/` — data · files · creations · tests · prototypes · pdfs
  (index manifest.json; layout documentado en `vault.ts` VAULT_LAYOUT).
- Tools: `vault_manage` (plan/manifest/search/summary/sync/export_github) +
  `pdfsearch_search` (search/harvest de PDFs: OpenAlex keyless + DDG filetype:pdf).
- Cloud: `vaultToCloud` con CloudStorageAdapter (R2 si env, si no local); export GitHub
  opcional fail-soft (GH_TOKEN/GITHUB_TOKEN).
- Invocación para el modelo: pasar `entriesJson` con las entradas
  `[{id,kind,name,path,sizeBytes,mime,createdAt,source?,meta?}]`.

## Invocación

- Tool: `autolearn_run` con `{ accion: 'mode_plan', modo: 'P-P'|'P-B'|'L-T'|'S-D' }`
  → `ModePlan {modo, objetivo, subFases, mejoras, estrategiaVerificacion, archivosSugeridos, prediccion}`.
- Skill: cargar `loop-piv` para el protocolo completo; `ultraia-request` para requests individuales.
- Docs: `docs/MODOS-OPERACION.md` (características/exigencias/funcionalidades por modo,
  tabla comparativa, invocación).