/**
 * Plataforma Unificada API Server
 * 
 * Express.js server providing REST API for:
 * - User authentication & management
 * - Course & learning progress
 * - Agent orchestration
 * - Project management
 * - AI chat & tutoring
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createLogger, getConfig } from '@plataforma-unificada/core';
import { LearningDatabase, createLearningServices } from '@plataforma-unificada/learning';
import { OrchestrationEngine, getAgentMCPTools, handleMCPToolCall } from '@plataforma-unificada/agents';
import { getGatewayClient } from '@plataforma-unificada/gateway';

const logger = createLogger('API');
const config = getConfig();

const app = express();
const PORT = config.app.port;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for development
}));
app.use(cors({
  origin: config.app.url,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize database
const dbPath = config.database.path || './data/plataforma.db';
const learningDb = LearningDatabase.getInstance(dbPath);
const { tutoring, pathService, gamification } = createLearningServices(dbPath);
const orchestrationEngine = new OrchestrationEngine();
const gateway = getGatewayClient();

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, { ip: req.ip, userAgent: req.get('user-agent') });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: config.app.version,
    services: {
      database: 'connected',
      gateway: 'connected',
      agents: 'ready',
    }
  });
});

// ============================================================================
// Auth Routes
// ============================================================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    // In production: hash password, create user in DB
    const user = { id: '1', email, name, level: 'explorer', xp: 0, streak: 0 };
    res.json({ user, token: 'mock-jwt-token' });
  } catch (error) {
    logger.error('Registration error', { error });
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // In production: verify password, generate JWT
    const user = { id: '1', email, name: email.split('@')[0], level: 'beginner', xp: 1250, streak: 12 };
    res.json({ user, token: 'mock-jwt-token' });
  } catch (error) {
    logger.error('Login error', { error });
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================================================
// Course Routes
// ============================================================================

app.get('/api/courses', (req, res) => {
  const courses = learningDb.getAllCourses();
  res.json({ courses });
});

app.get('/api/courses/:id', (req, res) => {
  const course = learningDb.getCourse(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  
  const lessons = learningDb.getLessonsByCourse(course.id);
  const projects = learningDb.getProjectsByCourse(course.id);
  
  res.json({ course: { ...course, lessons, projects } });
});

app.get('/api/courses/:id/progress', (req, res) => {
  const userId = req.headers['x-user-id'] as string || '1';
  const progress = learningDb.getProgress(userId, req.params.id);
  res.json({ progress });
});

app.post('/api/courses/:courseId/lessons/:lessonId/complete', (req, res) => {
  const userId = req.headers['x-user-id'] as string || '1';
  learningDb.markLessonComplete(userId, req.params.courseId, req.params.lessonId);
  res.json({ success: true });
});

// ============================================================================
// Quiz Routes
// ============================================================================

app.post('/api/quizzes/:quizId/submit', (req, res) => {
  const userId = req.headers['x-user-id'] as string || '1';
  const { answers } = req.body;
  
  // In production: get quiz from DB, calculate score
  const score = Object.values(answers).filter((a, i) => a === i % 4).length; // mock
  const total = Object.keys(answers).length;
  const passed = score / total >= 0.7;
  
  learningDb.saveQuizResult(userId, req.body.courseId || '', req.body.lessonId || '', req.params.quizId, score, total, passed, answers);
  
  res.json({ score, total, passed });
});

app.post('/api/lessons/:lessonId/quiz/generate', async (req, res) => {
  const userId = req.headers['x-user-id'] as string || '1';
  const lesson = learningDb.getLesson(req.params.lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  
  try {
    const quiz = await tutoring.generateQuiz(req.params.lessonId, {
      userId,
      courseId: lesson.courseId,
      lessonId: req.params.lessonId,
      userLevel: 'beginner',
      userProgress: learningDb.getProgress(userId, lesson.courseId) || { userId, courseId: lesson.courseId, lessonsCompleted: [], quizzesPassed: {}, projectsCompleted: [], xpEarned: 0, startedAt: new Date(), lastAccessedAt: new Date() },
    });
    res.json({ quiz });
  } catch (error) {
    logger.error('Quiz generation failed', { error });
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// ============================================================================
// AI Tutoring Routes
// ============================================================================

app.post('/api/tutoring/explain', async (req, res) => {
  const userId = req.headers['x-user-id'] as string || '1';
  const { concept, courseId, lessonId } = req.body;
  
  try {
    const explanation = await tutoring.explainConcept(concept, {
      userId,
      courseId,
      lessonId,
      userLevel: 'beginner',
      userProgress: learningDb.getProgress(userId, courseId) || { userId, courseId, lessonsCompleted: [], quizzesPassed: {}, projectsCompleted: [], xpEarned: 0, startedAt: new Date(), lastAccessedAt: new Date() },
    });
    res.json({ explanation });
  } catch (error) {
    logger.error('Explanation failed', { error });
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

app.post('/api/tutoring/exercise', async (req, res) => {
  const { topic, courseId, difficulty } = req.body;
  const userId = req.headers['x-user-id'] as string || '1';
  
  try {
    const exercise = await tutoring.generateExercise(topic, {
      userId,
      courseId,
      userLevel: 'beginner',
      userProgress: learningDb.getProgress(userId, courseId) || { userId, courseId, lessonsCompleted: [], quizzesPassed: {}, projectsCompleted: [], xpEarned: 0, startedAt: new Date(), lastAccessedAt: new Date() },
    }, difficulty);
    res.json({ exercise });
  } catch (error) {
    logger.error('Exercise generation failed', { error });
    res.status(500).json({ error: 'Failed to generate exercise' });
  }
});

app.post('/api/tutoring/review-code', async (req, res) => {
  const { code } = req.body;
  try {
    const review = await tutoring.reviewCode(code, {
      userId: req.headers['x-user-id'] as string || '1',
      courseId: '',
      userLevel: 'beginner',
      userProgress: { userId: '', courseId: '', lessonsCompleted: [], quizzesPassed: {}, projectsCompleted: [], xpEarned: 0, startedAt: new Date(), lastAccessedAt: new Date() },
    });
    res.json({ review });
  } catch (error) {
    logger.error('Code review failed', { error });
    res.status(500).json({ error: 'Failed to review code' });
  }
});

// ============================================================================
// Agent Orchestration Routes
// ============================================================================

app.post('/api/agents/orchestrate', async (req, res) => {
  const userId = req.headers['x-user-id'] as string || '1';
  const { request } = req.body;
  
  try {
    const result = await orchestrationEngine.processRequest(request, userId);
    res.json(result);
  } catch (error) {
    logger.error('Orchestration failed', { error });
    res.status(500).json({ error: 'Orchestration failed' });
  }
});

app.post('/api/agents/execute', async (req, res) => {
  const { agentType, task, input } = req.body;
  
  try {
    const { createAgent } = await import('@plataforma-unificada/agents');
    const agent = createAgent(agentType);
    const result = await agent.execute({ id: 'api-task', type: task, input, status: 'pending' });
    res.json({ result });
  } catch (error) {
    logger.error('Agent execution failed', { error });
    res.status(500).json({ error: 'Agent execution failed' });
  }
});

app.get('/api/agents/list', (req, res) => {
  const { getAvailableAgents, createAllAgents } = require('@plataforma-unificada/agents');
  const agents = getAvailableAgents().map(type => {
    const agent = createAllAgents().get(type);
    return { type, name: agent?.name, description: agent?.description, capabilities: agent?.capabilities };
  });
  res.json({ agents });
});

// ============================================================================
// MCP Routes
// ============================================================================

app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;
  
  try {
    let result;
    switch (method) {
      case 'tools/list':
        result = { tools: getAgentMCPTools() };
        break;
      case 'tools/call':
        result = await handleMCPToolCall(params.name, params.arguments);
        break;
      default:
        return res.status(400).json({ error: { code: -32601, message: 'Method not found' }, id });
    }
    res.json({ jsonrpc: '2.0', result, id });
  } catch (error) {
    logger.error('MCP error', { error, method });
    res.json({ jsonrpc: '2.0', error: { code: -32603, message: error instanceof Error ? error.message : 'Internal error' }, id });
  }
});

// ============================================================================
// Gateway Proxy Routes
// ============================================================================

app.post('/api/gateway/chat', async (req, res) => {
  try {
    const response = await gateway.chat(req.body);
    res.json(response);
  } catch (error) {
    logger.error('Gateway chat failed', { error });
    res.status(500).json({ error: 'Gateway request failed' });
  }
});

app.get('/api/gateway/models', async (req, res) => {
  try {
    const models = await gateway.getModels();
    res.json({ models });
  } catch (error) {
    logger.error('Gateway models failed', { error });
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// ============================================================================
// Project Routes
// ============================================================================

app.get('/api/projects', (req, res) => {
  // In production: get from DB
  res.json({ projects: [] });
});

app.post('/api/projects', (req, res) => {
  // In production: create project in DB
  res.json({ project: { id: 'new', ...req.body } });
});

// ============================================================================
// Certificate Routes
// ============================================================================

app.post('/api/certificates/issue', (req, res) => {
  const userId = req.headers['x-user-id'] as string || '1';
  const { courseId, studentName, metadata } = req.body;
  
  try {
    const certificate = learningDb.issueCertificate(userId, courseId, studentName, metadata);
    res.json({ certificate });
  } catch (error) {
    logger.error('Certificate issuance failed', { error });
    res.status(500).json({ error: 'Failed to issue certificate' });
  }
});

app.get('/api/certificates/verify/:code', (req, res) => {
  const certificate = learningDb.getCertificateByVerificationCode(req.params.code);
  if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
  res.json({ certificate });
});

// ============================================================================
// Gamification Routes
// ============================================================================

app.get('/api/gamification/achievements', (req, res) => {
  const userId = req.headers['x-user-id'] as string || '1';
  const achievements = gamification.getUserAchievements(userId);
  res.json({ achievements });
});

app.get('/api/gamification/level', (req, res) => {
  const userId = req.headers['x-user-id'] as string || '1';
  const progress = learningDb.getAllProgress(userId);
  const totalXP = progress.reduce((sum, p) => sum + p.xpEarned, 0);
  const level = gamification.calculateLevel(totalXP);
  const nextLevel = gamification.getXPForNextLevel(totalXP);
  res.json({ level, xp: totalXP, ...nextLevel });
});

// ============================================================================
// Learning Path Routes
// ============================================================================

app.get('/api/learning-paths', (req, res) => {
  const paths = pathService.getAllPaths();
  res.json({ paths });
});

app.get('/api/learning-paths/:id/progress', (req, res) => {
  const userId = req.headers['x-user-id'] as string || '1';
  const progress = pathService.getPathProgress(userId, req.params.id);
  res.json(progress);
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  logger.info(`API server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${config.app.env}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  learningDb.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  learningDb.close();
  process.exit(0);
});

export { app };