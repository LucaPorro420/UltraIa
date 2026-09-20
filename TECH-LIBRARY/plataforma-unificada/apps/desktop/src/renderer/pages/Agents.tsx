import React, { useState } from 'react';
import { 
  Bot, Zap, Brain, Cpu, Search, Code, Shield, 
  FileText, Database, Cloud, Wrench, GraduationCap,
  Play, Pause, Settings, ChevronRight, MessageSquare,
  Zap as ZapIcon, TrendingUp
} from 'lucide-react';
import clsx from 'clsx';

interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'active' | 'idle' | 'working';
  capabilities: string[];
  currentTask?: string;
}

const agents: Agent[] = [
  { id: 'orchestrator', name: 'Orchestrator', type: 'orchestrator', description: 'Coordina flujos multi-agente, planifica y delega tareas', status: 'active', capabilities: ['Planificación', 'Delegación', 'Monitoreo', 'Agregación'], currentTask: 'Orquestando: API REST con FastAPI' },
  { id: 'tutor', name: 'Tutor', type: 'tutor', description: 'Guía pedagógica, explica conceptos, adapta al nivel', status: 'active', capabilities: ['Explicación', 'Ejercicios', 'Rutas aprendizaje', 'Diagnóstico'], currentTask: 'Explicando closures en JavaScript' },
  { id: 'coder', name: 'Coder', type: 'coder', description: 'Implementa código, refactoriza, debuggea, traduce', status: 'working', capabilities: ['Implementación', 'Refactoring', 'Debugging', 'Code Review'], currentTask: 'Implementando endpoint POST /tasks' },
  { id: 'architect', name: 'Architect', type: 'architect', description: 'Diseña arquitectura, patrones, stack tecnológico', status: 'idle', capabilities: ['Diseño sistemas', 'Patrones', 'ADR', 'Tech Stack'], currentTask: 'Esperando requisitos' },
  { id: 'researcher', name: 'Researcher', type: 'researcher', description: 'Investiga, compara tecnologías, mejores prácticas', status: 'idle', capabilities: ['Investigación', 'Comparativas', 'Best practices', 'Documentación'], currentTask: 'Sin tareas' },
  { id: 'debugger', name: 'Debugger', type: 'debugger', description: 'Diagnostica errores, encuentra causa raíz', status: 'idle', capabilities: ['Diagnóstico', 'Análisis logs', 'Profiling', 'Fix suggestions'], currentTask: 'Sin errores pendientes' },
  { id: 'tester', name: 'Tester', type: 'tester', description: 'Genera tests, valida calidad, E2E', status: 'idle', capabilities: ['Unit tests', 'Integration', 'E2E', 'Mutation testing'], currentTask: 'Esperando código' },
  { id: 'security', name: 'Security', type: 'security', description: 'Audita seguridad, vulnerabilidades, hardening', status: 'idle', capabilities: ['OWASP', 'Dependency scan', 'Auth review', 'Secrets'], currentTask: 'Sin auditorías' },
  { id: 'documenter', name: 'Documenter', type: 'documenter', description: 'Genera docs, README, API docs, diagramas', status: 'idle', capabilities: ['README', 'OpenAPI', 'Mermaid', 'Changelog'], currentTask: 'Sin docs pendientes' },
  { id: 'ui-ux', name: 'UI/UX Designer', type: 'ui-ux', description: 'Diseña interfaces, experiencia de usuario', status: 'idle', capabilities: ['Wireframes', 'Design system', 'Accesibilidad', 'Prototipos'], currentTask: 'Sin diseños' },
  { id: 'db-engineer', name: 'Database Engineer', type: 'database-engineer', description: 'Modelado datos, SQL, migraciones, optimización', status: 'idle', capabilities: ['ERD', 'SQL', 'Migrations', 'Performance'], currentTask: 'Sin tareas BD' },
  { id: 'devops', name: 'DevOps Engineer', type: 'devops', description: 'CI/CD, despliegue, infraestructura, monitoring', status: 'idle', capabilities: ['Pipelines', 'K8s', 'Terraform', 'Observability'], currentTask: 'Sin deploys' },
  { id: 'cloud-engineer', name: 'Cloud Engineer', type: 'cloud-engineer', description: 'Cloud, contenedores, escalabilidad, serverless', status: 'idle', capabilities: ['AWS/GCP/Azure', 'Serverless', 'Cost optimization', 'HA'], currentTask: 'Sin tareas cloud' },
  { id: 'ai-engineer', name: 'AI Engineer', type: 'ai-engineer', description: 'ML, LLMs, embeddings, RAG, agents', status: 'working', capabilities: ['Fine-tuning', 'RAG', 'Prompt engineering', 'Eval'], currentTask: 'Configurando RAG para docs' },
  { id: 'pm', name: 'Project Manager', type: 'project-manager', description: 'Planificación, seguimiento, coordinación', status: 'active', capabilities: ['Sprints', 'Roadmap', 'Risk mgmt', 'Stakeholders'], currentTask: 'Planificando sprint 3' },
  { id: 'analyst', name: 'Analyst', type: 'analyst', description: 'Análisis requisitos, especificación, modelado', status: 'idle', capabilities: ['User stories', 'Use cases', 'Domain modeling', 'Acceptance criteria'], currentTask: 'Sin análisis' },
];

const agentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  orchestrator: Brain,
  tutor: GraduationCap,
  coder: Code,
  architect: Search,
  researcher: FileText,
  debugger: Cpu,
  tester: CheckCircle,
  security: Shield,
  documenter: FileText,
  'ui-ux': ZapIcon,
  'database-engineer': Database,
  devops: Cloud,
  'cloud-engineer': Cloud,
  'ai-engineer': Brain,
  'project-manager': TrendingUp,
  analyst: Search,
};

export function Agents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.capabilities.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Orquestación Multi-Agente</h1>
          <p className="text-text-secondary mt-1">16 agentes especializados colaborando para construir tus proyectos</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors">
            <Zap className="w-4 h-4 mr-2" />
            Nueva Orquestación
          </button>
        </div>
      </div>

      {/* Active Orchestration */}
      <div className="bg-gradient-to-r from-primary/10 to-accent-code/10 border border-primary/20 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Orquestación Activa</h3>
              <p className="text-text-secondary text-sm">Construyendo API REST con FastAPI • 3 agentes trabajando</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">En progreso</span>
            <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-light">Ver detalles</button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar agentes, capacidades..."
          className="w-full pl-10 pr-4 py-2 bg-panel border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Agents Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map(agent => (
          <AgentCard key={agent.id} agent={agent} onClick={() => setSelectedAgent(agent)} />
        ))}
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}

function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const Icon = agentIcons[agent.type] || Bot;
  const statusConfig: Record<string, { dot: string; label: string; color: string }> = {
    'active': { dot: 'bg-primary animate-pulse', label: 'Activo', color: 'text-primary' },
    'working': { dot: 'bg-yellow-500 animate-pulse', label: 'Trabajando', color: 'text-yellow-500' },
    'idle': { dot: 'bg-text-muted', label: 'Inactivo', color: 'text-text-muted' },
  };

  const config = statusConfig[agent.status];

  return (
    <button
      onClick={onClick}
      className="bg-panel border border-border rounded-2xl p-5 hover:border-primary/50 hover:bg-canvas/50 transition-all text-left group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">{agent.name}</h3>
            <span className="text-xs text-text-muted capitalize">{agent.type}</span>
          </div>
        </div>
        <div className={clsx('w-2 h-2 rounded-full', config.dot)} />
      </div>
      <p className="text-sm text-text-secondary mb-3 line-clamp-2">{agent.description}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {agent.capabilities.slice(0, 3).map(cap => (
          <span key={cap} className="px-2 py-0.5 text-xs bg-canvas border border-border rounded">{cap}</span>
        ))}
        {agent.capabilities.length > 3 && (
          <span className="px-2 py-0.5 text-xs text-text-muted">+{agent.capabilities.length - 3} más</span>
        )}
      </div>
      {agent.currentTask && (
        <div className="pt-3 border-t border-border flex items-center gap-2 text-xs">
          <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
          <span className="text-text-muted truncate">{agent.currentTask}</span>
        </div>
      )}
    </button>
  );
}

function AgentDetailModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const Icon = agentIcons[agent.type] || Bot;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-panel border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl">{agent.name}</h2>
              <span className="text-sm text-text-muted capitalize">{agent.type}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-canvas transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <h3 className="font-semibold mb-2">Descripción</h3>
            <p className="text-text-secondary">{agent.description}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Capacidades</h3>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map(cap => (
                <span key={cap} className="px-3 py-1 bg-canvas border border-border rounded-lg text-sm">{cap}</span>
              ))}
            </div>
          </div>
          {agent.currentTask && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Tarea Actual
              </h3>
              <p className="text-text-secondary">{agent.currentTask}</p>
            </div>
          )}
          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-light">
              <Play className="w-4 h-4 mr-2" />
              Ejecutar Tarea
            </button>
            <button className="px-4 py-2 bg-panel border border-border text-text-primary rounded-lg font-medium hover:bg-border transition-colors">
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}