import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Award, FolderGit, GraduationCap, Flame, 
  Play, Pause, RotateCcw, Target, Zap, Bot, Plus,
  TrendingUp, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import clsx from 'clsx';

interface CourseProgress {
  id: string;
  title: string;
  progress: number;
  currentLesson: string;
  lessons: string;
  color: string;
  icon: string;
}

interface Recommendation {
  title: string;
  reason: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

const mockCourses: CourseProgress[] = [
  { id: 'javascript', title: 'JavaScript Moderno (ES6+)', progress: 75, currentLesson: 'Async/Await y Promesas', lessons: '12/16', color: 'text-accent-text', icon: '📜' },
  { id: 'typescript', title: 'TypeScript Avanzado', progress: 45, currentLesson: 'Generics y Utility Types', lessons: '7/18', color: 'text-primary', icon: '🔷' },
  { id: 'react', title: 'React + Next.js 14', progress: 30, currentLesson: 'Server Components', lessons: '5/22', color: 'text-accent-code', icon: '⚛️' },
  { id: 'python', title: 'Python para Backend', progress: 60, currentLesson: 'FastAPI + SQLAlchemy', lessons: '9/15', color: 'text-accent-video', icon: '🐍' },
];

const mockRecommendations: Recommendation[] = [
  { title: 'Repasar: Closures en JavaScript', reason: 'Fallaste 2 preguntas en el quiz anterior', action: 'Hacer quiz de repaso', priority: 'high' },
  { title: 'Iniciar: Testing con Vitest', reason: 'Prerrequisito para el proyecto Final del módulo React', action: 'Empezar curso', priority: 'medium' },
  { title: 'Proyecto: API REST con FastAPI', reason: 'Consolida Python + BD + Testing + Deploy', action: 'Ver proyecto', priority: 'high' },
];

const quickActions = [
  { icon: Plus, label: 'Nuevo Proyecto', href: '/projects/new', color: 'bg-primary' },
  { icon: BookOpen, label: 'Explorar Cursos', href: '/learn', color: 'bg-accent-code' },
  { icon: Bot, label: 'Crear Agente', href: '/agents/new', color: 'bg-accent-video' },
  { icon: Code, label: 'Abrir IDE', href: '/ide', color: 'bg-accent-text' },
];

export function Dashboard() {
  const { user } = useAuth();
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [pomoActive, setPomoActive] = useState(false);
  const [pomoPhase, setPomoPhase] = useState<'work' | 'break'>('work');
  const [pomoToday, setPomoToday] = useState(3);

  // Pomodoro timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pomoActive) {
      interval = setInterval(() => {
        setPomoTime(prev => {
          if (prev <= 1) {
            if (pomoPhase === 'work') {
              setPomoPhase('break');
              setPomoTime(5 * 60);
              setPomoToday(prev => prev + 1);
              // Play sound
              new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT').play().catch(()=>{});
            } else {
              setPomoPhase('work');
              setPomoTime(25 * 60);
            }
            return pomoPhase === 'work' ? 5 * 60 : 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pomoActive, pomoPhase]);

  const pomoMinutes = Math.floor(pomoTime / 60);
  const pomoSeconds = pomoTime % 60;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Bienvenido, <span className="text-primary">{user?.name?.split(' ')[0] || 'Usuario'}</span> 👋</h1>
          <p className="text-text-secondary mt-1">Racha actual: <span className="font-bold text-accent-text">🔥 {12} días</span> · <span className="font-bold text-accent-text">{2847} XP</span></p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-panel border border-border rounded-lg text-sm font-medium">Nivel: Intermedio</span>
          <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-sm font-medium">💎 PRO</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Lecciones Completadas" value="87" total="269" icon={BookOpen} color="text-primary" />
        <StatCard label="Quizzes Perfectos" value="42" total="538" icon={Award} color="text-accent-text" />
        <StatCard label="Proyectos Construidos" value="8" icon={FolderGit} color="text-accent-code" />
        <StatCard label="Certificados" value="5" icon={GraduationCap} color="text-accent-video" />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Learning */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold">Continuar Aprendiendo</h2>
              <a href="/learn" className="text-sm text-primary hover:underline">Ver todos →</a>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {mockCourses.map(course => (
                <CourseProgressCard key={course.id} course={course} />
              ))}
            </div>
          </section>

          {/* AI Recommendations */}
          <section>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Recomendado por tu IA Tutor
            </h3>
            <div className="space-y-3">
              {mockRecommendations.map((rec, i) => (
                <RecommendationCard key={i} recommendation={rec} />
              ))}
            </div>
          </section>

          {/* Active Agents */}
          <section>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent-code" />
              Agentes Activos
            </h3>
            <div className="space-y-2">
              <AgentStatus name="Tutor" status="active" task="Explicando closures JS" color="text-primary" />
              <AgentStatus name="Coder" status="idle" task="Esperando tarea" color="text-text-muted" />
              <AgentStatus name="Architect" status="working" task="Diseñando API REST" color="text-accent-text" />
              <AgentStatus name="Tester" status="idle" task="Esperando código" color="text-text-muted" />
            </div>
          </section>
        </div>

        {/* Right Sidebar */}
        <aside className="space-y-6">
          {/* Pomodoro */}
          <div className="bg-panel border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-accent-video" />
              Pomodoro
            </h3>
            <div className="text-center mb-4">
              <div className="text-6xl font-mono font-bold text-text-primary font-display">{formatTime(pomoTime)}</div>
              <div className="text-sm text-text-muted mt-1 capitalize">{pomoPhase === 'work' ? 'Enfoque' : 'Descanso'}</div>
            </div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPomoActive(!pomoActive)}
                className="flex-1 bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-light transition-colors"
              >
                {pomoActive ? <Pause className="w-5 h-5 mx-auto" /> : <Play className="w-5 h-5 mx-auto" />}
              </button>
              <button
                onClick={() => { setPomoActive(false); setPomoTime(pomoPhase === 'work' ? 25 * 60 : 5 * 60); }}
                className="px-4 bg-panel border border-border text-text-secondary rounded-lg hover:bg-border transition-colors"
              >
                <RotateCcw className="w-5 h-5 mx-auto" />
              </button>
            </div>
            <div className="pt-4 border-t border-border">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Hoy</span>
                <span className="font-bold">{pomoToday} 🍅</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (pomoToday / 28) * 100)}%` }}></div>
              </div>
              <div className="text-xs text-text-muted mt-1 text-right">Meta semanal: 28/28 🍅</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-panel border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-4">Acciones Rápidas</h3>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, i) => (
                <a key={i} href={action.href} className="flex flex-col items-center gap-2 p-4 bg-canvas border border-border rounded-xl hover:border-primary/50 hover:bg-panel transition-all group">
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', action.color)}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">{action.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="bg-panel border border-border rounded-2xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-text" />
              Progreso Semanal
            </h3>
            <div className="space-y-3">
              <WeeklyProgressDay day="Lun" completed={3} total={4} />
              <WeeklyProgressDay day="Mar" completed={4} total={4} />
              <WeeklyProgressDay day="Mié" completed={2} total={4} />
              <WeeklyProgressDay day="Jue" completed={4} total={4} />
              <WeeklyProgressDay day="Vie" completed={3} total={4} />
              <WeeklyProgressDay day="Sáb" completed={2} total={3} />
              <WeeklyProgressDay day="Dom" completed={1} total={3} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value, total, icon: Icon, color }: { label: string; value: string; total?: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-panel border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-display font-bold">{value}</span>
            {total && <span className="text-text-muted">/{total}</span>}
          </div>
        </div>
        <Icon className={clsx('text-3xl', color)} />
      </div>
    </div>
  );
}

function CourseProgressCard({ course }: { course: CourseProgress }) {
  const colorClasses: Record<string, string> = {
    'text-primary': 'bg-primary/10 border-primary/20',
    'text-accent-text': 'bg-yellow-500/10 border-yellow-500/20',
    'text-accent-code': 'bg-green-500/10 border-green-500/20',
    'text-accent-video': 'bg-red-500/10 border-red-500/20',
  };

  const bgClass = colorClasses[course.color] || colorClasses['text-primary'];

  return (
    <a href={`/learn/${course.id}`} className="block bg-panel border border-border rounded-2xl p-5 hover:border-primary/50 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{course.icon}</span>
        <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', bgClass)}>{course.progress}%</span>
      </div>
      <h3 className="font-semibold text-text-primary mb-2 group-hover:text-primary transition-colors">{course.title}</h3>
      <div className="h-2 bg-border rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${course.progress}%` }}></div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-muted">{course.lessons}</span>
        <span className="text-text-secondary">{course.currentLesson}</span>
      </div>
    </a>
  );
}

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const priorityColors: Record<string, string> = {
    'high': 'bg-red-500/10 text-red-500 border-red-500/20',
    'medium': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'low': 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  return (
    <div className="bg-panel border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-text-primary">{recommendation.title}</p>
          <p className="text-sm text-text-muted mt-1">{recommendation.reason}</p>
        </div>
        <span className={clsx('px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap', priorityColors[recommendation.priority])}>
          {recommendation.priority.toUpperCase()}
        </span>
      </div>
      <button className="mt-3 w-full text-left text-sm text-primary hover:text-primary-light font-medium transition-colors">{recommendation.action} →</button>
    </div>
  );
}

function AgentStatus({ name, status, task, color }: { name: string; status: 'active' | 'working' | 'idle' | 'error'; task: string; color: string }) {
  const statusConfig: Record<string, { dot: string; label: string }> = {
    'active': { dot: 'bg-primary animate-pulse', label: 'Activo' },
    'working': { dot: 'bg-yellow-500 animate-pulse', label: 'Trabajando' },
    'idle': { dot: 'bg-text-muted', label: 'Inactivo' },
    'error': { dot: 'bg-red-500', label: 'Error' },
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-canvas transition-colors">
      <div className={clsx('w-2 h-2 rounded-full', config.dot)}></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{name}</p>
        <p className="text-xs text-text-muted truncate">{task}</p>
      </div>
      <span className={clsx('text-xs px-2 py-0.5 bg-canvas rounded', color)}>{config.label}</span>
    </div>
  );
}

function WeeklyProgressDay({ day, completed, total }: { day: string; completed: number; total: number }) {
  const percent = Math.round((completed / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 text-xs font-medium text-text-muted">{day}</span>
      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }}></div>
      </div>
      <span className="w-12 text-xs text-text-muted text-right">{completed}/{total}</span>
    </div>
  );
}