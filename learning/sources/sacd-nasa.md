# SACD/NASA — diseño pegado por el usuario (fuente cruda, 20/08/2026)

> Fuente: mensaje del usuario en sesión UltraIa (20/08/2026). Diseño externo generado por
> otro modelo de IA ("no puedo instalar agentes en tu SO, pero he diseñado..."). Contenido
> reproducido fielmente con fines de análisis (patrón enlaces.txt). Análisis en
> `docs/RAZONAMIENTO-SACD.md`.

## 1. Arquitectura de agentes configurada (7 super-agentes)

Consolidación de 20 roles en 7 super-agentes coordinados ("Coordinación Jerárquica").

1. **DIRECTOR EJECUTIVO (Meta-AI Arquitecta)** — cerebro ejecutivo: define objetivos,
   asigna recursos, resuelve conflictos, aprueba versiones finales. NUNCA crea contenido.
   Regla de Oro: "No modificar el núcleo directamente. Solo crear módulos nuevos auditados".
   Matriz de priorización: `Prioridad = (Impacto * Confianza * Valor Aprendizaje * Urgencia) / Costo Computacional`.
   Distribución de recursos: 70% explotación, 20% optimización, 10% exploración.
   Herramientas: orquestador (LangGraph/CrewAI), dashboard de estado global.

2. **INVESTIGADOR Y ARQUITECTO DEL SISTEMA** — aprende constantemente y diseña antes de
   construir: busca documentación, detecta nuevas herramientas (ej. nuevo modelo Flux,
   técnica NeRF), diseña pipelines de dependencias. Hoja de ruta de aprendizaje
   (Python, IA Generativa, 3D, Video). Reglas de detección de cuellos de botella.
   Herramientas: web search, analizador de papers/repos, generador de diagramas.

3. **DIRECTOR DE ARTE Y PRODUCCIÓN VISUAL (2D/3D/Video)** — garantiza coherencia estética
   (Cyberpunk, Realista, etc.) y transforma conceptos en assets finales.
   - 2D: Prompt Engineering, ControlNet, LoRA, Flux, SDXL, Composición, Color.
   - 3D: Blender, OpenUSD, Rigging, Gaussian Splatting, NeRF, Topología.
   - Video: Stable Video Diffusion, AnimateDiff, FFmpeg, lenguaje cinematográfico.
   Herramientas: APIs de ComfyUI, Blender Python API, FFmpeg.

4. **ARQUITECTO DE AUDIO Y NARRATIVA** — narrativa y capa sonora: guiones, narración,
   música y efectos con sincronización con el video. Técnicas de narración, mezcla,
   herramientas (XTTS, Bark, RVC, Suno). Herramientas: APIs de voz/audio, analizador de guiones.

5. **INGENIERO DE SOFTWARE Y IA** — construye y optimiza herramientas internas: scripts,
   automatizaciones, fine-tuning, optimización de pipelines (ej. `render_optimizer.py`).
   NO toca el núcleo en producción sin auditoría. Conocimiento: Python, Rust, Git, GitHub,
   PyTorch, TensorFlow, Hugging Face, patrones de diseño.

6. **SUPERVISOR, TESTER Y AUDITOR (QA)** — verifica coherencia visual (ej. "ojos verdes vs
   rojos"), mide estabilidad, detecta fallos, decide APROBAR/RECHAZAR módulos nuevos.
   Métricas: calidad visual, realismo, tiempo, coste, errores. Protocolos de rechazo.
   Herramientas: validación automática, comparador de hashes/imágenes.

7. **NÚCLEO DE MEMORIA Y AUTOMEJORA (NASA)** — sistema nervioso y corazón evolutivo:
   guarda experiencias (Semántica, Procedimental, Experiencial), analiza fallos, genera
   hipótesis de mejora, ejecuta el ciclo Observar → Analizar → Experimentar → Comparar → Aprender.
   Esquema de registro: `Problema → Solución aplicada → Resultado → Lección aprendida`.
   Meta-aprendizaje: "Si LoRA mejoró más que Fine-Tuning en 200 proyectos, priorizar LoRA".
   Herramientas: base vectorial (Qdrant/Chroma), grafo de conocimiento (Neo4j).

## 2. Base de conocimiento estructurada (YAML)

```yaml
sistema_autonomo_creacion_digital:
  nombre: "SACD - Núcleo Autónomo de Superación y Aprendizaje (NASA)"
  principio_fundamental: "Evolución mediante ciclos controlados. Prohibida la automodificación directa del núcleo sin auditoría."
  memoria_compartida:
    tipos:
      - semantica: "Conocimiento puro (ej: Qué es Blender, Qué es Flux)"
      - procedimental: "Cómo hacer cosas (ej: Pipeline de generación de personaje)"
      - experiencial: "Qué funcionó y qué no (ej: Método A mejoró 23%, Método B empeoró 14%)"
    tecnologia: ["Qdrant", "Neo4j", "PostgreSQL"]
  protocolo_comunicacion:
    tipo: "Event-Driven (Basado en eventos, no mensajes libres)"
    ejemplo_evento:
      evento: "modelo_3D_completado"
      payload: {"archivo": "nova.glb", "metadata": {"poligonos": 50000}}
      accion_siguiente: "Despertar a Agente Animador y Renderizador"
  matriz_priorizacion_experimentos:
    formula: "(Impacto Esperado * Confianza * Valor Aprendizaje * Urgencia) / Costo Computacional"
    niveles:
      - A: "Ejecutar inmediatamente (Impacto > 0.8, Confianza > 0.8)"
      - B: "Programar a corto plazo"
      - C: "Mantener en cola"
      - D: "Solo exploración ocasional (10% del tiempo)"
  ciclo_meta_aprendizaje:
    pasos: ["Observar", "Planificar", "Crear", "Evaluar", "Aprender", "Mejorar", "Repetir"]
    regla_estrategica_maxima: "No preguntarse '¿Qué experimento puedo hacer?', sino '¿Qué experimento tiene la mayor probabilidad de mejorar el ecosistema completo o generar nuevo conocimiento valioso al menor costo?'"
  stack_tecnologico_aprobado:
    ia_orquestacion: ["LangGraph", "CrewAI", "AutoGen"]
    modelos_base: ["Llama 3", "Qwen", "DeepSeek", "Mistral"]
    generacion_2d: ["Flux", "SDXL", "ControlNet", "ComfyUI"]
    generacion_3d: ["Blender", "OpenUSD", "Unreal Engine", "Gaussian Splatting"]
    video_audio: ["FFmpeg", "MoviePy", "Stable Video Diffusion", "XTTS", "RVC"]
    backend: ["Python", "FastAPI", "Rust"]
```

## 3. Ejemplo de implementación (CrewAI)

Esqueleto con `crewai`, `langchain-openai`, `qdrant-client`. LLM configurable
(`ChatOpenAI(model_name="qwen-2.5-72b", base_url=...)`). 4 agentes: director (manager,
`allow_delegation=True`, Process.hierarchical), investigador, artista_3d, agente_mejora.
Tareas: planificación de pipeline (JSON con pasos y herramientas) y evaluación de mejora
(reporte Problema/Solución/Resultado esperado/Lección para la Memoria Experiencial).
`Crew(agents=[...], tasks=[...], process=Process.hierarchical, manager_agent=director)`.

## 4. Hoja de ruta de implementación (del diseño)

1. Infraestructura de memoria (Día 1-3): Qdrant (Docker) + Neo4j.
2. Orquestador (Día 4-7): Python + CrewAI o LangGraph (LangGraph superior para bucles
   de automejora y retroalimentación).
3. Primer agente funcional (Semana 2): trío Investigador → Programador → Evaluador;
   optimizar un script de FFmpeg, evaluarlo y guardar la métrica en Qdrant.
4. Integración de herramientas (Mes 1-2): ComfyUI (2D) y Blender (3D) como tools.

## 5. Guía técnica por pasos (del diseño)

### Paso 1: Infraestructura de memoria (Docker)
`docker-compose.yml`:
- `qdrant/qdrant:latest` — puertos 6333 (REST) y 6334 (gRPC), volumen `./qdrant_storage:/qdrant/storage`.
- `neo4j:5.15` — puertos 7474 (web) y 7687 (Bolt), `NEO4J_AUTH=neo4j/sacd_password_2026`,
  plugin `apoc`, volumen `./neo4j_data:/data`.
- Verificación: http://localhost:6333/dashboard y http://localhost:7474.

### Paso 2: Entorno Python + orquestador
`python -m venv venv`; `pip install langgraph langchain-openai langchain-qdrant neo4j requests pydantic`.
`.env`: `OPENAI_API_KEY`, `OPENAI_API_BASE`, `LLM_MODEL` (gpt-4o / qwen-2.5-72b / deepseek-chat).

### Paso 3: Triángulo de oro (`nucleo_nasa.py`)
- `AgentState` (TypedDict): objetivo, plan_investigacion, codigo_generado, metricas_evaluacion, leccion_aprendida.
- Nodos: `investigador` (similarity_search en Qdrant "memoria_experiencial" k=2 → plan),
  `programador` (escribe script Python), `evaluador` (puntúa calidad/eficiencia/errores,
  guarda lección en Qdrant con `vector_store.add_documents`).
- Grafo: `StateGraph(AgentState)`; investigador → programador → evaluador → END.
  Nota del diseño: en el futuro un condicional "si score < 80 volver a investigador".

### Paso 4: Integración de herramientas externas
- **ComfyUI**: `POST http://127.0.0.1:8188/prompt` con workflow JSON exportado; nodo de
  texto modificado dinámicamente; polling del resultado por prompt_id.
- **Blender**: generar `script_blender.py` (bpy) y ejecutar `blender -b -P script_blender.py`.

### Paso 5: Ciclo de automejora
El nodo investigador consulta `similarity_search("mejorar eficiencia render video", k=3)`
antes de planificar: "diseña un plan que EVITE los errores pasados y aplique las soluciones
que dieron >80 de eficiencia". Meta-aprendizaje: el sistema deduce mejoras de su propio
historial de éxitos y fracasos, sin instrucción humana.