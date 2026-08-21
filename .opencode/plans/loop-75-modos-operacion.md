# Plan loop-75 — Modos P-P/P-B con L-T y S-D integrados + Vault + PDF search

Fecha: 2026-08-20 · Modo: build (aprobado por el usuario 20/08: "Apruebo") · Patrón: bucle IA 4 fases × 3 pasadas (C1 base / C2 ajuste / C3 consolidación)
Presupuesto: ~2.5-3 h / 45-65k tokens · Prioridad: P1

## Contexto

- Fuente verificada: `FundamentosDeLaProgramcon.txt` (3310 líneas, SACD + NASA + Meta-IA) — ya analizada (iter-56) e implementada ~80% (capabilities sdf/videoqa/motion/replica/imaging/semantic_memory/autolearn, iters 56-74).
- Pedido usuario 20/08: mejorar/crear modos **P-P** (Piv-Plan) y **P-B** (Piv-Build) integrando las funciones **L-T** (Learn-Test) y **S-D** (Spec-Design) DENTRO de Piv-Plan para que Piv-Build las implemente. Cada planificación = adicionar mejoras → implementarlas → verificar el proyecto COMPLETO.
- Repositorio propio: **ambos** — local `.ultraia/vault/` + cloud (R2 si env, si no local) + export GitHub opcional fail-soft.
- Búsquedas nuevas: PDFs (OpenAlex keyless + DuckDuckGo filetype:pdf + arXiv) + webs + repositorios; integrar open-source/MCP/Docker/cloud/otros lenguajes cuando aplique.
- Estado del árbol: lock CERRADA-ITER74 libre, sin kill switch, raíz íntegra (check 6/8 OK). **90 archivos sucios = WIP ajeno** (sesión #25: automation/recorder/reach/connections/media-synthesis/blueprint/publications + gen-engine + docs varios). Mis archivos objetivo están limpios EXCEPTO `packages/core/src/index.ts` (merge ADITIVO obligatorio, precedente iter-73).

## Objetivo

Implementar el harness de **Modos de Operación**: P-P (Piv-Plan v2 con sub-fases S-D y L-T + investigación obligatoria) y P-B (Piv-Build v2: adicionar mejoras → implementar → verificar proyecto completo), más las capabilities `vault` (repositorio propio local+R2+GitHub) y `pdfsearch` (búsqueda de PDFs keyless), extensión de `autolearn` (`buildModePlan`) y `research` (source 'pdf'), y la documentación central `docs/MODOS-OPERACION.md`.

## Pasos (fases)

1. **C1-F1 `vault.ts`** (nuevo): capability `vault` — VAULT_LAYOUT (data/files/creations/tests/prototypes/pdfs), slugifyEntry, classifyVaultKind, planVaultEntry, buildVaultManifest, vaultSearch, summarizeVault, vaultToCloud (bridge CloudStorageAdapter), planVaultSync (diff determinista), GitHubVaultExporter (fetch inyectable, fail-soft sin token). ~22 tests.
2. **C1-F2 `pdfsearch.ts`** (nuevo): capability `pdfsearch` — searchOpenAlex (api.openalex.org keyless), parseOpenAlex (determinista), searchPdfWeb (DDG + filetype:pdf vía reach.searchWeb), filterPdfUrls, planPdfHarvest (→ vault/pdfs), indexPdfEntry (reusa vault), searchPdfs (orquestador merge dedupe). ~16 tests.
3. **C1-F3 `autolearn.ts` + `buildModePlan`** (+5 tests): tipo OperationalMode 'P-P'|'P-B'|'L-T'|'S-D' + ModePlan {modo, objetivo, subFases, mejoras, estrategiaVerificacion, archivosSugeridos, prediccion} — cada planificación arranca "adicionar mejoras" con datos (gaps + RICE + matriz META-IA).
4. **C1-F4 `research.ts`** source 'pdf' (+3 tests): ResearchSource + 'pdf', `researchPdf` delegando a pdfsearch, namespace ampliado.
5. **C2-F5 Wiring**: `llm.ts` (limpio): tools `vault_manage` (plan/manifest/search/sync/export_github), `pdfsearch_search` (search/harvest/index), `autolearn_run` + accion `mode_plan`. `index.ts` (SUCIO ajeno): merge ADITIVO (imports/exports/namespaces/TOOL_DESCRIPTIONS/union Capability) sin tocar bloques ajenos.
6. **C2-F6 Harness skills**: `.opencode/skills/loop-piv/SKILL.md` plantilla ampliada (secciones SPEC/DESIGN/LEARN/TEST/MEJORAS A ADICIONAR/TECNOLOGÍAS EVALUADAS) + skill nueva `.opencode/skills/modos-operacion/SKILL.md` (4 modos, cómo P-P integra S-D y L-T, cómo P-B los ejecuta) + espejo raíz `skills/modos-operacion/SKILL.md` (sync hash). opencode.json: prompts piv-plan v2 / piv-build v2 (integración S-D/L-T + vault/pdfsearch como herramientas).
7. **C3-F7 Docs**: `docs/MODOS-OPERACION.md` (mapa central: por modo → características, exigencias, funcionalidades, invocación, archivos) + `docs/RAZONAMIENTO-MODOS-OPERACION.md` (mapeo SACD/Meta-IA → modos) + AGENTS.md §Modos + LOOP.md tabla + rename `git mv`/Move-Item `FundamentosDeLaProgramcon.txt` → `fundamentosdelaprogramacion.txt` (archivo UNTRACKED → solo Move-Item) + STATE.md fila 75 DONE + run-log [R].

## ARCHIVOS A TOCAR (lista explícita)

- NUEVOS: `packages/core/src/tools/vault.ts` · `packages/core/src/tools/vault.test.ts` · `packages/core/src/tools/pdfsearch.ts` · `packages/core/src/tools/pdfsearch.test.ts` · `.opencode/skills/modos-operacion/SKILL.md` · `skills/modos-operacion/SKILL.md` · `docs/MODOS-OPERACION.md` · `docs/RAZONAMIENTO-MODOS-OPERACION.md`
- MODIFICAR: `packages/core/src/tools/autolearn.ts` (+tests) · `packages/core/src/tools/research.ts` (+tests) · `packages/core/src/ai/llm.ts` · `packages/core/src/index.ts` (merge aditivo) · `.opencode/skills/loop-piv/SKILL.md` (+ espejo `skills/loop-piv/SKILL.md` sync) · `opencode.json` · `AGENTS.md` · `LOOP.md` · `STATE.md` · `loop-run-log.md`
- RENAME: `FundamentosDeLaProgramcon.txt` → `fundamentosdelaprogramacion.txt`

## RECURSOS/PRESUPUESTO

- Tiempo: ~2.5-3 h. Tokens: 45-65k. Gates Python: no aplica (sin runners nuevos).
- Verificación scoped por fase: `npx vitest run packages/core/src/tools/vault.test.ts` etc. + `npx tsc --noEmit -p packages/core/tsconfig.json`.

## NO-hacer

- NO tocar archivos del WIP ajeno (automation/recorder/reach/connections/media-synthesis/blueprint/publications/gen-engine/enrutador/present/topics/motion.test/autolearn.py/scripts de #25 ni docs AUTOMATION-WEB/RAZONAMIENTO-{GAME-DEV,MEDIA-AUTOMATION}/INCIDENTE...). En `index.ts` solo MERGE ADITIVO (nunca reescribir bloques ajenos).
- NO `git add .` / `-A`; staging explícito + commit SIEMPRE con pathspec.
- NO borrar `.next` si la red está caída (High Priority activo: fuentes Google Fonts); si build falla por red → reportar y diferir gate build.
- NO push/merge sin aprobación humana.
- NO editar `learning/truth/*`, `.env*`, `cuentas.txt`.

## Criterios de verificación

- Scoped: vault ~22 PASS · pdfsearch ~16 PASS · autolearn +5 PASS (29/29) · research +3 PASS · tsc core 0 errores propios · espejo modos-operacion hash-idéntico (check-9 state-doctor).
- FULL (con cuarentena de WIP ajeno antes): typecheck 0 → lint 0 → test 0 (core+runtime) → build 0. Orden CI.
- Commits por fase con pathspec; STATE.md fila 75 DONE + hashes; run-log con [P]/[I]/[V]/[R] + JSON presupuesto.

## TOLERANCIAS

- Si `index.ts` ajeno cambia a mitad (sesión concurrente): pausar wiring, re-leer, merge aditivo de nuevo, nunca pisar.
- Si vitest falla raro tras editar: limpiar `node_modules/.vite` antes de diagnosticar.
- Max 3 intentos de fix por ítem; luego escalar a High Priority en STATE.md.

## Riesgos

1. **Red caída** (High Priority activo 19/08): build puede fallar por fuentes Google Fonts → diferir build, reportar.
2. **Sesión concurrente #25**: cuarentena WIP antes de gates FULL + restauración byte-exact (Get-FileHash).
3. **index.ts ajeno**: merge aditivo delicado → leer antes de tocar.
4. **Incidente raíz (0 bytes)**: pre-flight check 6/8 hecho (OK); repetir antes de cada commit.

## Predicción

- Tests: core pasa de ~1,000+ a ~1,040+ (vault 22 + pdfsearch 16 + autolearn 5 + research 3 = +46). Gates FULL verdes (salvo red caída). Build 39+ páginas sin cambios de UI. Docs nuevos 3 archivos. Commit 4 (core / wiring / harness / docs).