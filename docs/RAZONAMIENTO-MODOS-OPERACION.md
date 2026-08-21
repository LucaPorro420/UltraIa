# RAZONAMIENTO — Modos de operación (P-P/P-B/L-T/S-D) + Vault + PDF search

> Fuente: `fundamentosdelaprogramacion.txt` (renombrado desde
> `FundamentosDeLaProgramcon.txt`, 47.4 KB, 3310 líneas, untracked — verificado
> iter-56: roadmap SACD/NASA + Meta-IA; ~80% ya implementado en iter-56..74).
> Pedido del usuario (20/08/2026): verificar el archivo, mejorar los modos
> P-P/P-B/L-T/S-D integrando las nuevas adiciones, búsquedas de PDFs/webs/
> repositorios, crear un repositorio propio (local/nube) para datos, archivos,
> creaciones, pruebas y prototipos; cada planificación = adicionar mejoras →
> implementar → verificar el proyecto completo; al final indicar dónde ver cada modo.
> Implementación: iter-75 (loop-75, 20/08/2026).

## Análisis

1. **Los modos P-P/P-B/L-T/S-D NO existían como código** en el repo (grep verificado).
   Existían: `piv-plan`, `piv-build`, `loop-triage`, `state-doctor` (harness PIVR).
   → Se implementó `OperationalMode` + `buildModePlan` en autolearn.ts (dominio puro
   determinista, keyless) con el contrato completo de cada modo.

2. **Decisión de mapeo (usuario)**: P-P = Piv-Plan, P-B = Piv-Build; L-T y S-D se
   INTEGRAN como sub-fases dentro de P-P (S-D: spec+design+diagrama antes del plan;
   L-T: learn de verdad verificada + estrategia de test explícita), y P-B las
   implementa. L-T y S-D también existen como modos planificables independientes.

3. **Repositorio propio = AMBOS (decisión usuario)**: local `.ultraia/vault/` +
   nube (R2 si env, si no local) + export GitHub opcional fail-soft. Se implementó
   el dominio puro `vault.ts` reutilizando `CloudStorageAdapter`/`sanitizeFileName`/
   `MIME_BY_EXT` de cloud.ts (precedente iter-30: CloudService sin targetPath no
   clasifica → aquí la clasificación vive en `classifyVaultKind`).

4. **Búsqueda de PDFs**: OpenAlex keyless (`/works?search=&filter=has_oa_location:true`)
   + DuckDuckGo `filetype:pdf` (delegado a reach.searchWeb) + harvest a vault/pdfs.
   Sin claves, fail-soft en errores de red (patrón research.ts).

## Mapeo implementado → pedido

| Pedido | Implementación | Archivos |
|---|---|---|
| Mejorar modos P-P/P-B integrando adiciones | `buildModePlan` + plantilla loop-piv ampliada (SPEC/DESIGN/LEARN/TEST/MEJORAS A ADICIONAR/TECNOLOGÍAS EVALUADAS) + prompts piv-plan/piv-build v2 | autolearn.ts · loop-piv/SKILL.md · opencode.json |
| Búsquedas de PDFs | `searchOpenAlex` + `searchPdfWeb` + `searchPdfs` + tool `pdfsearch_search` | pdfsearch.ts |
| Búsquedas web/repos ya existentes | fuente `pdf` añadida a `research_search` | research.ts |
| Repositorio propio (local + nube + GitHub) | `vault.ts` (layout 6 kinds, manifest, search, summary, vaultToCloud, planVaultSync, GitHubVaultExporter) + tool `vault_manage` | vault.ts |
| Dónde ver cada modo | `docs/MODOS-OPERACION.md` (mapa central) + skill `modos-operacion` | docs · skills |

## Lecciones

- **Los métodos de clase no son propiedades enumerables**: `{...adapter}` pierde
  list/read/remove/stat/write (viven en el prototipo) → el test de fail-soft rompía
  con TS2345. Solución: bind explícito de cada método.
- **`vi.mock('./reach')` no cubrió el import dinámico** `await import('./pdfsearch')`
  en research.test.ts (resultados reales de red → timeout 5s). Solución: inyección
  explícita (`searchWebImpl`) en `ResearchSearchOptions` — más robusto y testeable.
- **Un único `fetchImpl` compartido entre fuentes debe conmutar por URL** (arxiv →
  Atom XML, OpenAlex → JSON); si no, la segunda fuente parsea el fixture equivocado.
- **TS2783**: `{ ok: true, ...plan }` con `plan.ok` duplicado → ordenar
  `{ accion, ...plan }` (el spread ya aporta ok).
- **Prioridad de clasificación**: los patrones de propósito (test/prototype/fixture)
  ganan a la extensión (fixture-1.json → tests, no data).
- **Base64 de `[4,5]` es `BAU=`** (0x04 0x05), no `BQU=` (fallo real del test).
- **Acentos importan en los tests**: 'Investigación' ≠ 'Investigacion' en el
  comparador toEqual.

## Pendiente (Watch List)

- Conectar el vault con la cola `Publication` (subir paquete publicado → media/videos)
  y con `video_edit` (EDL/renders → exports/edl) — mismo patrón que cloud loop-25.
- Adapters de cloud R2 reales en runtime (hoy: dominio puro + tests con memoria).
- `scripts/autolearn.py` (WIP ajeno) — coordinar con la sesión concurrente #25.