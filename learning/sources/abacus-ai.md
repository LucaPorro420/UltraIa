# Abacus.AI — fuente cruda (enlaces.txt)

> Descargado 17/08/2026 desde https://abacus.ai/ (webfetch → markdown; el HTML crudo era
> 480KB, se guarda esta versión compacta). Producto: "super asistente" para profesionales
> y empresas — ChatLLM, Abacus AI Agent, SuperComputer, Enterprise, Studio, RouteLLM API.

## Qué es

Plataforma todo-en-uno: ChatLLM (asistente multi-modelo: Opus 5, Fable 5, GPT-5.6, Gemini
3.1 Pro, Sonnet 5, Grok 4.6, Veo 3.1, Seedance 2.5...), Abacus AI Agent (agente general con
browser, código, data analysis, PowerPoint, audio/video), Swarm Lite (agentes en paralelo),
Autobots (agentes auto-mejorables), apps/APIs (RAG chatbots, invoice processing, sentiment,
trading...).

## Patrones clave (relevantes a UltraIa)

1. **Self-improving agents ("Autobots")**: agentes que aprenden de resultados y mejoran con
   cada ejecución — "finding and fixing bugs autonomously and getting better with every run",
   "self-learning trading agent that adapts its strategy based on what works".
2. **Adaptive Twitter Engine**: aprende tu estilo de X, analiza el performance de tus tweets,
   investiga trending topics, genera contenido optimizado y MEJORA basado en engagement —
   estrategia de redes con database-driven insights.
3. **Autonomous YouTube Influencer Agent**: convierte tu biblioteca de videos en un growth
   lab — testea UNA variable a la vez (thumbnail/metadata), compone cada victoria en un
   playbook específico del canal ("compounding every win into a channel-specific playbook").
4. **Self-Improving YouTube Optimizer**: trackea métricas reales a lo largo del tiempo y
   refina su enfoque en cada ejecución.
5. **Swarm Lite**: agentes en paralelo para review de PRs, análisis de reviews de apps,
   investigación de equity, QA multi-rol — descomposición de trabajo independiente.
6. **Triggers webhook / scheduled workflows**: tareas event-driven (PR analysis, invoice
   generation, price watch) — automatización persistente con estado en base de datos.
7. **AI QA Engineer / Role-based testing**: tests end-to-end simulando usuarios reales,
   permisos multi-rol — QA como agente, no como script.

## Mapeo a UltraIa

- Implementado (loop-35, capability `growth`): "one variable at a time → playbook que
  compone victorias por canal" → `planExperiments` (UNA variable por experimento, peor KPI
  primero) + `buildPlaybook` (victoria = test > control +5 → recomendación con peso
  acumulado). Coherente con el feedback loop F5 (registrarFeedback/publicationSignals →
  critiques BAD para improve.ts).
- Ya existente en el repo: scheduled workflows (screenflow scheduling, publishDue calendar),
  multi-agente (skills de agente bp-admin-*, g0dm0d3 races), QA como agente (capability
  skills → runSkill review/test).
- Pendiente (fuera de alcance del dominio puro): auto-mejora real de prompts/estrategias
  (hoy el playbook es un artefacto determinista; el loop de mejora de agentes vía signals
  está parcial en F5), analytics reales por API de canal (requiere tokens OAuth).