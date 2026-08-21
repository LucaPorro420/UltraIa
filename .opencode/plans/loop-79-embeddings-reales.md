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

---

## DECISION DEL PANEL (S-D) + verificacion empirica

**Modo de trabajo**: panel multiagente (3 lentes de diseno independientes + 3 jueces adversariales
por propuesta + sintesis). **Resultado real**: 1 de 7 agentes completo (lente IR/matematica); los 6
restantes abortaron por limite de sesion del proveedor. NO se maquilla: la decision final se tomo
con ese diseno + la medicion empirica propia sobre el corpus real, que es la que manda.

**Convergencia independiente** (el diseno del panel y la medicion llegaron a lo mismo):

- **Metodo**: feature hashing CON SIGNO (Weinberger et al. 2009 / Count-Sketch de Charikar) sobre
  el mismo `HashBag` que ya produce `embedText`. El signo hace que las colisiones se cancelen en
  esperanza -> el producto interno denso es estimador INSESGADO del esparcido.
- **Dimension 1024**, y por tres caminos distintos:
  1. *JL*: `d >= 8 ln(n)/eps^2` -> n=54 con eps~0.18; n=10.000 con eps~0.27. (JL es peor caso sobre
     TODAS las distancias; el ranking solo necesita orden en la cola superior -> eps=0.1 seria
     sobreingenieria.)
  2. *Margen*: `d > c^2 (sqrt(2 ln n) + z)^2 / Delta^2` con c=1.35, z=1.28 y margen real medido
     Delta=0.235 -> n=10.000 exige d>1025. 1024 es justo el punto que cubre 10k docs al 90%.
  3. *Medicion*: la curva de recall satura entre 512 y 1024; 2048/4096 no compran recall
     proporcional al coste (4 KB/punto en float32 -> ~48 MB con HNSW y payload a 10.000 docs).
- **Arquitectura HIBRIDA en dos etapas** (la parte que evita pagar dimension gigante): Qdrant/HNSW
  como generador de candidatos + **rescoring con el coseno esparcido exacto** sobre el payload.
- Detalle de implementacion adoptado del panel: con `dim` potencia de 2, indexar por `h & (dim-1)`
  en vez de `h % dim` — identico para enteros positivos, sin ambiguedad de signo al portarlo a
  Python y sin division.

### Resultados medidos (`Task/bench-embeddings.ts`, corpus real 54 docs)

Coseno medio entre pares distintos: **0.9055 (dim-4) -> 0.032 (dim-1024)**.

| modo de query | esparcido (ref) | denso dim-4 (v1) | denso dim-1024 (v2) | hibrido (lo que corre) |
|---|---|---|---|---|
| texto | 1.000 | 0.685 | 1.000 | **1.000** |
| respuesta | 0.958 | **0.104** | 0.958 | **0.958** |
| mutada | 0.963 | 0.185 | 0.963 | **0.963** |
| corta-3 tokens | 0.889 | 0.093 | 0.889 | **0.889** (MRR 0.941 = ref) |
| corta-5 tokens | 0.980 | 0.078 | 0.980 | **0.980** |

(recall@1; n = 48-54 queries por celda). El hibrido iguala a la referencia en TODAS las metricas,
incluido recall@5 en queries de 3 tokens (1.000 vs 0.963 del denso puro).

### Verificacion end-to-end contra el Qdrant real

Coleccion `memoria_experiencial_v2` recreada con `size=1024` y sincronizada (54 puntos).

- `--search "como genero narracion de voz en varios idiomas"` -> top-1 `ultraia_audio_edgetts`
  (antes del cambio: "Convierte 100 grados Celsius a Fahrenheit" — ruido puro).
- `--search "area del circulo"` -> top-1 "Calcula el area de un circulo de radio 7 -> 153.94" (0.480).

### Criterio de aceptacion de la SPEC

- recall@1 >= 0.95 / 0.80 / 0.91 -> obtenido **1.000 / 0.958 / 0.963**. CUMPLE.
- coseno medio entre pares <= 0.35 -> obtenido **0.032**. CUMPLE.
- 0 dependencias nuevas, determinista, sin romper la suite. CUMPLE.
