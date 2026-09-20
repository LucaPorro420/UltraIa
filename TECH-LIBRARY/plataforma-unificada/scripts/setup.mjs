#!/usr/bin/env node

/**
 * Setup Script for Plataforma Total Unificada
 * 
 * Inicializa la base de datos, importa contenido y configura el entorno.
 */

import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
}

async function setup() {
  log('🚀 Iniciando setup de Plataforma Total Unificada...');
  
  // 1. Crear directorios necesarios
  log('📁 Creando directorios...');
  const dirs = [
    DATA_DIR,
    join(DATA_DIR, 'certificates'),
    join(ROOT, 'storage'),
    join(ROOT, 'plugins'),
    join(ROOT, 'logs'),
  ];
  
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      log(`  Creado: ${dir}`);
    }
  }

  // 2. Inicializar base de datos SQLite
  log('🗄️ Inicializando base de datos...');
  const dbPath = join(DATA_DIR, 'learning.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // Schema completo
  const schema = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  level TEXT DEFAULT 'explorer',
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  preferences TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  technologies TEXT,
  prerequisites TEXT,
  estimated_hours INTEGER,
  is_free BOOLEAN DEFAULT 1,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  estimated_minutes INTEGER,
  type TEXT DEFAULT 'theory',
  code_examples TEXT,
  exercises TEXT,
  resources TEXT,
  quiz_id TEXT,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  lesson_id TEXT,
  course_id TEXT,
  questions TEXT NOT NULL,
  passing_score INTEGER DEFAULT 70,
  time_limit INTEGER,
  generated_by_ai BOOLEAN DEFAULT 0,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  course_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  starter_repo TEXT,
  solution_repo TEXT,
  technologies TEXT,
  difficulty TEXT,
  estimated_days INTEGER,
  deliverables TEXT,
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- User Progress
CREATE TABLE IF NOT EXISTS user_progress (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lessons_completed TEXT DEFAULT '[]',
  quizzes_passed TEXT DEFAULT '{}',
  projects_completed TEXT DEFAULT '[]',
  xp_earned INTEGER DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  PRIMARY KEY (user_id, course_id)
);

-- Quiz Results
CREATE TABLE IF NOT EXISTS quiz_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lesson_id TEXT,
  quiz_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  attempts INTEGER DEFAULT 1,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  answers TEXT
);

-- Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  verification_code TEXT UNIQUE NOT NULL,
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  pdf_url TEXT,
  metadata TEXT
);

-- Chat History
CREATE TABLE IF NOT EXISTS chat_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent Tasks
CREATE TABLE IF NOT EXISTS agent_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT,
  type TEXT NOT NULL,
  input TEXT NOT NULL,
  assigned_agent TEXT,
  status TEXT DEFAULT 'pending',
  result TEXT,
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  parent_task_id TEXT
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  type TEXT DEFAULT 'string',
  description TEXT,
  public BOOLEAN DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id);
  `;
  
  db.exec(schema);
  log('  Esquema de base de datos creado');

  // 3. Insertar cursos mock (basados en Plataforma Total Pro)
  log('📚 Insertando cursos...');
  
  const courses = [
    // Fundamentals (Free)
    { id: 'logic', title: 'Lógica Computacional', level: 'explorer', category: 'fundamentals', lessons: 8, quizzes: 16, hours: 12, free: 1, color: 'primary', icon: '🧠', description: 'Base de la programación: algoritmos, proposiciones, razonamiento lógico' },
    { id: 'algorithms', title: 'Algoritmos y Estructuras de Datos', level: 'explorer', category: 'fundamentals', lessons: 12, quizzes: 24, hours: 20, free: 1, color: 'accent-text', icon: '📊', description: 'Complejidad, arrays, listas, árboles, grafos, ordenamiento' },
    { id: 'git', title: 'Git & GitHub', level: 'beginner', category: 'fundamentals', lessons: 10, quizzes: 20, hours: 15, free: 1, color: 'accent-code', icon: '📦', description: 'Control de versiones, ramas, merges, pull requests' },
    { id: 'terminal', title: 'Terminal & Bash', level: 'beginner', category: 'fundamentals', lessons: 8, quizzes: 16, hours: 10, free: 1, color: 'accent-video', icon: '💻', description: 'Navegación, permisos, scripting, productividad' },
    
    // Web Core
    { id: 'html-css', title: 'HTML Semántico & CSS Moderno', level: 'beginner', category: 'web-core', lessons: 14, quizzes: 28, hours: 25, free: 1, color: 'primary', icon: '🌐', description: 'HTML5, Flexbox, Grid, CSS Custom Properties, Responsive' },
    { id: 'javascript', title: 'JavaScript Moderno (ES6+)', level: 'beginner', category: 'web-core', lessons: 16, quizzes: 32, hours: 30, free: 1, color: 'accent-text', icon: '📜', description: 'let/const, arrow functions, promises, async/await, modules' },
    { id: 'typescript', title: 'TypeScript Avanzado', level: 'intermediate', category: 'web-core', lessons: 18, quizzes: 36, hours: 35, free: 1, color: 'primary', icon: '🔷', description: 'Tipos, interfaces, generics, utility types, decorators' },
    { id: 'react', title: 'React + Next.js 14', level: 'intermediate', category: 'frameworks', lessons: 22, quizzes: 44, hours: 45, free: 0, color: 'accent-code', icon: '⚛️', description: 'Server Components, App Router, Server Actions, Suspense' },
    
    // Backend
    { id: 'python', title: 'Python para Backend', level: 'beginner', category: 'backend', lessons: 16, quizzes: 32, hours: 30, free: 1, color: 'accent-video', icon: '🐍', description: 'Sintaxis, FastAPI, SQLAlchemy, Pydantic, testing' },
    { id: 'fastapi', title: 'FastAPI + SQLAlchemy', level: 'intermediate', category: 'backend', lessons: 18, quizzes: 36, hours: 35, free: 0, color: 'primary', icon: '⚡', description: 'API REST, async, dependency injection, migraciones' },
    { id: 'sql', title: 'SQL & PostgreSQL', level: 'intermediate', category: 'backend', lessons: 14, quizzes: 28, hours: 25, free: 1, color: 'accent-code', icon: '🗄️', description: 'Joins, índices, transacciones, optimización, partitioning' },
    { id: 'docker', title: 'Docker & Contenedores', level: 'intermediate', category: 'devops', lessons: 14, quizzes: 28, hours: 25, free: 1, color: 'primary', icon: '🐳', description: 'Dockerfile, Compose, multi-stage, seguridad, CI/CD' },
    
    // Data & AI
    { id: 'ml-basics', title: 'Machine Learning Básico', level: 'intermediate', category: 'data-ai', lessons: 16, quizzes: 32, hours: 35, free: 1, color: 'accent-video', icon: '🤖', description: 'Scikit-learn, pipelines, evaluación, feature engineering' },
    
    // Professional
    { id: 'testing', title: 'Testing Automatizado', level: 'intermediate', category: 'professional', lessons: 14, quizzes: 28, hours: 25, free: 1, color: 'accent-code', icon: '✅', description: 'Unit, integration, E2E, mutation testing, CI' },
    { id: 'architecture', title: 'Arquitectura de Software', level: 'advanced', category: 'architecture', lessons: 18, quizzes: 36, hours: 40, free: 0, color: 'primary', icon: '🏗️', description: 'DDD, Clean Architecture, Hexagonal, Event-driven' },
  ];

  const insertCourse = db.prepare(`
    INSERT OR REPLACE INTO courses (id, title, description, level, category, technologies, prerequisites, estimated_hours, is_free, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertLesson = db.prepare(`
    INSERT OR REPLACE INTO lessons (id, course_id, title, content, "order", estimated_minutes, type, code_examples, exercises, resources, quiz_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQuiz = db.prepare(`
    INSERT OR REPLACE INTO quizzes (id, lesson_id, course_id, questions, passing_score, time_limit, generated_by_ai)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const course of courses) {
    insertCourse.run(
      course.id, course.title, course.description, course.level, course.category,
      JSON.stringify([]), JSON.stringify([]), course.hours, course.free,
      JSON.stringify([course.category])
    );

    // Crear lecciones básicas para cada curso
    for (let i = 0; i < course.lessons; i++) {
      const lessonId = `${course.id}_lesson_${i}`;
      const lessonTitle = i === 0 ? `Introducción a ${course.title}` : `Módulo ${i + 1}: ${course.title} - Parte ${i + 1}`;
      
      insertLesson.run(
        lessonId, course.id, lessonTitle,
        `# ${lessonTitle}\n\nContenido de la lección ${i + 1} de ${course.title}.\n\n## Objetivos\n- Aprender conceptos fundamentales\n- Practicar con ejemplos\n- Resolver ejercicios\n\n## Contenido\nAquí iría el contenido detallado de la lección...`,
        i, 25, 'theory',
        JSON.stringify([]), JSON.stringify([]), JSON.stringify([]),
        i < course.quizzes ? `${course.id}_quiz_${i}` : null
      );

      // Crear quiz para algunas lecciones
      if (i < course.quizzes) {
        const quizId = `${course.id}_quiz_${i}`;
        const questions = [
          { id: 'q1', question: `¿Cuál es el concepto principal de ${course.title}?`, options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'], correctAnswer: 0, explanation: 'Explicación básica', type: 'single' },
          { id: 'q2', question: `¿Para qué sirve ${course.title.toLowerCase()}?`, options: ['Aprender', 'Ejecutar', 'Compilar', 'Depurar'], correctAnswer: 0, explanation: 'Es para aprender', type: 'single' },
          { id: 'q3', question: `¿Qué nivel tiene este curso?`, options: ['Principiante', 'Intermedio', 'Avanzado', 'Experto'], correctAnswer: course.level === 'explorer' ? 0 : course.level === 'beginner' ? 0 : course.level === 'intermediate' ? 1 : 2, explanation: `Nivel: ${course.level}`, type: 'single' },
        ];
        
        insertQuiz.run(
          quizId, lessonId, course.id,
          JSON.stringify(questions), 70, null, 0
        );
      }
    }
    
    log(`  ✅ ${course.title} (${course.lessons} lecciones, ${course.quizzes} quizzes)`);
  }

  // 4. Crear usuario demo
  log('👤 Creando usuario demo...');
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, email, name, level, xp, streak, preferences, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  
  insertUser.run(
    'demo-user-1',
    'demo@plataforma-total.dev',
    'Juan Developer',
    'intermediate',
    2847,
    12,
    JSON.stringify({ theme: 'dark', language: 'es', aiModel: 'auto' })
  );

  // Progreso demo
  const insertProgress = db.prepare(`
    INSERT OR REPLACE INTO user_progress (user_id, course_id, lessons_completed, quizzes_passed, projects_completed, xp_earned, started_at, last_accessed_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  
  insertProgress.run('demo-user-1', 'javascript', JSON.stringify(['javascript_lesson_0', 'javascript_lesson_1', 'javascript_lesson_2']), JSON.stringify({ 'javascript_quiz_0': { score: 10, total: 10, passed: 1, completedAt: new Date().toISOString(), attempts: 1 } }), JSON.stringify([]), 150);
  insertProgress.run('demo-user-1', 'typescript', JSON.stringify(['typescript_lesson_0']), JSON.stringify({}), JSON.stringify([]), 25);
  insertProgress.run('demo-user-1', 'python', JSON.stringify(['python_lesson_0', 'python_lesson_1']), JSON.stringify({ 'python_quiz_0': { score: 8, total: 10, passed: 1, completedAt: new Date().toISOString(), attempts: 1 } }), JSON.stringify([]), 50);

  // 5. Copiar .env si no existe
  const envPath = join(ROOT, '.env');
  const envExamplePath = join(ROOT, '.env.example');
  if (!existsSync(envPath) && existsSync(envExamplePath)) {
    copyFileSync(envExamplePath, envPath);
    log('⚙️ Archivo .env creado desde .env.example');
  }

  db.close();
  
  log('');
  log('✅ Setup completado!', 'success');
  log('');
  log('📋 Próximos pasos:');
  log('  1. Edita .env con tus claves (GATEWAY_API_KEY, JWT_SECRET, etc.)');
  log('  2. Ejecuta: npm run dev');
  log('  3. Abre http://localhost:4321 (web) o la app Electron');
  log('');
  log('🔗 URLs de desarrollo:');
  log('  - Web:        http://localhost:4321');
  log('  - API:        http://localhost:3000');
  log('  - Gateway:    http://localhost:3001 (FreeLLMAPI)');
  log('  - MCP:        http://localhost:3002/mcp');
  log('');
  log('📚 Documentación: https://github.com/SoftEngAi-dev/plataforma-unificada');
}

setup().catch(error => {
  log(`Error fatal: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});