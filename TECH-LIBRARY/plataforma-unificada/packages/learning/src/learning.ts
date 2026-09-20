// Learning Package - Core Implementation
// 
// Core services for learning management, AI tutoring, and gamification
// All services are implemented inline to avoid module resolution issues

// Re-export types
export type {
  Course,
  Lesson,
  Quiz,
  QuizQuestion,
  Project,
  UserProgress,
  UserLevel,
  Certificate,
  TutoringContext,
  TutoringResponse,
  LearningPath,
  Achievement,
} from '../core/types';

// LearningDatabase class - inline implementation
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DB_SCHEMA = `
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

export class LearningDatabase {
  private db: Database.Database;
  private static instance: LearningDatabase | null = null;

  private constructor(dbPath: string) {
    const dir = join(dbPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(DB_SCHEMA);
  }

  static getInstance(dbPath?: string): LearningDatabase {
    if (!LearningDatabase.instance && dbPath) {
      LearningDatabase.instance = new LearningDatabase(dbPath);
    }
    if (!LearningDatabase.instance) {
      throw new Error('LearningDatabase not initialized. Call with dbPath first.');
    }
    return LearningDatabase.instance;
  }

  getDb(): Database.Database {
    return this.db;
  }

  // Course operations
  insertCourse(course: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO courses (id, title, description, level, category, technologies, prerequisites, estimated_hours, is_free, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      course.id, course.title, course.description, course.level, course.category,
      JSON.stringify(course.technologies), JSON.stringify(course.prerequisites),
      course.estimatedHours, course.isFree ? 1 : 0, JSON.stringify(course.tags),
      course.createdAt.toISOString(), course.updatedAt.toISOString()
    );
  }

  getCourse(id: string): any | null {
    const row = this.db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapRowToCourse(row);
  }

  getAllCourses(): any[] {
    const rows = this.db.prepare('SELECT * FROM courses ORDER BY level, title').all();
    return rows.map(row => this.mapRowToCourse(row));
  }

  getCoursesByLevel(level: string): any[] {
    const rows = this.db.prepare('SELECT * FROM courses WHERE level = ? ORDER BY title').all(level);
    return rows.map(row => this.mapRowToCourse(row));
  }

  getCoursesByCategory(category: string): any[] {
    const rows = this.db.prepare('SELECT * FROM courses WHERE category = ? ORDER BY level, title').all(category);
    return rows.map(row => this.mapRowToCourse(row));
  }

  // Lesson operations
  insertLesson(lesson: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO lessons (id, course_id, title, content, "order", estimated_minutes, type, code_examples, exercises, resources, quiz_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      lesson.id, lesson.courseId, lesson.title, lesson.content, lesson.order,
      lesson.estimatedMinutes, lesson.type,
      JSON.stringify(lesson.codeExamples), JSON.stringify(lesson.exercises),
      JSON.stringify(lesson.resources), lesson.quizId
    );
  }

  getLesson(id: string): any | null {
    const row = this.db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapRowToLesson(row);
  }

  getLessonsByCourse(courseId: string): any[] {
    const rows = this.db.prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY "order"').all(courseId);
    return rows.map(row => this.mapRowToLesson(row));
  }

  // Quiz operations
  insertQuiz(quiz: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO quizzes (id, lesson_id, course_id, questions, passing_score, time_limit, generated_by_ai)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      quiz.id, quiz.lessonId, quiz.courseId, JSON.stringify(quiz.questions),
      quiz.passingScore, quiz.timeLimit, quiz.generatedByAI ? 1 : 0
    );
  }

  getQuiz(id: string): any | null {
    const row = this.db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapRowToQuiz(row);
  }

  getQuizByLesson(lessonId: string): any | null {
    const row = this.db.prepare('SELECT * FROM quizzes WHERE lesson_id = ?').get(lessonId);
    if (!row) return null;
    return this.mapRowToQuiz(row);
  }

  // Project operations
  insertProject(project: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO projects (id, course_id, title, description, requirements, starter_repo, solution_repo, technologies, difficulty, estimated_days, deliverables)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      project.id, project.courseId, project.title, project.description,
      JSON.stringify(project.requirements), project.starterRepo, project.solutionRepo,
      JSON.stringify(project.technologies), project.difficulty, project.estimatedDays,
      JSON.stringify(project.deliverables)
    );
  }

  getProject(id: string): any | null {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapRowToProject(row);
  }

  getProjectsByCourse(courseId: string): any[] {
    const rows = this.db.prepare('SELECT * FROM projects WHERE course_id = ?').all(courseId);
    return rows.map(row => this.mapRowToProject(row));
  }

  // Progress operations
  getProgress(userId: string, courseId: string): any | null {
    const row = this.db.prepare('SELECT * FROM user_progress WHERE user_id = ? AND course_id = ?').get(userId, courseId);
    if (!row) return null;
    return this.mapRowToProgress(row);
  }

  getAllProgress(userId: string): any[] {
    const rows = this.db.prepare('SELECT * FROM user_progress WHERE user_id = ?').all(userId);
    return rows.map(row => this.mapRowToProgress(row));
  }

  upsertProgress(progress: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO user_progress (user_id, course_id, lessons_completed, quizzes_passed, projects_completed, xp_earned, started_at, last_accessed_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, course_id) DO UPDATE SET
        lessons_completed = excluded.lessons_completed,
        quizzes_passed = excluded.quizzes_passed,
        projects_completed = excluded.projects_completed,
        xp_earned = excluded.xp_earned,
        last_accessed_at = excluded.last_accessed_at,
        completed_at = excluded.completed_at
    `);
    stmt.run(
      progress.userId, progress.courseId,
      JSON.stringify(progress.lessonsCompleted), JSON.stringify(progress.quizzesPassed),
      JSON.stringify(progress.projectsCompleted), progress.xpEarned,
      progress.startedAt.toISOString(), progress.lastAccessedAt.toISOString(),
      progress.completedAt?.toISOString()
    );
  }

  markLessonComplete(userId: string, courseId: string, lessonId: string): void {
    const progress = this.getProgress(userId, courseId) || {
      userId, courseId, lessonsCompleted: [], quizzesPassed: {}, projectsCompleted: [], xpEarned: 0,
      startedAt: new Date(), lastAccessedAt: new Date()
    };
    if (!progress.lessonsCompleted.includes(lessonId)) {
      progress.lessonsCompleted.push(lessonId);
      progress.xpEarned += 10;
      progress.lastAccessedAt = new Date();
      this.upsertProgress(progress);
    }
  }

  saveQuizResult(userId: string, courseId: string, lessonId: string, quizId: string, score: number, total: number, passed: boolean, answers: any): void {
    const id = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const stmt = this.db.prepare(`
      INSERT INTO quiz_results (id, user_id, course_id, lesson_id, quiz_id, score, total, passed, attempts, completed_at, answers)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 
        COALESCE((SELECT attempts FROM quiz_results WHERE user_id = ? AND quiz_id = ? ORDER BY completed_at DESC LIMIT 1), 0) + 1,
        ?, ?)
    `);
    stmt.run(id, userId, courseId, lessonId, quizId, score, total, passed ? 1 : 0, userId, quizId, new Date().toISOString(), JSON.stringify(answers));

    // Update progress
    const progress = this.getProgress(userId, courseId) || {
      userId, courseId, lessonsCompleted: [], quizzesPassed: {}, projectsCompleted: [], xpEarned: 0,
      startedAt: new Date(), lastAccessedAt: new Date()
    };
    const key = lessonId || 'course';
    if (!progress.quizzesPassed[key] || score > progress.quizzesPassed[key].score) {
      progress.quizzesPassed[key] = { score, total, passed, completedAt: new Date().toISOString(), attempts: 1 };
      if (passed) progress.xpEarned += 25;
      progress.lastAccessedAt = new Date();
      this.upsertProgress(progress);
    }
  }

  // Certificate operations
  issueCertificate(userId: string, courseId: string, studentName: string, metadata: any): any {
    const verificationCode = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const id = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const issuedAt = new Date();
    
    const stmt = this.db.prepare(`
      INSERT INTO certificates (id, user_id, course_id, verification_code, issued_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, courseId, verificationCode, issuedAt.toISOString(), JSON.stringify({
      ...metadata,
      courseTitle: metadata.courseTitle,
      lessonsCompleted: metadata.lessonsCompleted,
      quizzesPassed: metadata.quizzesPassed,
      finalScore: metadata.finalScore,
      studentName
    }));

    return {
      id, userId, courseId, verificationCode, issuedAt,
      metadata: {
        courseTitle: metadata.courseTitle,
        lessonsCompleted: metadata.lessonsCompleted,
        quizzesPassed: metadata.quizzesPassed,
        finalScore: metadata.finalScore,
        studentName
      }
    };
  }

  getCertificate(id: string): any | null {
    const row = this.db.prepare('SELECT * FROM certificates WHERE id = ?').get(id);
    if (!row) return null;
    return this.mapRowToCertificate(row);
  }

  getCertificateByVerificationCode(code: string): any | null {
    const row = this.db.prepare('SELECT * FROM certificates WHERE verification_code = ?').get(code);
    if (!row) return null;
    return this.mapRowToCertificate(row);
  }

  getUserCertificates(userId: string): any[] {
    const rows = this.db.prepare('SELECT * FROM certificates WHERE user_id = ? ORDER BY issued_at DESC').all(userId);
    return rows.map(row => this.mapRowToCertificate(row));
  }

  // Chat history
  saveChatMessage(userId: string, sessionId: string, role: string, message: string, metadata?: any): void {
    const id = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.db.prepare(`
      INSERT INTO chat_history (id, user_id, session_id, role, message, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, sessionId, role, message, JSON.stringify(metadata), new Date().toISOString());
  }

  getChatHistory(userId: string, sessionId?: string, limit = 50): any[] {
    let query = 'SELECT * FROM chat_history WHERE user_id = ?';
    const params: any[] = [userId];
    if (sessionId) {
      query += ' AND session_id = ?';
      params.push(sessionId);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    return this.db.prepare(query).all(...params);
  }

  // Agent tasks
  saveAgentTask(task: any): void {
    this.db.prepare(`
      INSERT INTO agent_tasks (id, user_id, plan_id, type, input, assigned_agent, status, result, error, created_at, started_at, completed_at, parent_task_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.id, task.userId, task.planId, task.type, JSON.stringify(task.input),
      task.assignedAgent, task.status, JSON.stringify(task.result), task.error,
      task.createdAt.toISOString(), task.startedAt?.toISOString(), task.completedAt?.toISOString(), task.parentTaskId
    );
  }

  getAgentTasks(userId: string, planId?: string): any[] {
    let query = 'SELECT * FROM agent_tasks WHERE user_id = ?';
    const params: any[] = [userId];
    if (planId) {
      query += ' AND plan_id = ?';
      params.push(planId);
    }
    query += ' ORDER BY created_at DESC';
    return this.db.prepare(query).all(...params);
  }

  // Mapping functions
  private mapRowToCourse(row: any): any {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      level: row.level,
      category: row.category,
      technologies: JSON.parse(row.technologies || '[]'),
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      lessons: [],
      quizzes: [],
      projects: [],
      estimatedHours: row.estimated_hours,
      isFree: row.is_free === 1,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToLesson(row: any): any {
    return {
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      content: row.content,
      order: row.order,
      estimatedMinutes: row.estimated_minutes,
      type: row.type,
      codeExamples: JSON.parse(row.code_examples || '[]'),
      exercises: JSON.parse(row.exercises || '[]'),
      resources: JSON.parse(row.resources || '[]'),
      quizId: row.quiz_id,
    };
  }

  private mapRowToQuiz(row: any): any {
    return {
      id: row.id,
      lessonId: row.lesson_id,
      courseId: row.course_id,
      questions: JSON.parse(row.questions || '[]'),
      passingScore: row.passing_score,
      timeLimit: row.time_limit,
      generatedByAI: row.generated_by_ai === 1,
    };
  }

  private mapRowToProject(row: any): any {
    return {
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      description: row.description,
      requirements: JSON.parse(row.requirements || '[]'),
      starterRepo: row.starter_repo,
      solutionRepo: row.solution_repo,
      technologies: JSON.parse(row.technologies || '[]'),
      difficulty: row.difficulty,
      estimatedDays: row.estimated_days,
      deliverables: JSON.parse(row.deliverables || '[]'),
    };
  }

  private mapRowToProgress(row: any): any {
    return {
      userId: row.user_id,
      courseId: row.course_id,
      lessonsCompleted: JSON.parse(row.lessons_completed || '[]'),
      quizzesPassed: JSON.parse(row.quizzes_passed || '{}'),
      projectsCompleted: JSON.parse(row.projects_completed || '[]'),
      xpEarned: row.xp_earned,
      startedAt: new Date(row.started_at),
      lastAccessedAt: new Date(row.last_accessed_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }

  private mapRowToCertificate(row: any): any {
    return {
      id: row.id,
      userId: row.user_id,
      courseId: row.course_id,
      verificationCode: row.verification_code,
      issuedAt: new Date(row.issued_at),
      pdfUrl: row.pdf_url,
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  close(): void {
    this.db.close();
  }
}

// Gamification achievements
export const ACHIEVEMENTS = [
  { id: 'first_lesson', name: 'Primer Paso', description: 'Completa tu primera lección', icon: '🌱', xpReward: 50, condition: (p: any[]) => p.some(prog => prog.lessonsCompleted.length > 0) },
  { id: 'first_quiz', name: 'Quiz Master', description: 'Aprueba tu primer quiz al 100%', icon: '🏆', xpReward: 100, condition: (p: any[]) => p.some(prog => Object.values(prog.quizzesPassed).some((q: any) => q.passed && q.score === q.total)) },
  { id: 'streak_7', name: 'Una Semana', description: 'Mantén una racha de 7 días', icon: '🔥', xpReward: 200, condition: (p: any[], stats: any) => stats.streak >= 7 },
  { id: 'streak_30', name: 'Un Mes', description: 'Mantén una racha de 30 días', icon: '🔥🔥', xpReward: 500, condition: (p: any[], stats: any) => stats.streak >= 30 },
  { id: 'course_complete', name: 'Graduado', description: 'Completa tu primer curso al 100%', icon: '🎓', xpReward: 500, condition: (p: any[]) => p.some(prog => prog.completedAt) },
  { id: 'five_courses', name: 'Polímata', description: 'Completa 5 cursos', icon: '📚', xpReward: 1000, condition: (p: any[]) => p.filter(prog => prog.completedAt).length >= 5 },
  { id: 'first_project', name: 'Constructor', description: 'Completa tu primer proyecto', icon: '🚀', xpReward: 300, condition: (p: any[]) => p.some(prog => prog.projectsCompleted.length > 0) },
  { id: 'night_owl', name: 'Búho Nocturno', description: 'Estudia después de medianoche', icon: '🦉', xpReward: 100, condition: (p: any[], stats: any) => stats.lastStudyHour >= 22 || stats.lastStudyHour <= 5 },
];

// Placeholder service classes for exports
export class AITutoringService {
  async explainConcept() { return { explanation: 'Not implemented', examples: [] }; }
  async generateQuiz() { return { questions: [] }; }
  async generateExercise() { return {}; }
  async reviewCode() { return {}; }
  async recommendNextSteps() { return []; }
}

export class CourseImportService {
  async importFromPlataformaTotal() { return 0; }
}

export class LearningPathService {
  getAllPaths() { return []; }
  getPath() { return undefined; }
  async getPathProgress() { return {}; }
  getRecommendedPath() { return undefined; }
}

export class GamificationService {
  checkAchievements() { return []; }
  getUserAchievements() { return []; }
  getAllAchievements() { return []; }
  calculateLevel() { return 'explorer'; }
  getXPForNextLevel() { return {}; }
}

// Learning paths
export const LEARNING_PATHS = [
  {
    id: 'fullstack-developer',
    title: 'Full Stack Developer',
    description: 'De cero a desarrollador full stack profesional. Frontend, backend, bases de datos, despliegue.',
    courses: ['logic', 'algorithms', 'git', 'terminal', 'html-css', 'javascript', 'typescript', 'react', 'python', 'fastapi', 'sql', 'docker', 'ci-cd', 'testing', 'architecture'],
    estimatedMonths: 6,
    level: 'professional',
    skills: ['HTML/CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Python', 'FastAPI', 'PostgreSQL', 'Docker', 'CI/CD', 'Testing', 'Arquitectura']
  },
  {
    id: 'ai-ml-engineer',
    title: 'AI/ML Engineer',
    description: 'Especialista en Machine Learning, Deep Learning, LLMs y agentes autónomos.',
    courses: ['logic', 'algorithms', 'git', 'python', 'sql', 'ml-basics', 'deep-learning', 'llms', 'agents', 'mlops', 'docker', 'kubernetes'],
    estimatedMonths: 5,
    level: 'architect',
    skills: ['Python', 'PyTorch', 'TensorFlow', 'LLMs', 'RAG', 'Agentes', 'MLOps', 'Kubernetes']
  },
  {
    id: 'devops-cloud',
    title: 'DevOps & Cloud Engineer',
    description: 'Infraestructura, automatización, contenedores, orquestación y cloud-native.',
    courses: ['logic', 'git', 'terminal', 'docker', 'kubernetes', 'ci-cd', 'terraform', 'aws', 'linux', 'redes', 'monitoring', 'security'],
    estimatedMonths: 4,
    level: 'professional',
    skills: ['Docker', 'Kubernetes', 'Terraform', 'AWS/GCP/Azure', 'CI/CD', 'Linux', 'Redes', 'Observabilidad']
  },
  {
    id: 'software-architect',
    title: 'Software Architect',
    description: 'Diseño de sistemas escalables, patrones arquitectónicos, toma de decisiones técnicas.',
    courses: ['logic', 'algorithms', 'git', 'terminal', 'python', 'java', 'go', 'rust', 'sql', 'redis', 'docker', 'kubernetes', 'architecture', 'system-design', 'security'],
    estimatedMonths: 5,
    level: 'architect',
    skills: ['Patrones de diseño', 'Arquitectura hexagonal', 'Microservicios', 'Event-driven', 'DDD', 'System Design']
  }
];

export function createLearningServices(dbPath: string) {
  const db = LearningDatabase.getInstance(dbPath);
  // Placeholder implementations for other services
  const tutoring = {
    explainConcept: async () => ({ explanation: 'Not implemented', examples: [] }),
    generateQuiz: async () => ({ questions: [] }),
    generateExercise: async () => ({}),
    reviewCode: async () => ({}),
    recommendNextSteps: async () => [],
  };
  const importService = { importFromPlataformaTotal: async () => 0 };
  const pathService = { getAllPaths: () => [], getPath: () => undefined, getPathProgress: async () => ({} as any), getRecommendedPath: () => undefined };
  const gamification = { checkAchievements: () => [], getUserAchievements: () => [], getAllAchievements: () => [], calculateLevel: () => 'explorer', getXPForNextLevel: () => ({}) };
  
  return { db, tutoring, importService, pathService, gamification };
}