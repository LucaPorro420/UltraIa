# GRAPH_REPORT.md - grafo de conocimiento

- Nodos: 173 (paper: 119, doc: 51, concept: 3)
- Edges: 1452 (INFERRED: 1449, AMBIGUOUS: 3)
- Comunidades: 9

## God nodes (mayor grado)

1. **sources** (grado 127)
2. **instagram** (grado 56)
3. **readme** (grado 55)
4. **estado** (grado 51)
5. **líneas** (grado 51)
6. **pegado** (grado 51)
7. **gratis** (grado 48)
8. **local** (grado 48)

## Comunidades

1. **chatgpt** (66 nodos): 6a84c8a2, acciones, agentes, aplicación, aplicado, automation, ...
2. **cloud** (28 nodos): abacus, aplicada, autor, autorización, cloud, commit, ...
3. **example** (22 nodos): 387k, adiciona, apis, curl, datos, example, ...
4. **agents** (19 nodos): 148k, agent, agents, architecture, cómo, conversation, ...
5. **autoaprendizaje** (11 nodos): agente, autoaprendizaje, autolearn, cada, completo, core, ...
6. **chiro** (9 nodos): 140k, chiro, dcjdsghijne, elemental, menteprompt, repo, ...
7. **jina** (8 nodos): cppgjxpe, jina, kage, l821, reel, scroll, ...
8. **higgsfield** (7 nodos): davinci, gratuito, higgsfield, plugin, resolve, studioeditionoficial, ...
9. **center** (3 nodos): align, center, width

## Conexiones sorprendentes

- `links` <-> `name` [AMBIGUOUS] (score 1) - Conecta concept con paper (distintos dominios) con peso 1
- `name` <-> `spain-trip` [AMBIGUOUS] (score 1) - Conecta paper con concept (distintos dominios) con peso 1
- `partner` <-> `spain-trip` [AMBIGUOUS] (score 1) - Edge ambiguous dentro de concept, peso 1
- `readme` <-> `sources` [INFERRED] (score 0.02) - Conecta paper con doc (distintos dominios) con peso 4
- `apis` <-> `gratis` [INFERRED] (score 0.01) - Conecta doc con paper (distintos dominios) con peso 3

## Preguntas sugeridas

1. Que conecta "sources" con "instagram" en el grafo?
2. Por que "readme" es un nodo central? Que dependencias lo alimentan?
3. Como se relaciona la comunidad "6a84c8a2" con "abacus"?
4. Cuales son los edges INFERRED con mayor peso (candidatos a verificar como EXTRACTED)?
