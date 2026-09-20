import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FolderGit, Code, FileText, GitBranch, Shield, 
  Eye, ExternalLink, MoreVertical, ChevronLeft,
  Plus, Save, Play, Terminal, Bot, Zap,
  CheckCircle, AlertCircle, Clock, Download
} from 'lucide-react';
import clsx from 'clsx';
import { FileTree } from '../components/FileTree';

interface Project {
  id: string;
  name: string;
  description: string;
  tech: string[];
  status: 'active' | 'completed' | 'archived';
  progress: number;
  lastModified: string;
  repo?: string;
  files: FileItem[];
  tasks: Task[];
  deployments: Deployment[];
}

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  language?: string;
  children?: FileItem[];
  expanded?: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assignee?: string;
}

interface Deployment {
  id: string;
  environment: string;
  url: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
}

const mockProject: Project = {
  id: '1',
  name: 'Task Manager CLI',
  description: 'CLI en Python para gestionar tareas con SQLite. Incluye comandos add, list, complete, delete con persistencia en JSON.',
  tech: ['Python', 'SQLite', 'Click', 'Pytest'],
  status: 'completed',
  progress: 100,
  lastModified: 'hace 2 días',
  repo: 'github.com/user/task-cli',
  files: [
    { name: 'src', type: 'folder', path: 'src', expanded: true, children: [
      { name: 'main.py', type: 'file', path: 'src/main.py', language: 'python', content: '#!/usr/bin/env python3\n"""Task Manager CLI - Gestor de tareas en línea de comandos"""\nimport click\nfrom storage.json_storage import JSONStorage\nfrom commands import add, list, complete, delete\n\n@click.group()\n@click.version_option(version="1.0.0")\ndef cli():\n    """Task Manager - Organiza tus tareas fácilmente"""\n    pass\n\ncli.add_command(add.add_task)\ncli.add_command(list.list_tasks)\ncli.add_command(complete.complete_task)\ncli.add_command(delete.delete_task)\n\nif __name__ == "__main__":\n    cli()\n' },
      { name: 'commands', type: 'folder', path: 'src/commands', children: [
        { name: 'add.py', type: 'file', path: 'src/commands/add.py', language: 'python', content: 'import click\nfrom storage.json_storage import JSONStorage\n\n@click.command()\n@click.argument("title")\n@click.option("--description", "-d", default="", help="Descripción de la tarea")\n@click.option("--priority", "-p", type=click.Choice(["low", "medium", "high"]), default="medium")\ndef add_task(title, description, priority):\n    """Añadir una nueva tarea"""' },
        { name: 'list.py', type: 'file', path: 'src/commands/list.py', language: 'python', content: 'import click\nfrom storage.json_storage import JSONStorage\n\n@click.command()\n@click.option("--status", "-s", type=click.Choice(["all", "pending", "completed"]), default="all")\ndef list_tasks(status):\n    """Listar tareas"""' },
      ]},
      { name: 'storage', type: 'folder', path: 'src/storage', children: [
        { name: 'json_storage.py', type: 'file', path: 'src/storage/json_storage.py', language: 'python', content: 'import json\nfrom pathlib import Path\nfrom typing import List, Dict\n\nclass JSONStorage:\n    def __init__(self, filepath: str = "tasks.json"):\n        self.filepath = Path(filepath)\n        self._ensure_file()\n    \n    def _ensure_file(self):\n        if not self.filepath.exists():\n            self.filepath.write_text("[]")\n    \n    def load(self) -> List[Dict]:\n        return json.loads(self.filepath.read_text())\n    \n    def save(self, tasks: List[Dict]):\n        self.filepath.write_text(json.dumps(tasks, indent=2))\n' },
      ]},
    ]},
    { name: 'tests', type: 'folder', path: 'tests', children: [
      { name: 'test_commands.py', type: 'file', path: 'tests/test_commands.py', language: 'python', content: 'import pytest\nfrom click.testing import CliRunner\nfrom src.main import cli\n\nclass TestCommands:\n    def test_add_task(self):\n        runner = CliRunner()\n        result = runner.invoke(cli, ["add", "Test task"])\n        assert result.exit_code == 0\n' },
      { name: 'test_storage.py', type: 'file', path: 'tests/test_storage.py', language: 'python', content: 'import pytest\nfrom src.storage.json_storage import JSONStorage\n\ndef test_storage(tmp_path):\n    storage = JSONStorage(str(tmp_path / "test.json"))\n    storage.save([{"id": 1, "title": "Test"}])' },
    ]},
    { name: 'README.md', type: 'file', path: 'README.md', language: 'markdown', content: '# Task Manager CLI\n\nGestor de tareas en línea de comandos construido con Python, Click y SQLite.\n\n## Instalación\n```bash\npip install -e .\n```\n\n## Uso\n```bash\ntask add "Mi tarea" --priority high\ntask list\ntask complete 1\ntask delete 1\n```\n' },
    { name: 'requirements.txt', type: 'file', path: 'requirements.txt', language: 'text', content: 'click==8.1.7\npytest==7.4.3\n' },
    { name: 'pyproject.toml', type: 'file', path: 'pyproject.toml', language: 'toml', content: '[build-system]\nrequires = ["setuptools>=61.0"]\nbuild-backend = "setuptools.build_meta"\n\n[project]\nname = "task-manager"\nversion = "1.0.0"\ndescription = "CLI Task Manager"\nauthors = [{name = "Usuario", email = "user@example.com"}]\nlicense = {text = "MIT"}\nreadme = "README.md"\nrequires-python = ">=3.8"\ndependencies = [\n    "click>=8.1",\n]\n\n[project.optional-dependencies]\ndev = ["pytest>=7.0"]\n\n[tool.pytest.ini_options]\ntestpaths = ["tests"]\n' },
  ],
  tasks: [
    { id: '1', title: 'Configurar proyecto base', description: 'Crear estructura de carpetas y pyproject.toml', status: 'done', assignee: 'Usuario' },
    { id: '2', title: 'Implementar almacenamiento JSON', description: 'Clase JSONStorage con load/save', status: 'done', assignee: 'Usuario' },
    { id: '3', title: 'Comando add', description: 'Añadir tareas con título, descripción, prioridad', status: 'done', assignee: 'Usuario' },
    { id: '4', title: 'Comando list', description: 'Listar tareas con filtros', status: 'done', assignee: 'Usuario' },
    { id: '5', title: 'Comando complete', description: 'Marcar tareas como completadas', status: 'done', assignee: 'Usuario' },
    { id: '6', title: 'Comando delete', description: 'Eliminar tareas por ID', status: 'done', assignee: 'Usuario' },
    { id: '7', title: 'Tests unitarios', description: 'Tests para todos los comandos', status: 'done', assignee: 'Usuario' },
    { id: '8', title: 'Documentación README', description: 'README con instalación y uso', status: 'done', assignee: 'Usuario' },
  ],
  deployments: [
    { id: '1', environment: 'GitHub Releases', url: 'https://github.com/user/task-cli/releases', status: 'success', timestamp: '2024-01-15 14:30' },
    { id: '2', environment: 'PyPI', url: 'https://pypi.org/project/task-manager/', status: 'success', timestamp: '2024-01-15 14:45' },
    { id: '3', environment: 'Docker Hub', url: 'https://hub.docker.com/r/user/task-cli', status: 'pending', timestamp: '2024-01-15 15:00' },
  ],
};

export function ProjectDetail() {
  const { projectId } = useParams();
  const project = mockProject;
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'tasks' | 'deployments'>('overview');
  const [activeFile, setActiveFile] = useState<FileItem | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);

  const statusConfig: Record<string, { dot: string; label: string; color: string }> = {
    'active': { dot: 'bg-primary animate-pulse', label: 'Activo', color: 'text-primary' },
    'completed': { dot: 'bg-green-500', label: 'Completado', color: 'text-green-500' },
    'archived': { dot: 'bg-text-muted', label: 'Archivado', color: 'text-text-muted' },
  };

  const config = statusConfig[project.status];

  return (
    <div className="h-full flex flex-col">
      {/* Project Header */}
      <div className="border-b border-border bg-panel/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/projects" className="p-2 rounded-lg hover:bg-cactus transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-display font-bold">{project.name}</h1>
                  <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', `bg-${config.color.replace('text-', '')}/10 ${config.color} border border-${config.color.replace('text-', '')}/20`)}>
                    {config.label}
                  </span>
                </div>
                <p className="text-text-secondary text-sm">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {project.lastModified}</span>
                {project.repo && (
                  <a href={`https://${project.repo}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                    <ExternalLink className="w-4 h-4" />
                    Repo
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-panel border border-border text-text-primary rounded-lg hover:bg-cactus flex items-center gap-1 text-sm">
                  <Download className="w-4 h-4" />
                  Exportar
                </button>
                <button className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-light flex items-center gap-1 text-sm">
                  <Play className="w-4 h-4" />
                  Ejecutar
                </button>
              </div>
            </div>
          </div>

          {/* Progress & Stats */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem label="Progreso" value={`${project.progress}%`} icon={CheckCircle} color="text-green-500" />
            <StatItem label="Archivos" value={countFiles(project.files).toString()} icon={FileText} color="text-primary" />
            <StatItem label="Tareas" value={`${project.tasks.filter(t => t.status === 'done').length}/${project.tasks.length}`} icon={CheckCircle} color="text-accent-text" />
            <StatItem label="Despliegues" value={project.deployments.filter(d => d.status === 'success').length.toString()} icon={Zap} color="text-accent-video" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - File Tree */}
        <div className="w-72 bg-panel border-r border-border flex flex-col">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Archivos</h3>
            <button className="p-1.5 rounded hover:bg-cactus transition-colors" title="Nuevo archivo"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <FileTree items={project.files} onToggle={undefined} onOpen={setActiveFile} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="flex items-center border-b border-border px-4">
            {(['overview', 'code', 'tasks', 'deployments'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'overview' && <OverviewTab project={project} />}
            {activeTab === 'code' && <CodeTab project={project} activeFile={activeFile} onFileChange={setActiveFile} />}
            {activeTab === 'tasks' && <TasksTab tasks={project.tasks} />}
            {activeTab === 'deployments' && <DeploymentsTab deployments={project.deployments} />}
          </div>

          {/* Terminal */}
          {terminalOpen && (
            <TerminalPanel onClose={() => setTerminalOpen(false)} projectName={project.name} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-cactus/50 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted">{label}</p>
          <p className="text-2xl font-display font-bold">{value}</p>
        </div>
        <Icon className={clsx('w-6 h-6', color)} />
      </div>
    </div>
  );
}

function OverviewTab({ project }: { project: Project }) {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="bg-panel border border-border rounded-2xl p-6">
        <h3 className="font-semibold mb-4">Descripción del Proyecto</h3>
        <p className="text-text-secondary whitespace-pre-wrap">{project.description}</p>
      </div>
      
      <div className="bg-panel border border-border rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-primary" />
          Stack Tecnológico
        </h3>
        <div className="flex flex-wrap gap-2">
          {project.tech.map(t => (
            <span key={t} className="px-3 py-1 bg-cactus border border-border rounded-full text-sm">{t}</span>
          ))}
        </div>
      </div>

      <div className="bg-panel border border-border rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Tareas Completadas
        </h3>
        <div className="grid gap-2">
          {project.tasks.filter(t => t.status === 'done').map(task => (
            <div key={task.id} className="flex items-center gap-3 p-3 bg-cactus/50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-text-muted">{task.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CodeTab({ project, activeFile, onFileChange }: { project: Project; activeFile: FileItem | null; onFileChange: (f: FileItem) => void }) {
  return (
    <div className="flex h-full">
      <div className="w-72 bg-panel border-r border-border flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">EXPLORER</h3>
          <button className="p-1.5 rounded hover:bg-cactus transition-colors"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <FileTree items={project.files} onToggle={undefined} onOpen={onFileChange} />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-cactus border-b border-border">
          <div className="flex items-center gap-2">
            {activeFile && (
              <>
                <span className="text-lg">{getFileIcon(activeFile.language)}</span>
                <span className="font-medium truncate max-w-[200px]">{activeFile.name}</span>
                <span className="px-2 py-0.5 text-xs bg-cactus border border-border rounded">{activeFile.language}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded hover:bg-cactus transition-colors" title="Guardar"><Save className="w-4 h-4" /></button>
            <button className="p-1.5 rounded hover:bg-cactus transition-colors" title="Terminal"><Terminal className="w-4 h-4" /></button>
            <button className="p-1.5 rounded hover:bg-cactus transition-colors" title="IA Assistant"><Bot className="w-4 h-4" /></button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 bg-cactus">
          {activeFile && activeFile.content ? (
            <CodeEditor content={activeFile.content} language={activeFile.language || 'plaintext'} />
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Selecciona un archivo para editar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



function CodeEditor({ content, language }: { content: string; language: string }) {
  return (
    <div className="h-full bg-cactus rounded-lg overflow-hidden font-mono text-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-cactus/50 border-b border-border">
        <span className="text-text-muted">{language}</span>
        <span className="px-2 py-0.5 text-xs bg-cactus border border-border rounded">{language}</span>
      </div>
      <textarea
        defaultValue={content}
        className="w-full h-full bg-transparent text-text-primary focus:outline-none resize-none p-4"
        spellCheck={false}
        style={{ lineHeight: '1.6', tabSize: 2 }}
      />
    </div>
  );
}

function getFileIcon(language?: string): string {
  const icons: Record<string, string> = {
    python: '🐍', javascript: '📜', typescript: '🔷', html: '🌐', css: '🎨', 
    markdown: '📝', json: '📋', sql: '🗄️', toml: '⚙️', text: '📄'
  };
  return icons[language || ''] || '📄';
}

function TasksTab({ tasks }: { tasks: Task[] }) {
  const columns = [
    { id: 'todo', title: 'Por Hacer', status: 'todo' as const },
    { id: 'in_progress', title: 'En Progreso', status: 'in_progress' as const },
    { id: 'review', title: 'Revisión', status: 'review' as const },
    { id: 'done', title: 'Hecho', status: 'done' as const },
  ];

  return (
    <div className="p-4 overflow-x-auto">
      <div className="flex gap-4 min-w-max">
        {columns.map(col => (
          <div key={col.id} className="w-80 bg-panel border border-border rounded-xl flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold capitalize">{col.title.replace('_', ' ')}</h3>
              <span className="px-2 py-0.5 text-xs bg-cactus border border-border rounded">{tasks.filter(t => t.status === col.status).length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tasks.filter(t => t.status === col.status).map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const statusColors: Record<string, string> = {
    todo: 'bg-text-muted',
    in_progress: 'bg-primary',
    review: 'bg-accent-text',
    done: 'bg-green-500',
  };

  return (
    <div className="bg-cactus/50 border border-border rounded-lg p-3 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{task.title}</p>
          <p className="text-xs text-text-muted mt-1">{task.description}</p>
        </div>
        <span className={clsx('w-2 h-2 rounded-full flex-shrink-0 mt-1', statusColors[task.status])} />
      </div>
      {task.assignee && (
        <div className="mt-2 pt-2 border-t border-border flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-xs font-semibold">{task.assignee.charAt(0)}</span>
          </div>
          <span className="text-xs text-text-muted">{task.assignee}</span>
        </div>
      )}
    </div>
  );
}

function DeploymentsTab({ deployments }: { deployments: Deployment[] }) {
  const statusConfig: Record<string, { dot: string; label: string; color: string }> = {
    'success': { dot: 'bg-green-500', label: 'Éxito', color: 'text-green-500' },
    'failed': { dot: 'bg-red-500', label: 'Fallido', color: 'text-red-500' },
    'pending': { dot: 'bg-yellow-500 animate-pulse', label: 'Pendiente', color: 'text-yellow-500' },
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Historial de Despliegues</h3>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Nuevo Despliegue
        </button>
      </div>
      <div className="space-y-3">
        {deployments.map(dep => {
          const config = statusConfig[dep.status];
          return (
            <div key={dep.id} className="bg-panel border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{dep.environment}</p>
                    <p className="text-sm text-text-muted">{dep.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium', `bg-${config.color.replace('text-', '')}/10 ${config.color} border border-${config.color.replace('text-', '')}/20`)}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
                    {config.label}
                  </span>
                  <span className="text-sm text-text-muted">{dep.timestamp}</span>
                  <a href={dep.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-cactus transition-colors text-text-muted">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TerminalPanel({ onClose, projectName }: { onClose: () => void; projectName: string }) {
  const [history, setHistory] = useState<string[]>([`$ cd ${projectName}`, `$ Bienvenido al terminal del proyecto`, `$ `]);
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim()) return;
    setHistory(prev => [...prev, `$ ${input}`, `Ejecutando: ${input}...`, `$ `]);
    setInput('');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-72 bg-canvas border-t border-border z-40 flex flex-col animate-slide-up">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Terminal className="w-4 h-4" /> Terminal</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-cactus"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-sm text-text-secondary bg-canvas">
        {history.map((line, i) => (
          <div key={i} className={clsx('font-mono', line.startsWith('$') && 'text-text-primary')}>{line}</div>
        ))}
      </div>
      <div className="flex items-center gap-2 p-2 border-t border-border">
        <span className="text-text-primary font-mono">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="flex-1 bg-transparent text-text-primary focus:outline-none font-mono text-sm"
          placeholder="Escribe un comando..."
        />
      </div>
    </div>
  );
}

function countFiles(items: FileItem[]): number {
  let count = 0;
  for (const item of items) {
    if (item.type === 'file') count++;
    else if (item.children) count += countFiles(item.children);
  }
  return count;
}