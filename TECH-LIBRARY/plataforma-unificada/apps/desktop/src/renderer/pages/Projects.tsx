import React from 'react';
import { 
  FolderGit, Plus, Code, FileText, GitBranch, 
  Shield, Eye, ExternalLink, MoreVertical,
  TrendingUp, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

interface Project {
  id: string;
  name: string;
  description: string;
  tech: string[];
  status: 'active' | 'completed' | 'archived';
  progress: number;
  lastModified: string;
  repo?: string;
}

const mockProjects: Project[] = [
  { id: '1', name: 'Task Manager CLI', description: 'CLI en Python para gestionar tareas con SQLite', tech: ['Python', 'SQLite', 'Click'], status: 'completed', progress: 100, lastModified: 'hace 2 días', repo: 'github.com/user/task-cli' },
  { id: '2', name: 'Portafolio Personal', description: 'HTML+CSS responsive con proyectos', tech: ['HTML', 'CSS', 'JS'], status: 'active', progress: 65, lastModified: 'hace 5 horas' },
  { id: '3', name: 'Pomodoro Web Timer', description: 'Timer con intervalos, sonido, historial en localStorage', tech: ['JavaScript', 'localStorage'], status: 'active', progress: 40, lastModified: 'hace 1 día' },
  { id: '4', name: 'API REST Mock', description: 'FastAPI con 3 endpoints + tests', tech: ['Python', 'FastAPI', 'Pytest'], status: 'completed', progress: 100, lastModified: 'hace 1 semana', repo: 'github.com/user/fastapi-mock' },
  { id: '5', name: 'Analizador CSV', description: 'Lee CSV y muestra totales/promedios/top-N', tech: ['Python', 'Pandas'], status: 'archived', progress: 80, lastModified: 'hace 2 semanas' },
];

export function Projects() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Mis Proyectos</h1>
          <p className="text-text-secondary mt-1">Aprende construyendo proyectos reales</p>
        </div>
        <a href="/projects/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </a>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProjects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <div className="bg-panel border border-border rounded-2xl p-8 text-center">
        <FolderGit className="w-12 h-12 mx-auto text-text-muted mb-4" />
        <h3 className="text-lg font-semibold mb-2">¿No tienes proyectos aún?</h3>
        <p className="text-text-muted mb-6">Empieza tu primer proyecto guiado o crea uno desde cero</p>
        <div className="flex justify-center gap-3">
          <a href="/projects/new" className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Crear mi primer proyecto
          </a>
          <a href="/learn" className="px-6 py-3 bg-panel border border-border text-text-primary rounded-lg font-medium hover:bg-border transition-colors">
            Ver proyectos guiados
          </a>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const statusConfig: Record<string, { dot: string; label: string; color: string }> = {
    'active': { dot: 'bg-primary animate-pulse', label: 'Activo', color: 'text-primary' },
    'completed': { dot: 'bg-green-500', label: 'Completado', color: 'text-green-500' },
    'archived': { dot: 'bg-text-muted', label: 'Archivado', color: 'text-text-muted' },
  };

  const config = statusConfig[project.status];

  return (
    <div className="bg-panel border border-border rounded-2xl p-5 hover:border-primary/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-text-primary">{project.name}</h3>
        </div>
        <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', `bg-${config.color.replace('text-', '')}/10 ${config.color} border border-${config.color.replace('text-', '')}/20`)}>
          {config.label}
        </span>
      </div>
      <p className="text-text-secondary text-sm mb-3 line-clamp-2">{project.description}</p>
      <div className="flex flex-wrap gap-1 mb-4">
        {project.tech.map(t => (
          <span key={t} className="px-2 py-0.5 text-xs bg-canvas border border-border rounded">{t}</span>
        ))}
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-muted">Progreso</span>
          <span className="font-medium">{project.progress}%</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${project.progress}%` }}></div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {project.lastModified}</span>
          {project.repo && (
            <a href={`https://${project.repo}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
              <ExternalLink className="w-3 h-3" />
              Repo
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-canvas transition-colors" title="Ver código"><Code className="w-4 h-4" /></button>
          <button className="p-2 rounded-lg hover:bg-canvas transition-colors" title="Ver en vivo"><Eye className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}