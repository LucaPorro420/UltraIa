# PLAN iter-79 — Recuperacion real: corpus visible + embedding denso que discrimina

Fecha: 2026-08-20 · Modo: **P-B (Piv-Build) con S-D y L-T integrados** · Prioridad: P1
Patron: panel multiagente (3 lentes de diseno + 3 jueces adversariales + sintesis) -> medicion
empirica sobre el corpus REAL -> implementacion -> gates FULL.

## Contexto (Sensado)

- Lock retomado `r79-UTEC-5695-20260820-COWORK` (iter-78 cerrada: commits `06b50f5` + `0ba4f71` + `516a986`).
- Pendiente declarado en `docs/RAZONAMIENTO-QDRANT-MEMORY.md`: "embeddings reales (el vector denso
  dim 4 es suficiente para 50 docs, no para miles)".
- **Esa afirmacion es FALSA y esta medida**: dim-4 ya falla HOY, con 54 docs.

## L-T (Learn-Test) — medicion ANTES de tocar nada

Harness de evaluacion sin etiquetas manuales (leave-one-out sobre `learning/truth/*.json`):
query = `texto` / `respuesta` / `texto mutado` (dropout 50% determinista, seed 42); gold = el id
del propio doc; metricas recall@1, recall@5, MRR.

### Hallazgo 1 (P0, no estaba en el pendiente): 38 de 54 docs eran INVISIBLES

`loadTruthCorpus` construia el texto buscable como `c.prompt`, y con `prompt` ausente producia el
literal `'""'` (`JSON.stringify(undefined ?? '')`), que tokeniza a CERO terminos -> vector nulo ->
score 0 contra cualquier query. Inventario real:

| archivo | casos | con prompt |
|---|---|---|
| truth_math / truth_gstack / truth_live | 16 | 16 |
| truth_ai_gen_resources / truth_content_tools / truth_tecno_recursos / truth_web_browse_repos / **truth_ultraia_capabilities** | 38 | **0** |

Los 38 usan el formato "verdad verificada" (`note` + `usage` + `source` + `verified`), que es como
se escriben las lecciones de capabilities desde el 14/08 — incluidos los 5 casos que la propia
iter-77 anadio. Es decir: la memoria semantica del agente no podia recuperar NADA de lo que el
proyecto sabe hacer.

### Hallazgo 2: el vector dim-4 no discrimina

`embedDense4` colapsa todo el vocabulario en 4 dimensiones NO NEGATIVAS (`buckets[h % 4]`): dos
vectores no negativos en R^4 estan casi siempre a angulo pequeno.

Medicion (1431 pares del corpus): **coseno medio 0.9055**, p50 0.9513, max 0.9999.

### Baseline medido (corpus ya reparado, misma corrida)

| modo de query | esparcido (searchTruth) | denso dim-4 (lo que guarda Qdrant) |
|---|---|---|
| texto | recall@1 **1.000** · MRR 1.000 | recall@1 0.685 · MRR 0.793 |
| respuesta | recall@1 **0.852** · MRR 0.877 | recall@1 **0.093** · MRR 0.291 |
| mutada | recall@1 **0.963** · MRR 0.981 | recall@1 0.185 · MRR 0.339 |

Traduccion: la memoria EN-PROCESO es casi perfecta y la memoria PERSISTENTE devuelve ruido.

## SPEC (que debe cumplir la solucion)

1. `loadTruthCorpus` debe indexar los 54 casos, con y sin `prompt` (retrocompatible).
2. El embedding persistido debe acercarse al esparcido: criterio de aceptacion
   **recall@1 >= 0.95 / 0.80 / 0.91** (texto / respuesta / mutada) y coseno medio entre pares
   distintos **<= 0.35**.
3. CERO dependencias nuevas, TypeScript estricto, funciones puras, determinismo entre procesos
   (hay un consumidor Python: `sacd_system/nucleo_nasa.py` escribe en la misma coleccion).
4. No romper ninguno de los 1276 tests ni los 29 que asertan dim 4.
5. Migracion de la coleccion Qdrant explicita (Qdrant NO permite cambiar `size` in-place) + rollback.

## S-D (Spec-Design) — panel multiagente

3 disenos independientes (lente IR/matematica · lente ingenieria/sistemas · lente adversarial/compat),
cada uno juzgado por 3 jueces adversariales (matematico · implementador · compatibilidad) con
consigna de REFUTAR, y sintesis final a spec implementable. Resultado y decision: seccion
"DECISION DEL PANEL" al final de este archivo.

## Archivos a tocar (staging EXPLICITO)

- `packages/core/src/tools/semantic-memory.ts` (+ `caseSearchText`, `CASE_TEXT_FIELDS`)
- `packages/core/src/tools/semantic-memory.test.ts` (+4 tests: prompt / composicion / vacio / regresion)
- `packages/core/src/tools/qdrant-memory.ts` (+ embedding denso nuevo, dimension y coleccion versionadas)
- `packages/core/src/tools/qdrant-memory.test.ts` (+ tests del embedding nuevo)
- `packages/core/src/tools/qdrant-memory.wiring.test.ts` (ajuste si cambia la superficie publica)
- `Task/bench-embeddings.ts` (harness de evaluacion, promovido desde el scratch)
- `docs/RAZONAMIENTO-QDRANT-MEMORY.md` · `STATE.md` · `loop-run-log.md` · `learning/LEARNINGS.md`

## NO-hacer

- NO tocar brain.ts / knowledge-graph.ts / recorder / automation / media-synthesis / `Task/*tomasporro*`
  (sesion #25), ni el index con ~78 archivos staged por VS Code.
- NO `git add .` / `-A`; commit SIEMPRE con pathspec.
- NO anadir dependencias (nada de onnxruntime/transformers/APIs de embeddings).
- NO borrar ni recrear la coleccion `memoria_experiencial` existente sin plan de rollback (la usa
  tambien `nucleo_nasa.py`).

## Criterios de verificacion

- Scoped: semantic-memory + qdrant-memory + wiring PASS; tsc core 0.
- Benchmark: el metodo nuevo supera el criterio de aceptacion de la SPEC (numeros en el run-log).
- FULL en orden CI: typecheck -> lint -> test -> build.
- Commit con pathspec + STATE.md fila 79 + run-log [P]/[I]/[V]/[R] + LEARNINGS.

## Prediccion

- Corpus indexable 16 -> 54 docs (medido: hecho).
- Embedding nuevo: coseno medio entre pares de 0.9055 a <0.35; recall@1 modo respuesta de 0.093 a >0.80.
- Tests: +4 (loader, ya PASS) +N del embedding; suite total 1276 -> ~1285.
- Riesgo principal: la coleccion Qdrant de dim 4 obliga a versionar (`memoria_experiencial_v2`);
  el consumidor Python sigue apuntando a la v1 hasta que se migre a mano.
