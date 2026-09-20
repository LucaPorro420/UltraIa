import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, ChevronDown, BookOpen, Award, 
  Clock, Target, CheckCircle, Lock, Star
} from 'lucide-react';
import clsx from 'clsx';

interface Course {
  id: string;
  title: string;
  level: string;
  category: string;
  lessons: number;
  quizzes: number;
  hours: number;
  progress: number;
  free: boolean;
  color: string;
  icon: string;
}

const levels = [
  { value: '', label: 'Todos los niveles' },
  { value: 'explorer', label: '🌱 Explorador (Nivel 0)' },
  { value: 'beginner', label: '🌿 Principiante (Nivel 1)' },
  { value: 'intermediate', label: '🌳 Intermedio (Nivel 2)' },
  { value: 'advanced', label: '🌲 Avanzado (Nivel 3)' },
  { value: 'professional', label: '🏔️ Profesional (Nivel 4)' },
  { value: 'architect', label: '🏔️ Arquitecto (Nivel 5)' },
];

const categories = [
  { value: '', label: 'Todas las categorías' },
  { value: 'fundamentals', label: 'Fundamentos' },
  { value: 'web-core', label: 'Web Core' },
  { value: 'backend', label: 'Backend' },
  { value: 'mobile', label: 'Móvil' },
  { value: 'frameworks', label: 'Frameworks' },
  { value: 'data-ai', label: 'Datos & IA' },
  { value: 'professional', label: 'Profesional' },
  { value: 'devops', label: 'DevOps' },
  { value: 'security', label: 'Seguridad' },
  { value: 'architecture', label: 'Arquitectura' },
];

const mockCourses: Course[] = [
  { id: 'logic', title: 'Lógica Computacional', level: 'explorer', category: 'fundamentals', lessons: 8, quizzes: 16, hours: 12, progress: 100, free: true, color: 'text-primary', icon: '🧠' },
  { id: 'algorithms', title: 'Algoritmos y Estructuras', level: 'explorer', category: 'fundamentals', lessons: 12, quizzes: 24, hours: 20, progress: 80, free: true, color: 'text-accent-text', icon: '📊' },
  { id: 'git', title: 'Git & GitHub', level: 'beginner', category: 'fundamentals', lessons: 10, quizzes: 20, hours: 15, progress: 100, free: true, color: 'text-accent-code', icon: '📦' },
  { id: 'terminal', title: 'Terminal & Bash', level: 'beginner', category: 'fundamentals', lessons: 8, quizzes: 16, hours: 10, progress: 60, free: true, color: 'text-accent-video', icon: '💻' },
  { id: 'html-css', title: 'HTML Semántico & CSS Moderno', level: 'beginner', category: 'web-core', lessons: 14, quizzes: 28, hours: 25, progress: 100, free: true, color: 'text-primary', icon: '🌐' },
  { id: 'javascript', title: 'JavaScript Moderno (ES6+)', level: 'beginner', category: 'web-core', lessons: 16, quizzes: 32, hours: 30, progress: 75, free: true, color: 'text-accent-text', icon: '📜' },
  { id: 'typescript', title: 'TypeScript Avanzado', level: 'intermediate', category: 'web-core', lessons: 18, quizzes: 36, hours: 35, progress: 45, free: true, color: 'text-primary', icon: '🔷' },
  { id: 'react', title: 'React + Next.js 14', level: 'intermediate', category: 'frameworks', lessons: 22, quizzes: 44, hours: 45, progress: 30, free: false, color: 'text-accent-code', icon: '⚛️' },
  { id: 'angular', title: 'Angular 17+', level: 'intermediate', category: 'frameworks', lessons: 20, quizzes: 40, hours: 40, progress: 0, free: false, color: 'text-accent-video', icon: '🅰️' },
  { id: 'python', title: 'Python para Backend', level: 'beginner', category: 'backend', lessons: 16, quizzes: 32, hours: 30, progress: 60, free: true, color: 'text-accent-video', icon: '🐍' },
  { id: 'fastapi', title: 'FastAPI + SQLAlchemy', level: 'intermediate', category: 'backend', lessons: 18, quizzes: 36, hours: 35, progress: 20, free: false, color: 'text-primary', icon: '⚡' },
  { id: 'sql', title: 'SQL & PostgreSQL', level: 'intermediate', category: 'backend', lessons: 14, quizzes: 28, hours: 25, progress: 40, free: true, color: 'text-accent-code', icon: '🗄️' },
  { id: 'docker', title: 'Docker & Contenedores', level: 'intermediate', category: 'devops', lessons: 14, quizzes: 28, hours: 25, progress: 50, free: true, color: 'text-primary', icon: '🐳' },
  { id: 'ml-basics', title: 'Machine Learning Básico', level: 'intermediate', category: 'data-ai', lessons: 16, quizzes: 32, hours: 35, progress: 25, free: true, color: 'text-accent-video', icon: '🤖' },
  { id: 'architecture', title: 'Arquitectura de Software', level: 'advanced', category: 'architecture', lessons: 18, quizzes: 36, hours: 40, progress: 0, free: false, color: 'text-primary', icon: '🏗️' },
];

const levelOrder: Record<string, number> = { explorer: 0, beginner: 1, intermediate: 2, advanced: 3, professional: 4, architect: 5 };
const levelLabels: Record<string, string> = {
  explorer: '🌱 Explorador',
  beginner: '🌿 Principiante',
  intermediate: '🌳 Intermedio',
  advanced: '🌲 Avanzado',
  professional: '🏔️ Profesional',
  architect: '🏔️ Arquitecto',
};

const categoryLabels: Record<string, string> = {
  fundamentals: 'Fundamentos',
  'web-core': 'Web Core',
  backend: 'Backend',
  mobile: 'Móvil',
  frameworks: 'Frameworks',
  'data-ai': 'Datos & IA',
  professional: 'Profesional',
  devops: 'DevOps',
  security: 'Seguridad',
  architecture: 'Arquitectura',
};

const colorClasses: Record<string, { badge: string; progress: string }> = {
  'text-primary': { badge: 'bg-primary/10 text-primary border-primary/20', progress: 'bg-primary' },
  'text-accent-text': { badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', progress: 'bg-yellow-500' },
  'text-accent-code': { badge: 'bg-green-500/10 text-green-500 border-green-500/20', progress: 'bg-green-500' },
  'text-accent-video': { badge: 'bg-red-500/10 text-red-500 border-red-500/20', progress: 'bg-red-500' },
};

export function Learn() {
  const [levelFilter, setLevelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCourses, setFilteredCourses] = useState(mockCourses);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    let filtered = [...mockCourses];
    
    if (levelFilter) filtered = filtered.filter(c => c.level === levelFilter);
    if (categoryFilter) filtered = filtered.filter(c => c.category === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.title.toLowerCase().includes(q));
    }
    
    filtered.sort((a, b) => {
      const levelDiff = levelOrder[a.level] - levelOrder[b.level];
      if (levelDiff !== 0) return levelDiff;
      return b.progress - a.progress;
    });
    
    setFilteredCourses(filtered);
  }, [levelFilter, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Catálogo de Cursos</h1>
          <p className="text-text-secondary mt-1">{filteredCourses.length} cursos • 269 lecciones • 538 quizzes</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="px-3 py-2 bg-panel border border-border rounded-lg text-sm">
            <option value="grid">Cuadrícula</option>
            <option value="list">Lista</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-panel border border-border rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cursos..."
              className="w-full pl-10 pr-4 py-2 bg-canvas border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="px-4 py-2 bg-canvas border border-border rounded-lg min-w-[200px]">
            {levels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2 bg-canvas border border-border rounded-lg min-w-[200px]">
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Learning Paths */}
      <div className="bg-gradient-to-r from-primary/10 to-accent-code/10 border border-primary/20 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Rutas de Aprendizaje Guiadas
            </h2>
            <p className="text-text-secondary mt-1">Rutas estructuradas con certificaciones verificables</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LearningPathCard title="Full Stack Developer" courses={12} duration="6 meses" color="primary" progress={65} />
            <LearningPathCard title="AI/ML Engineer" courses={10} duration="5 meses" color="accent-video" progress={30} />
            <LearningPathCard title="DevOps & Cloud" courses={8} duration="4 meses" color="accent-code" progress={45} />
            <LearningPathCard title="Software Architect" courses={9} duration="5 meses" color="accent-text" progress={20} />
          </div>
        </div>
      </div>

      {/* Course Grid */}
      <div className={clsx('gap-6', viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-4')}>
        {filteredCourses.map(course => (
          viewMode === 'grid' ? (
            <CourseCard key={course.id} course={course} />
          ) : (
            <CourseListItem key={course.id} course={course} />
          )
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-text-muted mb-4" />
          <h3 className="text-lg font-semibold">No se encontraron cursos</h3>
          <p className="text-text-muted mt-1">Intenta ajustar tus filtros o búsqueda</p>
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  const colors = colorClasses[course.color] || colorClasses['text-primary'];
  const levelLabel = levelLabels[course.level] || course.level;
  const categoryLabel = categoryLabels[course.category] || course.category;

  return (
    <article className="course-card bg-panel border border-border rounded-2xl p-5 hover:border-primary/50 transition-all duration-300 group flex flex-col" data-level={course.level} data-category={course.category}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{course.icon}</span>
        {!course.free ? (
          <span className="px-2 py-0.5 text-xs font-medium bg-accent-text/10 text-accent-text border border-accent-text/20 rounded">PRO</span>
        ) : (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20 rounded">GRATIS</span>
        )}
      </div>
      <h3 className="font-semibold text-text-primary mb-2 group-hover:text-primary transition-colors line-clamp-2">{course.title}</h3>
      <div className="flex items-center gap-2 text-xs mb-3">
        <span className="px-2 py-0.5 bg-canvas rounded text-text-muted">{levelLabel}</span>
        <span className="px-2 py-0.5 bg-canvas rounded text-text-muted">{categoryLabel}</span>
      </div>
      <div className="flex items-center justify-between text-sm text-text-muted mb-3">
        <span>{course.lessons} lecciones</span>
        <span>{course.quizzes} quizzes</span>
        <span>{course.hours}h</span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden mb-4 flex-1">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${course.progress}%` }}></div>
      </div>
      <div className="flex items-center justify-between">
        <span className={clsx('text-sm font-medium px-3 py-1 rounded-full', colors.badge)}>{course.progress}%</span>
        <a href={`/learn/${course.id}`} className="text-sm font-medium text-primary hover:text-primary-light transition-colors flex items-center gap-1">
          {course.progress === 100 ? '✅ Completado' : course.progress > 0 ? 'Continuar →' : 'Empezar →'}
        </a>
      </div>
    </article>
  );
}

function CourseListItem({ course }: { course: Course }) {
  const colors = colorClasses[course.color] || colorClasses['text-primary'];
  const levelLabel = levelLabels[course.level] || course.level;
  const categoryLabel = categoryLabels[course.category] || course.category;

  return (
    <div className="bg-panel border border-border rounded-xl p-4 hover:border-primary/50 transition-all">
      <div className="flex items-center gap-4">
        <span className="text-3xl">{course.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-text-primary">{course.title}</h3>
            {!course.free && <span className="px-2 py-0.5 text-xs font-medium bg-accent-text/10 text-accent-text border border-accent-text/20 rounded">PRO</span>}
            {course.free && <span className="px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20 rounded">GRATIS</span>}
          </div>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span className="px-2 py-0.5 bg-canvas rounded">{levelLabel}</span>
            <span className="px-2 py-0.5 bg-canvas rounded">{categoryLabel}</span>
            <span>{course.lessons} lecciones · {course.quizzes} quizzes · {course.hours}h</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32 h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${course.progress}%` }}></div>
          </div>
          <span className={clsx('text-sm font-medium px-3 py-1 rounded-full', colors.badge)}>{course.progress}%</span>
          <a href={`/learn/${course.id}`} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors">
            {course.progress === 100 ? '✅' : course.progress > 0 ? 'Continuar' : 'Empezar'}
          </a>
        </div>
      </div>
    </div>
  );
}

function LearningPathCard({ title, courses, duration, color, progress }: { title: string; courses: number; duration: string; color: string; progress: number }) {
  const colorClassesMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    'accent-text': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'accent-code': 'bg-green-500/10 text-green-500 border-green-500/20',
    'accent-video': 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <a href={`/learn/path/${title.toLowerCase().replace(/\s+/g, '-')}`} className={clsx('flex items-center gap-3 p-3 bg-panel border border-border rounded-xl hover:border-primary/50 transition-colors group', colorClassesMap[color])}>
      <span className="text-2xl">🛤️</span>
      <div>
        <p className="font-semibold text-text-primary group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-text-muted">{courses} cursos · {duration}</p>
      </div>
      <div className="flex-1 hidden sm:block">
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      <span className="text-sm font-medium text-primary">{progress}%</span>
    </a>
  );
}