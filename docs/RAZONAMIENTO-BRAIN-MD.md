# RAZONAMIENTO-BRAIN-MD.md — memoria persistente del proyecto (patrón brain.md)

**Fecha**: 20/08/2026 · **Iteración**: 77 · **Fuente**: `learning/sources/brain-md.md`
**Origen**: websearch 20/08/2026 — repo `mindmuxai/brain.md` (Apache-2.0, ~420 stars, CLI
`@mindmux/brain-md` zero-deps; creado 2026-06-18). Verificación: [websearch] 20/08/2026.
**Estado**: IMPLEMENTADO (dominio puro `brain.ts` + 17 tests + runner `Task/brain-sync.ts`;
wiring a llm.ts/index.ts DIFERIDO por concurrencia — la sesión paralela tiene esos archivos).

## Qué es brain.md

Un protocolo + CLI para dar a un agente de IA una **memoria persistente en Markdown plano**:
el archivo `BRAIN.md` (índice navegable) + un directorio `brain/` con páginas. Cualquier modelo
puede leerlo y actualizarlo; los cambios viajan en git y sobreviven a cada sesión. El insight
central: el conocimiento de un agente no debería vivir en la conversación (efímera) ni solo en
el código (implícito), sino en un **lugar explícito, legible y versionado**.

## Principios portados (los que implementamos en `packages/core/src/tools/brain.ts`)

1. **Página = dos mitades con ciclos de vida distintos**:
   - `compiled_truth`: el entendimiento ACTUAL (reescribible ENTERO — el modelo lee lo que se
     sabe hoy, no un historial difuso).
   - `timeline`: cadena **append-only** de cómo se llegó ahí (evidencia, actualizaciones,
     reversiones). La historia nunca se edita en silencio.
2. **Correct by construction**: reescribir la verdad y anotar su entrada de timeline ocurren en
   UNA operación atómica (`updateTruth`) → no hace falta un validador de consistencia porque no
   se puede dejar el brain en un estado "verdad nueva sin rastro". Este es el principio más
   barato de implementar y el más valioso: **puro, determinista, sin deps**.
3. **Test de pertenencia**: ¿"seguirá importando en 6 meses y es difícil de reconstruir desde el
   código"? → al brain. Detalles de implementación pura → se quedan donde están. Esto evita el
   costo de mantener conocimiento que ya vive en el código.
4. **Reversiones explícitas**: si la verdad cambia de opinión, se ANOTA `reversal` con la razón;
   no se reescribe el timeline como si nunca hubiera pasado. (Para el verifier de UltraIa esto
   mapea directo: las lecciones pueden ser corregidas por evidencia nueva, nunca borradas.)
5. **6 root pages fijas** (background, architecture, flow, mindmap, stack, roadmap) + páginas
   libres — el índice es predecible para cualquier agente.

## Mapeo a UltraIa (qué implementamos y qué dejamos fuera)

| Principio brain.md | En UltraIa | Notas |
|---|---|---|
| BRAIN.md + brain/ dir | `renderBrainMarkdown` + `renderBrainPageMarkdown` | runner escribe `resultTask/brain/` |
| compiled_truth + timeline | `BrainPage {compiledTruth, timeline[]}` | exacto |
| update-truth atómico | `updateBrainTruth(page, newTruth, summary, at)` | puro, devuelve página nueva |
| append-timeline | `appendBrainTimeline` | evidencia sin tocar la verdad |
| reversión explícita | `reverseBrainTruth` (kind `reversal`) | nueva entrada, no edición |
| lint-links | `lintBrainLinks` (detecta `[[rotos]]`) | 0 links rotos en el runner real |
| test "6 meses" | `brainStats` + categoría `lesson` | el runner siembra desde LEARNINGS.md |
| CLI `brain-md` (comandos) | DIFERIDO | tool `brain_manage` cuando llm.ts se libere |

**Fuera del alcance (decidido)**: CLI real en npm, watch de archivos, validación de esquema
completa (el atómico lo hace innecesario), y la política de "qué entra al brain" como skill
(no como código — el modelo decide, el dominio garantiza la integridad).

## Runner real (`Task/brain-sync.ts`)

- `vite-node Task/brain-sync.ts` → lee `learning/LEARNINGS.md`, extrae secciones como páginas
  categoría `lesson` con timeline `[evidence] Origen: learning/LEARNINGS.md`, escribe
  `resultTask/brain/{BRAIN.md, index.json, README.md}` (idempotente).
- Verificado 20/08/2026: **10 páginas, 20 entradas de timeline, 0 links rotos**.

## Verificación

- Tests: `brain.test.ts` **17 PASS** (slugs con acentos, updateTruth atómico e idempotente,
  reversión, índice/upsert/read/list/search, lint de links, renders, stats, root pages).
- Gates FULL de la iteración: ver RAZONAMIENTO-GRAPHIFY.md (misma iteración).

## Pendiente

- **Wiring**: capability `brain_memory` → tool `brain_manage` (acciones init/read/create/update/
  list/lint) en `ai/llm.ts` + export en `tools/index.ts` — diferido (mismo patrón qdrant-memory).
- Conectar `updateBrainTruth` con el verifier (`learning/scripts/verify.py`): una lección
  corregida por evidencia nueva = `reversal` automático en el timeline.

## Lecciones

- El "correct by construction" es un principio de DISEÑO de API, no de validación: al hacer
  imposible el estado inconsistente (verdad nueva sin rastro), el código que lo consume no
  necesita comprobar nada. Barato, puro, testeable.
- Los acentos en slugs rompen la canonización: transliterar `á→a, é→e...` ANTES del regex
  (lección real del test `normaliza el id a slug`).