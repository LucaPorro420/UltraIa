# Guia de Solicitudes para Implementar

**ESTADO**: Documentacion de referencia.
**REVISION**: Solo si el usuario lo pide explicitamente.

**Objetivo**: Saber exactamente que pedirle a la IA para construir cada proyecto.
**Diseno**: Dark Obsidian (mismo tema UltraIa). Los componentes UI se reusan.

---

## Como Funciona

Cada proyecto se divide en **pedidos atomicos**. Cada pedido es un archivo o modulo
chico que yo puedo generar en una sesion. No pidas "construye DevSynth Hub" — pide
piezas una por una.

**Formato de pedido**:
```
"Crea [tipo] en [ruta] con [tecnologia]. Que haga [funcionalidad concreta].
Estilo Dark Obsidian. Tests incluidos."
```

---

## PROYECTO 1: DevSynth Hub (Ecosistema de Dev con IA)

### Herramienta | Que pedir | Tecnologia | Ruta sugerida

**ModelMesh** (API Gateway para LLMs)
```
"Crea un adaptador para [proveedor] en TypeScript.
 Interfaz: sendPrompt(provider, messages, opts) -> Response.
 Caché por hash, fallback automatico. Tests unitarios."
```
- Primero: `apps/devsynth/src/mesh/providers/openai.ts`
- Luego: `anthropic.ts`, `gemini.ts`, `ollama.ts`
- Gateway: `apps/devsynth/src/mesh/router.ts` (enrutamiento por costo/calidad)
- Cache: `apps/devsynth/src/mesh/cache.ts` (Redis o in-memory)

**SyncBridge** (Memoria Semantica)
```
"Crea un servicio de embeddings en TypeScript.
 Indexa texto -> vector. Busca por similitud coseno.
 Sin dependencias externas (TF-IDF local). Tests."
```
- Core: `apps/devsynth/src/bridge/embeddings.ts`
- Store: `apps/devsynth/src/bridge/store.ts` (pgvector o SQLite local)
- API: `apps/devsynth/src/bridge/api.ts` (Fastify routes)

**FlowSage** (Nodos para n8n)
```
"Crea un nodo n8n para [accion] en TypeScript.
 Exporta: INodeType. Inputs/outputs definidos.
 Plug-and-play para n8n autoalojado."
```
- Prompt Manager: `apps/devsynth/src/flow/nodes/prompt-manager.ts`
- Model Comparator: `apps/devsynth/src/flow/nodes/model-comparator.ts`
- Evaluator: `apps/devsynth/src/flow/nodes/evaluator.ts`

**DocuForge** (Documentacion Automatica)
```
"Crea un parser de [lenguaje] que extraiga:
 funciones, clases, tipos, comentarios JSDoc/docstring.
 Retorna AST simplificado en JSON. Tests."
```
- Parsers: `apps/devsynth/src/doc/parsers/` (ts.ts, py.ts, go.ts)
- Generator: `apps/devsynth/src/doc/generator.ts` (AST -> Markdown)
- Publisher: `apps/devsynth/src/doc/publisher.ts` (GitHub Pages)

**PairMind** (Agente en Editor)
```
"Crea una extension VSCode que:
 - Escuche cambios en archivos .ts/.js
 - Envie contexto al backend via WebSocket
 - Muestre sugerencias en panel lateral
 - Dark theme."
```
- Extension: `apps/devsynth/pairmind-vscode/` (TypeScript)
- Server: `apps/devsynth/src/pair/server.ts` (WebSocket Fastify)

**DeployMind** (Deploy Inteligente)
```
"Crea un modulo que analice un commit y evaluie:
 riesgo (tests, complejidad, historial).
 Retorna score 0-100 y recomendacion (deploy/reject/hold)."
```
- Analyzer: `apps/devsynth/src/deploy/analyzer.ts`
- Executor: `apps/devsynth/src/deploy/executor.ts` (K8s/AWS wrappers)

**TeamSynth** (Bot de Colaboracion)
```
"Crea un bot de Slack en TypeScript que:
 - Escuche menciones del equipo
 - Consulte SyncBridge para responder
 - Resuma hilos largos
 - Asigne tareas por mencion."
```
- Bot: `apps/devsynth/src/team/bot.ts` (Slack Bolt)
- Responder: `apps/devsynth/src/team/responder.ts`

---

## PROYECTO 2: LegalBrief AI (SaaS Legal)

### Modulo | Que pedir | Tecnologia | Ruta sugerida

**Backend API**
```
"Crea un endpoint POST /api/analyze en FastAPI (Python).
 Recibe: PDF o texto plano.
 Retorna: resumen, clausulas[], alertas[].
 Autenticacion JWT. Rate limiting. Tests."
```
- `apps/legal/api/main.py` (FastAPI app)
- `apps/legal/api/analyzer.py` (logica de analisis)
- `apps/legal/api/models.py` (Pydantic schemas)

**Frontend**
```
"Crea una pagina /dashboard en Next.js (App Router).
 Subida de archivo drag-and-drop.
 Muestra: resumen ejecutivo, clausulas destacadas, alertas de riesgo.
 Dark Obsidian. Responsive."
```
- `apps/legal/web/app/(app)/dashboard/page.tsx`
- `apps/legal/web/components/upload-zone.tsx`
- `apps/legal/web/components/clause-card.tsx`
- `apps/legal/web/components/risk-badge.tsx`

**Integracion IA**
```
"Crea un servicio de analisis legal que:
 1. Extraiga texto del PDF (pdf-parse)
 2. Envie a LLM con prompt estructurado
 3. Parsee la respuesta JSON
 4. Clasifique clausulas por tipo y riesgo
 Sin dependencia de proveedor especifico. Tests."
```
- `apps/legal/api/services/document_analyzer.py`
- `apps/legal/api/services/clause_classifier.py`

**Pagos**
```
"Crea integracion con Stripe:
 Plan Free (3 docs/mes) y Pro (29EUR/mes).
 Webhook para actualizar estado de suscripcion.
 Prisma schema para User + Subscription."
```
- `apps/legal/api/billing/stripe_handler.py`
- `apps/legal/api/billing/plans.py`

**Paginas Web**
```
"Crea landing page para LegalBrief AI:
 Hero con demo interactiva.
 Secciones: Features, Pricing, FAQ, Testimonials.
 Dark theme. Copy en espanol. Framer Motion."
```
- `apps/legal/web/app/(marketing)/page.tsx`
- `apps/legal/web/components/pricing-table.tsx`
- `apps/legal/web/components/faq-accordion.tsx`

---

## PROYECTO 3: UltraIa Nuevas Capabilities

### Capability | Que pedir | Ruta

```
"Crea una capability [nombre] en packages/core/src/tools/[nombre].ts
 con [N] tests en [nombre].test.ts.
 Dominio puro, determinista, keyless.
 Wiring en llm.ts bajo capability '[nombre]'."
```

Ejemplos:
- `packages/core/src/tools/legal-analysis.ts` (para LegalBrief)
- `packages/core/src/tools/model-mesh.ts` (router de LLMs)
- `packages/core/src/tools/semantic-search.ts` (busqueda por embeddings)

---

## REGLAS PARA PEDIR CODIGO

### 1. Siempre especificar

| Campo | Ejemplo |
|-------|---------|
| **Tipo** | endpoint, componente, servicio, tool, test |
| **Ruta** | `apps/web/src/app/api/...` |
| **Tecnologia** | Next.js, FastAPI, Prisma, Zod |
| **Funcionalidad** | "recibe X, retorna Y" |
| **Estilo** | Dark Obsidian, Glass Panel, Neo Violet |
| **Tests** | "Tests unitarios incluidos" |

### 2. Orden de construccion

```
1. Schema/Types primero (Zod, Pydantic, interfaces)
2. Dominio puro (logica sin IO)
3. Adaptadores (DB, API externa, filesystem)
4. API endpoints (routes)
5. Frontend (componentes + paginas)
6. Tests (unit + integration)
7. Wiring (registro en llm.ts/index.ts)
```

### 3. Componentes UI reutilizables (ya existen en UltraIa)

| Componente | Uso | Ruta |
|------------|-----|------|
| `GlassPanel` | Contenedor principal | `globals.css` |
| `CardGlowHover` | Tarjetas interactivas | `globals.css` |
| `LoadingSpinner` | Carga | `components/ui/loading.tsx` |
| `ErrorBoundary` | Errores | `components/ui/error-boundary.tsx` |
| `EmptyState` | Sin datos | `components/ui/empty-state.tsx` |
| `StatCard` | Metricas | `components/ui/stat-card.tsx` |
| `Badge` | Etiquetas | `components/ui/badge.tsx` |
| `Button` | Acciones | `components/ui/button.tsx` |
| `Dialog` | Modales | `components/ui/dialog.tsx` |
| `Tabs` | Navegacion | `components/ui/tabs.tsx` |

### 4. Tokens de color (Dark Obsidian)

```css
--canvas: #08080a      /* fondo principal */
--panel: #111115        /* paneles */
--primary: #8b5cf6      /* acento violeta */
--border: #1f1f2a       /* bordes sutiles */
--text: #fafafa         /* texto principal */
--muted: #a1a1aa        /* texto secundario */
--success: #22c55e      /* estado OK */
--warning: #f59e0b      /* estado alerta */
--error: #ef4444        /* estado error */
```

### 5. Ejemplo de pedido completo

```
Crea un endpoint POST /api/legal/analyze en apps/legal/api/routes/analyze.py
con FastAPI. Receives { text: string } or { fileUrl: string }.
Returns { summary: string, clauses: Clause[], risks: Risk[] }.
Clause = { type: string, text: string, severity: 'low'|'medium'|'high' }.
Risk = { clause: string, explanation: string, recommendation: string }.
Uses Pydantic v2 for validation. Tests in tests/test_analyze.py.
Dark Obsidian styling for the response JSON structure.
```

---

## RESUMEN RAPIDO

| Proyecto | Primero pedir | Tecnologia | Tiempo estimado |
|----------|---------------|------------|-----------------|
| DevSynth | ModelMesh adapter | TypeScript | 2-3 sesiones |
| DevSynth | SyncBridge core | TypeScript | 2-3 sesiones |
| LegalBrief | API analyzer | Python/FastAPI | 1-2 sesiones |
| LegalBrief | Dashboard page | Next.js | 1-2 sesiones |
| UltraIa | Nueva capability | TypeScript | 1 sesion |

**Regla de oro**: Pide UN archivo a la vez. Que sea especifico, con tipos definidos
y tests. Yo genero el codigo, tu verificas con `npm run typecheck && npm run test`.
