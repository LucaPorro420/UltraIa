/**
 * Agent Orchestration System for Plataforma Unificada
 * 
 * Implements the multi-agent architecture from the concept document:
 * - Orchestrator (coordinates all agents)
 * - Tutor (educational guidance)
 * - Coder (code implementation)
 * - Architect (system design)
 * - Researcher (information gathering)
 * - Debugger (error diagnosis)
 * - Tester (quality assurance)
 * - Security (vulnerability assessment)
 * - Documenter (documentation generation)
 * - UI/UX (interface design)
 * - Database Engineer (data modeling)
 * - DevOps (deployment automation)
 * - Cloud Engineer (infrastructure)
 * - AI Engineer (ML/AI integration)
 * - Project Manager (task coordination)
 * - Analyst (requirements analysis)
 * - Reviewer (code review)
 */

import { 
  Agent, 
  AgentType, 
  AgentTask, 
  OrchestrationPlan,
  AgentCapability,
  AgentPermissions,
  ChatMessage 
} from '@plataforma-unificada/core/types';
import { getGatewayClient, OllamaCompatLayer } from '@plataforma-unificada/gateway';
import { getConfig, createLogger, generateId } from '@plataforma-unificada/core';

const logger = createLogger('Agents');

// ============================================================================
// Base Agent Class
// ============================================================================

export abstract class BaseAgent {
  protected client = getGatewayClient();
  protected config = getConfig();
  
  abstract readonly type: AgentType;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly capabilities: AgentCapability[];
  abstract readonly systemPrompt: string;
  
  protected temperature = 0.7;
  protected maxTokens = 4096;
  protected permissions: AgentPermissions = {
    filesystem: 'read',
    internet: 'read',
    git: 'read',
    production: 'none',
    database: 'read',
    shell: 'none',
  };

  async execute(task: AgentTask): Promise<Record<string, unknown>> {
    logger.info(`Agent ${this.name} executing task`, { taskId: task.id, type: task.type });
    
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: this.formatTaskPrompt(task) },
    ];

    const response = await this.client.chat({
      model: this.config.agents.defaultModel,
      messages,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      tools: this.getTools(),
      toolChoice: 'auto',
    });

    return this.parseResponse(response);
  }

  protected formatTaskPrompt(task: AgentTask): string {
    return `Task: ${task.type}\nInput: ${JSON.stringify(task.input, null, 2)}`;
  }

  protected getTools(): any[] {
    return [];
  }

  protected parseResponse(response: any): Record<string, unknown> {
    const content = response.choices[0]?.message?.content || '{}';
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }

  protected async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    logger.debug(`Tool call: ${name}`, args);
    return null;
  }
}

// ============================================================================
// Specialized Agents
// ============================================================================

export class OrchestratorAgent extends BaseAgent {
  readonly type = 'orchestrator';
  readonly name = 'Orchestrator';
  readonly description = 'Coordinates multi-agent workflows, decides which agents to invoke and in what order';
  
  readonly capabilities: AgentCapability[] = [
    { name: 'plan', description: 'Create execution plan from user request', inputSchema: { request: 'string' }, outputSchema: { plan: 'object' } },
    { name: 'delegate', description: 'Delegate task to specific agent', inputSchema: { agent: 'string', task: 'object' }, outputSchema: { result: 'object' } },
    { name: 'monitor', description: 'Monitor agent execution progress', inputSchema: { planId: 'string' }, outputSchema: { status: 'object' } },
    { name: 'aggregate', description: 'Aggregate results from multiple agents', inputSchema: { results: 'object[]' }, outputSchema: { summary: 'object' } },
  ];

  readonly systemPrompt = `Eres el ORQUESTADOR central de la Plataforma Total Unificada.

Tu trabajo es:
1. ANALIZAR la solicitud del usuario
2. PLANEAR qué agentes necesitan actuar y en qué orden
3. DELEGAR tareas a agentes especializados
4. MONITOREAR el progreso
5. AGREGAR resultados en una respuesta coherente

Agentes disponibles:
- TUTOR: Enseñanza, explicaciones, guía pedagógica
- CODER: Implementación de código, debugging, refactoring
- ARCHITECT: Diseño de sistemas, arquitectura, patrones
- RESEARCHER: Investigación, búsqueda de información, documentación
- DEBUGGER: Diagnóstico de errores, troubleshooting
- TESTER: Testing, QA, validación
- SECURITY: Auditoría de seguridad, vulnerabilidades
- DOCUMENTER: Documentación técnica, README, API docs
- UI_UX: Diseño de interfaces, experiencia de usuario
- DATABASE_ENGINEER: Modelado de datos, SQL, migraciones
- DEVOPS: CI/CD, despliegue, infraestructura
- CLOUD_ENGINEER: Cloud, contenedores, escalabilidad
- AI_ENGINEER: ML, LLMs, embeddings, RAG
- PROJECT_MANAGER: Planificación, seguimiento, coordinación
- ANALYST: Análisis de requisitos, especificación
- REVIEWER: Revisión de código, calidad, mejores prácticas

Responde SIEMPRE con JSON válido:
{
  "analysis": "Análisis de la solicitud",
  "plan": [
    { "agent": "tipo_agente", "task": "descripción", "input": {}, "priority": 1 }
  ],
  "requiresApproval": false,
  "estimatedSteps": 3
}`;

  async createPlan(userRequest: string): Promise<OrchestrationPlan> {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: userRequest },
    ];

    const response = await this.client.chat({
      model: this.config.agents.orchestratorModel,
      messages,
      temperature: 0.3,
      maxTokens: 2048,
    });

    const parsed = this.parseResponse(response);
    
    const plan: OrchestrationPlan = {
      id: generateId('plan'),
      userRequest,
      tasks: (parsed.plan || []).map((p: any, i: number) => ({
        id: generateId('task'),
        type: p.task,
        input: p.input || {},
        assignedAgent: p.agent,
        status: 'pending',
        subtasks: [],
      })),
      status: 'planning',
      currentTaskIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return plan;
  }

  async executePlan(plan: OrchestrationPlan, agents: Map<AgentType, BaseAgent>): Promise<Record<string, unknown>[]> {
    plan.status = 'executing';
    const results: Record<string, unknown>[] = [];

    for (let i = 0; i < plan.tasks.length; i++) {
      plan.currentTaskIndex = i;
      const task = plan.tasks[i];
      
      const agent = agents.get(task.assignedAgent as AgentType);
      if (!agent) {
        task.status = 'failed';
        task.error = `Agent ${task.assignedAgent} not found`;
        continue;
      }

      task.status = 'running';
      task.startedAt = new Date();

      try {
        const result = await agent.execute(task);
        task.result = result;
        task.status = 'completed';
        task.completedAt = new Date();
        results.push(result);
      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : 'Unknown error';
        if (this.config.agents.humanInTheLoop) {
          task.status = 'awaiting-approval';
          break;
        }
      }

      plan.updatedAt = new Date();
    }

    plan.status = plan.tasks.every(t => t.status === 'completed') ? 'completed' : 'failed';
    return results;
  }
}

export class TutorAgent extends BaseAgent {
  readonly type = 'tutor';
  readonly name = 'Tutor';
  readonly description = 'Proporciona guía pedagógica, explica conceptos, adapta al nivel del estudiante';
  
  readonly capabilities: AgentCapability[] = [
    { name: 'explain', description: 'Explicar concepto adaptado al nivel', inputSchema: { concept: 'string', level: 'string' }, outputSchema: { explanation: 'string', examples: 'string[]', exercises: 'string[]' } },
    { name: 'createExercise', description: 'Crear ejercicio personalizado', inputSchema: { topic: 'string', difficulty: 'string' }, outputSchema: { exercise: 'object' } },
    { name: 'recommendPath', description: 'Recomendar ruta de aprendizaje', inputSchema: { userLevel: 'string', goals: 'string[]' }, outputSchema: { path: 'string[]' } },
    { name: 'diagnoseDifficulty', description: 'Detectar conceptos problemáticos', inputSchema: { userAnswers: 'string[]' }, outputSchema: { difficulties: 'string[]', suggestions: 'string[]' } },
  ];

  readonly systemPrompt = `Eres el TUTOR de la Plataforma Total Unificada.

PRINCIPIOS PEDAGÓGICOS:
1. Adaptas la explicación al NIVEL del usuario (0=Explorador, 1=Principiante, 2=Intermedio, 3=Avanzado, 4=Profesional, 5=Arquitecto)
2. Usas el CICLO DE APRENDIZAJE: Descubrir → Explicar → Demostrar → Descomponer → Practicar → Modificar → Romper → Diagnosticar → Resolver → Crear → Integrar → Proyecto
3. No das solo respuestas: ENSEÑAS el POR QUÉ
4. Proporcionas ANALOGÍAS y EJEMPLOS PRÁCTICOS
5. Detectas DIFICULTADES y generas EJERCICIOS ADICIONALES

NIVELES:
- Nivel 0: Lógica, algoritmos, pensamiento computacional, matemáticas aplicadas
- Nivel 1: Sintaxis, variables, condiciones, ciclos, funciones, estructuras básicas
- Nivel 2: Arquitectura, APIs, BD, testing, Git, frameworks, asincronía, seguridad
- Nivel 3: Patrones, sistemas distribuidos, microservicios, cloud, DevOps, IA, agentes
- Nivel 4: Proyectos reales, evaluación de arquitectura/calidad/seguridad/rendimiento
- Nivel 5: Diseño de sistemas complejos, frameworks propios, modelos IA, investigación

Responde con JSON:
{
  "explanation": "Explicación clara y adaptada",
  "analogy": "Analogía para entender el concepto",
  "examples": ["ejemplo1", "ejemplo2"],
  "miniExercise": "Ejercicio pequeño para practicar",
  "nextConcept": "Qué aprender después",
  "difficulty": "easy|medium|hard"
}`;

  async explainConcept(concept: string, userLevel: string, context?: string): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'explain',
      input: { concept, userLevel, context },
    });
  }

  async createLearningPath(goals: string[], currentLevel: string): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'recommendPath',
      input: { goals, currentLevel },
    });
  }
}

export class CoderAgent extends BaseAgent {
  readonly type = 'coder';
  readonly name = 'Coder';
  readonly description = 'Implementa código, hace refactoring, debugging, convierte entre lenguajes';
  
  readonly capabilities: AgentCapability[] = [
    { name: 'implement', description: 'Implementar funcionalidad', inputSchema: { spec: 'string', language: 'string' }, outputSchema: { code: 'string', tests: 'string', explanation: 'string' } },
    { name: 'refactor', description: 'Refactorizar código existente', inputSchema: { code: 'string', goals: 'string[]' }, outputSchema: { code: 'string', changes: 'string[]' } },
    { name: 'debug', description: 'Depurar código con error', inputSchema: { code: 'string', error: 'string' }, outputSchema: { fixedCode: 'string', explanation: 'string', rootCause: 'string' } },
    { name: 'translate', description: 'Convertir código entre lenguajes', inputSchema: { code: 'string', from: 'string', to: 'string' }, outputSchema: { code: 'string' } },
    { name: 'review', description: 'Revisar código por calidad', inputSchema: { code: 'string' }, outputSchema: { issues: 'string[]', suggestions: 'string[]', score: 'number' } },
  ];

  readonly systemPrompt = `Eres el CODER de la Plataforma Total Unificada.

ESPECIALIDADES:
- Python, JavaScript, TypeScript, Java, C#, Go, Rust, C++, SQL
- Frameworks: React, Next.js, Django, FastAPI, Spring, .NET, Express
- Testing: Jest, Vitest, Pytest, JUnit, Cypress, Playwright
- Patrones: SOLID, Clean Architecture, DDD, Hexagonal

METODOLOGÍA:
1. Entiendes el REQUISITO completo
2. Escribes código MÍNIMO que FUNCIONA
3. Añades TESTS que VALIDAN
4. REFACTORIZAS después de que pasan tests
5. DOCUMENTAS decisiones importantes

PRINCIPIOS:
- Código LIMPIO, LEGIBLE, MANTENIBLE
- Nombres DESCRIPTIVOS
- Funciones PEQUEÑAS, UNA RESPONSABILIDAD
- MANEJO DE ERRORES explícito
- TIPOS ESTÁTICOS donde sea posible
- COMENTARIOS que explican POR QUÉ, no QUÉ

Responde con JSON:
{
  "code": "código completo",
  "language": "typescript",
  "explanation": "Explicación de la implementación",
  "tests": "tests unitarios",
  "dependencies": ["dep1", "dep2"],
  "files": { "path/to/file.ts": "contenido" }
}`;

  async implement(spec: string, language: string): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'implement',
      input: { spec, language },
    });
  }

  async debug(code: string, error: string): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'debug',
      input: { code, error },
    });
  }

  async review(code: string): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'review',
      input: { code },
    });
  }
}

export class ArchitectAgent extends BaseAgent {
  readonly type = 'architect';
  readonly name = 'Architect';
  readonly description = 'Diseña arquitectura de sistemas, define patrones, toma decisiones técnicas';
  
  readonly capabilities: AgentCapability[] = [
    { name: 'design', description: 'Diseñar arquitectura de sistema', inputSchema: { requirements: 'string', constraints: 'string[]' }, outputSchema: { architecture: 'object', diagrams: 'string[]', decisions: 'string[]' } },
    { name: 'evaluate', description: 'Evaluar arquitectura existente', inputSchema: { codebase: 'string' }, outputSchema: { strengths: 'string[]', weaknesses: 'string[]', recommendations: 'string[]' } },
    { name: 'pattern', description: 'Recomendar patrón de diseño', inputSchema: { problem: 'string' }, outputSchema: { pattern: 'string', rationale: 'string', example: 'string' } },
    { name: 'techStack', description: 'Seleccionar stack tecnológico', inputSchema: { requirements: 'string', team: 'string' }, outputSchema: { stack: 'object', justification: 'string' } },
  ];

  readonly systemPrompt = `Eres el ARCHITECT de la Plataforma Total Unificada.

RESPONSABILIDADES:
- Diseñar ARQUITECTURA de sistemas completos
- Definir PATRONES y decisiones técnicas (ADR)
- Evaluar COMPROMISOS (trade-offs)
- Garantizar ESCALABILIDAD, MANTENIBILIDAD, SEGURIDAD
- Documentar arquitectura con DIAGRAMAS (Mermaid)

PRINCIPIOS:
- Separación de responsabilidades
- Bajo acoplamiento, alta cohesión
- Diseño orientado a dominio (DDD) cuando aplica
- Arquitectura hexagonal / limpia
- Event-driven para sistemas distribuidos
- Observabilidad desde el día 1
- Seguridad by design

ENTREGABLES:
- Diagrama de arquitectura (Mermaid)
- Decisiones de arquitectura (ADR)
- Stack tecnológico justificado
- Patrones recomendados
- Plan de migración si aplica

Responde con JSON:
{
  "architecture": { "layers": [], "components": [], "dataFlow": "" },
  "mermaidDiagram": "graph TD...",
  "decisions": ["ADR1", "ADR2"],
  "patterns": ["pattern1", "pattern2"],
  "techStack": { "frontend": "", "backend": "", "database": "", "cloud": "" },
  "tradeoffs": ["tradeoff1", "tradeoff2"]
}`;

  async designSystem(requirements: string, constraints: string[] = []): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'design',
      input: { requirements, constraints },
    });
  }
}

export class ResearcherAgent extends BaseAgent {
  readonly type = 'researcher';
  readonly name = 'Researcher';
  readonly description = 'Investiga temas técnicos, busca documentación, compara tecnologías';
  
  readonly capabilities: AgentCapability[] = [
    { name: 'research', description: 'Investigar tema técnico', inputSchema: { topic: 'string', depth: 'string' }, outputSchema: { summary: 'string', sources: 'string[]', keyFindings: 'string[]' } },
    { name: 'compare', description: 'Comparar tecnologías', inputSchema: { options: 'string[]', criteria: 'string[]' }, outputSchema: { comparison: 'object', recommendation: 'string' } },
    { name: 'findBestPractices', description: 'Buscar mejores prácticas', inputSchema: { topic: 'string' }, outputSchema: { practices: 'string[]', references: 'string[]' } },
  ];

  readonly systemPrompt = `Eres el RESEARCHER de la Plataforma Total Unificada.

MISIÓN: Investigar, comparar, encontrar información técnica precisa.

FUENTES PRIORITARIAS:
1. Documentación oficial
2. RFCs y estándares
3. Blogs de ingeniería de empresas top (Netflix, Google, Uber, etc.)
4. Papers académicos relevantes
5. Comunidades técnicas (GitHub, StackOverflow, Reddit)

METODOLOGÍA:
1. Defines el ALCANCE de la investigación
2. Buscas MÚLTIPLES fuentes
3. COMPARAS y CONTRASTAS
4. EXTRAES hallazgos clave
5. CITAS fuentes
6. Das RECOMENDACIÓN fundamentada

Responde con JSON:
{
  "summary": "Resumen ejecutivo",
  "keyFindings": ["hallazgo1", "hallazgo2"],
  "sources": ["url1", "url2"],
  "comparison": { "option1": { "pros": [], "cons": [] } },
  "recommendation": "Recomendación con justificación",
  "confidence": 0.9
}`;

  async research(topic: string, depth: 'shallow' | 'deep' = 'deep'): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'research',
      input: { topic, depth },
    });
  }

  async compare(options: string[], criteria: string[]): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'compare',
      input: { options, criteria },
    });
  }
}

export class DebuggerAgent extends BaseAgent {
  readonly type = 'debugger';
  readonly name = 'Debugger';
  readonly description = 'Diagnostica errores, encuentra causas raíz, propone soluciones';
  
  readonly capabilities: AgentCapability[] = [
    { name: 'diagnose', description: 'Diagnosticar error', inputSchema: { error: 'string', context: 'string', code: 'string' }, outputSchema: { rootCause: 'string', hypothesis: 'string[]', fix: 'string', prevention: 'string' } },
    { name: 'analyzeLogs', description: 'Analizar logs', inputSchema: { logs: 'string' }, outputSchema: { issues: 'string[]', patterns: 'string[]' } },
    { name: 'profile', description: 'Analizar performance', inputSchema: { metrics: 'object' }, outputSchema: { bottlenecks: 'string[]', optimizations: 'string[]' } },
  ];

  readonly systemPrompt = `Eres el DEBUGGER de la Plataforma Total Unificada.

METODOLOGÍA DE DIAGNÓSTICO:
1. LEER el error COMPLETO (última línea del traceback)
2. IDENTIFICAR el tipo: SyntaxError, TypeError, ReferenceError, lógica, performance, red
3. REPRODUCIR en ejemplo mínimo
4. FORMULAR HIPÓTESIS
5. VERIFICAR cada hipótesis
6. ENCONTRAR CAUSA RAÍZ
7. PROPONER FIX mínimo
8. EXPLICAR PREVENCIÓN

TIPOS DE ERRORES COMUNES:
- Null/undefined access
- Type mismatches
- Async/await issues
- Race conditions
- Memory leaks
- Database connection issues
- Network timeouts
- Config errors

Responde con JSON:
{
  "rootCause": "Causa raíz identificada",
  "hypothesis": ["hipótesis1", "hipótesis2"],
  "fix": "Código corregido o pasos para corregir",
  "explanation": "Por qué ocurrió y cómo el fix lo resuelve",
  "prevention": "Cómo evitar en el futuro",
  "severity": "low|medium|high|critical"
}`;

  async diagnose(error: string, context: string, code: string): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'diagnose',
      input: { error, context, code },
    });
  }
}

export class TesterAgent extends BaseAgent {
  readonly type = 'tester';
  readonly name = 'Tester';
  readonly description = 'Genera tests, valida calidad, ejecuta suites de testing';
  
  readonly capabilities: AgentCapability[] = [
    { name: 'generateTests', description: 'Generar tests unitarios', inputSchema: { code: 'string', framework: 'string' }, outputSchema: { tests: 'string', coverage: 'number' } },
    { name: 'generateE2E', description: 'Generar tests E2E', inputSchema: { userFlow: 'string', framework: 'string' }, outputSchema: { tests: 'string' } },
    { name: 'validate', description: 'Validar código contra requisitos', inputSchema: { code: 'string', requirements: 'string[]' }, outputSchema: { passed: 'boolean', issues: 'string[]' } },
  ];

  readonly systemPrompt = `Eres el TESTER de la Plataforma Total Unificada.

TIPOS DE TESTS:
- Unitarios: funciones puras, lógica de negocio
- Integración: APIs, BD, servicios externos
- E2E: flujos de usuario completos
- Contrato: schemas, APIs
- Performance: carga, estrés, latencia
- Seguridad: inyección, auth, datos sensibles
- Mutación: calidad de los tests

PRINCIPIOS:
- Tests RÁPIDOS, AISLADOS, DETERMINISTAS
- Nombran QUÉ testean y QUÉ ESPERAN
- AAA: Arrange, Act, Assert
- Cubren CASOS LÍMITE y ERRORES
- Mocks MÍNIMOS, reales cuando posible

Responde con JSON:
{
  "tests": "código de tests completo",
  "framework": "jest|vitest|pytest|playwright",
  "coverage": 85,
  "testCases": ["caso1", "caso2"],
  "mocks": ["mock1"]
}`;

  async generateTests(code: string, framework: string = 'vitest'): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'generateTests',
      input: { code, framework },
    });
  }
}

export class SecurityAgent extends BaseAgent {
  readonly type = 'security';
  readonly name = 'Security';
  readonly description = 'Audita seguridad, encuentra vulnerabilidades, recomienda hardening';
  
  readonly capabilities: AgentCapability[] = [
    { name: 'audit', description: 'Auditoría de seguridad', inputSchema: { code: 'string', type: 'string' }, outputSchema: { vulnerabilities: 'object[]', riskLevel: 'string', remediation: 'string[]' } },
    { name: 'scanDependencies', description: 'Escanear dependencias', inputSchema: { dependencies: 'string[]' }, outputSchema: { vulnerable: 'object[]', updates: 'string[]' } },
    { name: 'reviewAuth', description: 'Revisar autenticación/autorización', inputSchema: { authCode: 'string' }, outputSchema: { issues: 'string[]', recommendations: 'string[]' } },
  ];

  readonly systemPrompt = `Eres el SECURITY de la Plataforma Total Unificada.

ENFOQUE: OWASP Top 10, CWE, mejores prácticas de seguridad.

VULNERABILIDADES COMUNES:
- Inyección (SQL, NoSQL, Command, LDAP)
- Broken Authentication
- Sensitive Data Exposure
- XXE, Broken Access Control
- Security Misconfiguration
- XSS (Stored, Reflected, DOM)
- Insecure Deserialization
- Using Components with Known Vulnerabilities
- Insufficient Logging & Monitoring

CHECKLIST:
- Validación/sanitización de entrada
- Parameterized queries / ORM
- Secrets management (no hardcode)
- HTTPS/TLS everywhere
- CSP, HSTS, security headers
- Rate limiting, authZ checks
- Dependency scanning
- Logging de eventos de seguridad

Responde con JSON:
{
  "vulnerabilities": [
    { "type": "SQL Injection", "location": "file:line", "severity": "high", "description": "", "fix": "" }
  ],
  "riskLevel": "high|medium|low",
  "remediation": ["acción1", "acción2"],
  "compliance": { "owasp": true, "gdpr": true }
}`;

  async audit(code: string, type: string): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'audit',
      input: { code, type },
    });
  }
}

export class DocumenterAgent extends BaseAgent {
  readonly type = 'documenter';
  readonly name = 'Documenter';
  readonly description = 'Genera documentación técnica, README, API docs, diagramas';
  
  readonly capabilities: AgentCapability[] = [
    { name: 'generateReadme', description: 'Generar README', inputSchema: { project: 'object' }, outputSchema: { readme: 'string' } },
    { name: 'generateApiDocs', description: 'Generar docs de API', inputSchema: { endpoints: 'object[]' }, outputSchema: { openapi: 'object' } },
    { name: 'generateArchitectureDoc', description: 'Documentar arquitectura', inputSchema: { architecture: 'object' }, outputSchema: { doc: 'string', diagrams: 'string[]' } },
    { name: 'generateChangelog', description: 'Generar changelog', inputSchema: { commits: 'string[]' }, outputSchema: { changelog: 'string' } },
  ];

  readonly systemPrompt = `Eres el DOCUMENTER de la Plataforma Total Unificada.

ESTÁNDARES:
- Diátaxis: Tutorial, How-to, Reference, Explanation
- OpenAPI/Swagger para APIs
- Mermaid para diagramas
- Markdown bien estructurado
- Ejemplos ejecutables
- Versionado semántico

TIPOS DE DOCS:
- README: overview, install, usage, contributing
- API: endpoints, schemas, examples, errors
- Arquitectura: ADR, diagramas, decisiones
- Guías: paso a paso, troubleshooting
- Referencia: tipos, funciones, configs

Responde con JSON:
{
  "content": "contenido markdown completo",
  "format": "markdown|openapi|mermaid",
  "sections": ["section1", "section2"],
  "examples": ["ejemplo1"]
}`;

  async generateReadme(project: any): Promise<any> {
    return this.execute({
      id: generateId('task'),
      type: 'generateReadme',
      input: { project },
    });
  }
}

// ============================================================================
// Agent Registry & Factory
// ============================================================================

const agentClasses: Map<AgentType, new () => BaseAgent> = new Map([
  ['orchestrator', OrchestratorAgent],
  ['tutor', TutorAgent],
  ['coder', CoderAgent],
  ['architect', ArchitectAgent],
  ['researcher', ResearcherAgent],
  ['debugger', DebuggerAgent],
  ['tester', TesterAgent],
  ['security', SecurityAgent],
  ['documenter', DocumenterAgent],
  // Add more agents as needed
]);

export function createAgent(type: AgentType): BaseAgent {
  const AgentClass = agentClasses.get(type);
  if (!AgentClass) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  return new AgentClass();
}

export function getAvailableAgents(): AgentType[] {
  return Array.from(agentClasses.keys());
}

export function createAllAgents(): Map<AgentType, BaseAgent> {
  const agents = new Map<AgentType, BaseAgent>();
  for (const [type, AgentClass] of agentClasses) {
    agents.set(type, new AgentClass());
  }
  return agents;
}

// ============================================================================
// Orchestration Engine
// ============================================================================

export class OrchestrationEngine {
  private agents: Map<AgentType, BaseAgent>;
  private orchestrator: OrchestratorAgent;
  private plans: Map<string, OrchestrationPlan> = new Map();

  constructor() {
    this.agents = createAllAgents();
    this.orchestrator = new OrchestratorAgent();
  }

  async processRequest(userRequest: string, userId: string): Promise<{
    plan: OrchestrationPlan;
    results: Record<string, unknown>[];
    summary: string;
  }> {
    logger.info('Processing orchestration request', { userId, request: userRequest.substring(0, 100) });

    // Create plan
    const plan = await this.orchestrator.createPlan(userRequest);
    this.plans.set(plan.id, plan);

    // Execute plan
    const results = await this.orchestrator.executePlan(plan, this.agents);

    // Generate summary
    const summary = await this.generateSummary(userRequest, results);

    return { plan, results, summary };
  }

  private async generateSummary(request: string, results: Record<string, unknown>[]): Promise<string> {
    const summaryPrompt = `Resumen de la ejecución:
Solicitud: ${request}
Resultados: ${results.length} tareas completadas

Genera un resumen ejecutivo en español para el usuario.`;

    const response = await this.orchestrator.execute({
      id: generateId('task'),
      type: 'summarize',
      input: { request, results },
    });

    return response.summary || 'Ejecución completada.';
  }

  getPlan(planId: string): OrchestrationPlan | undefined {
    return this.plans.get(planId);
  }

  getAgent(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type);
  }
}

// ============================================================================
// MCP Server Integration
// ============================================================================

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export function getAgentMCPTools(): MCPToolDefinition[] {
  return [
    {
      name: 'orchestrate',
      description: 'Execute a multi-agent orchestration plan for a user request',
      inputSchema: {
        type: 'object',
        properties: {
          request: { type: 'string', description: 'User request to orchestrate' },
          userId: { type: 'string', description: 'User ID' },
        },
        required: ['request', 'userId'],
      },
    },
    {
      name: 'agent_execute',
      description: 'Execute a single agent task',
      inputSchema: {
        type: 'object',
        properties: {
          agentType: { type: 'string', enum: getAvailableAgents() },
          task: { type: 'string', description: 'Task description' },
          input: { type: 'object', description: 'Task input data' },
        },
        required: ['agentType', 'task'],
      },
    },
    {
      name: 'agent_list',
      description: 'List all available agents and their capabilities',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'plan_get',
      description: 'Get orchestration plan status',
      inputSchema: {
        type: 'object',
        properties: {
          planId: { type: 'string' },
        },
        required: ['planId'],
      },
    },
  ];
}

export async function handleMCPToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  const engine = new OrchestrationEngine();
  
  switch (name) {
    case 'orchestrate': {
      const { request, userId } = args as { request: string; userId: string };
      return engine.processRequest(request, userId);
    }
    case 'agent_execute': {
      const { agentType, task, input } = args as { agentType: AgentType; task: string; input: Record<string, unknown> };
      const agent = engine.getAgent(agentType);
      if (!agent) throw new Error(`Agent ${agentType} not found`);
      return agent.execute({
        id: generateId('task'),
        type: task,
        input,
      });
    }
    case 'agent_list': {
      const agents = getAvailableAgents().map(type => {
        const agent = engine.getAgent(type);
        return {
          type,
          name: agent?.name,
          description: agent?.description,
          capabilities: agent?.capabilities,
        };
      });
      return { agents };
    }
    case 'plan_get': {
      const { planId } = args as { planId: string };
      const engine = new OrchestrationEngine();
      const plan = engine.getPlan(planId);
      if (!plan) throw new Error(`Plan ${planId} not found`);
      return plan;
    }
    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}