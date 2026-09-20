/**
 * Core types for Plataforma Unificada
 * Combines FreeLLMAPI + Plataforma Total + Agent Orchestration concepts
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  level: UserLevel;
  xp: number;
  streak: number;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export type UserLevel = 
  | 'explorer'      // Nivel 0 - Sin conocimientos
  | 'beginner'      // Nivel 1 - Principiante
  | 'intermediate'  // Nivel 2 - Intermedio
  | 'advanced'      // Nivel 3 - Avanzado
  | 'professional'  // Nivel 4 - Profesional
  | 'architect';    // Nivel 5 - Arquitecto/Investigador

export interface UserPreferences {
  language: string;
  theme: 'dark' | 'light' | 'system';
  aiModel: string;
  notifications: boolean;
  offlineMode: boolean;
  autoSync: boolean;
  learningStyle: 'visual' | 'reading' | 'hands-on' | 'mixed';
  difficulty: 'adaptive' | 'fixed';
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: UserLevel;
  category: CourseCategory;
  technologies: string[];
  prerequisites: string[];
  lessons: Lesson[];
  quizzes: Quiz[];
  projects: Project[];
  estimatedHours: number;
  isFree: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type CourseCategory = 
  | 'fundamentals'
  | 'web-core'
  | 'backend'
  | 'mobile'
  | 'frameworks'
  | 'data-ai'
  | 'professional'
  | 'devops'
  | 'security'
  | 'architecture';

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  content: string;
  order: number;
  estimatedMinutes: number;
  type: LessonType;
  codeExamples: CodeExample[];
  exercises: Exercise[];
  resources: Resource[];
  quizId?: string;
  completed?: boolean;
}

export type LessonType = 
  | 'theory'
  | 'practice'
  | 'project'
  | 'quiz'
  | 'review'
  | 'challenge';

export interface CodeExample {
  id: string;
  title: string;
  language: string;
  code: string;
  explanation: string;
  runnable: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  starterCode?: string;
  solution?: string;
  tests?: string[];
  hints: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: 'documentation' | 'video' | 'article' | 'tool' | 'reference';
}

export interface Quiz {
  id: string;
  lessonId?: string;
  courseId?: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number;
  generatedByAI: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  type: 'single' | 'multiple' | 'code' | 'true-false';
}

export interface Project {
  id: string;
  courseId: string;
  title: string;
  description: string;
  requirements: string[];
  starterRepo?: string;
  solutionRepo?: string;
  technologies: string[];
  difficulty: 'small' | 'medium' | 'large';
  estimatedDays: number;
  deliverables: string[];
}

export interface UserProgress {
  userId: string;
  courseId: string;
  lessonsCompleted: string[];
  quizzesPassed: Record<string, QuizResult>;
  projectsCompleted: string[];
  xpEarned: number;
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
}

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  completedAt: Date;
  attempts: number;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  verificationCode: string;
  issuedAt: Date;
  pdfUrl?: string;
  metadata: CertificateMetadata;
}

export interface CertificateMetadata {
  courseTitle: string;
  lessonsCompleted: number;
  quizzesPassed: number;
  finalScore: number;
  studentName: string;
}

// Agent Orchestration Types
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  role: string;
  description: string;
  capabilities: AgentCapability[];
  tools: string[];
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  permissions: AgentPermissions;
}

export type AgentType = 
  | 'orchestrator'
  | 'tutor'
  | 'coder'
  | 'architect'
  | 'researcher'
  | 'debugger'
  | 'tester'
  | 'security'
  | 'documenter'
  | 'ui-ux'
  | 'database-engineer'
  | 'devops'
  | 'cloud-engineer'
  | 'ai-engineer'
  | 'project-manager'
  | 'analyst'
  | 'reviewer';

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface AgentPermissions {
  filesystem: 'none' | 'read' | 'write' | 'full';
  internet: 'none' | 'read' | 'full';
  git: 'none' | 'read' | 'commit' | 'push';
  production: 'none' | 'deploy' | 'full';
  database: 'none' | 'read' | 'write' | 'admin';
  shell: 'none' | 'read' | 'execute';
}

export interface AgentTask {
  id: string;
  type: string;
  input: Record<string, unknown>;
  assignedAgent?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'awaiting-approval';
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  parentTaskId?: string;
  subtasks: AgentTask[];
}

export interface OrchestrationPlan {
  id: string;
  userRequest: string;
  tasks: AgentTask[];
  status: 'planning' | 'executing' | 'completed' | 'failed';
  currentTaskIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

// FreeLLMAPI Integration Types
export interface LLMProvider {
  id: string;
  name: string;
  type: 'chat' | 'embedding' | 'image' | 'audio' | 'video';
  models: LLMModel[];
  rateLimits: RateLimit;
  requiresKey: boolean;
  keyFormat?: string;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  type: 'chat' | 'embedding' | 'image' | 'audio' | 'video';
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapability[];
  pricing: ModelPricing;
  tags: string[];
}

export type ModelCapability = 
  | 'chat'
  | 'streaming'
  | 'tools'
  | 'vision'
  | 'audio'
  | 'reasoning'
  | 'code'
  | 'multilingual';

export interface ModelPricing {
  inputPer1k: number;
  outputPer1k: number;
  currency: string;
  freeTier?: {
    tokensPerMonth: number;
    requestsPerDay: number;
  };
}

export interface RateLimit {
  rpm: number;
  rpd: number;
  tpm: number;
  tpd: number;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: Tool[];
  toolChoice?: 'auto' | 'none' | 'required';
  responseFormat?: ResponseFormat;
  user?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ResponseFormat {
  type: 'text' | 'json_object' | 'json_schema';
  jsonSchema?: Record<string, unknown>;
}

export interface ChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: Usage;
}

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// MCP Types
export interface MCPServer {
  id: string;
  name: string;
  version: string;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

// Plugin System Types
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  main: string;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  provides: PluginProvides;
  permissions: PluginPermissions;
}

export interface PluginProvides {
  languages?: string[];
  frameworks?: string[];
  models?: string[];
  tools?: string[];
  cloudProviders?: string[];
  databases?: string[];
  agents?: AgentType[];
  courses?: string[];
  integrations?: string[];
}

export interface PluginPermissions {
  filesystem: 'none' | 'read' | 'write' | 'full';
  network: 'none' | 'internal' | 'external' | 'full';
  database: 'none' | 'read' | 'write' | 'schema';
  ui: 'none' | 'panel' | 'modal' | 'full';
  settings: string[];
}

// Sync Types
export interface SyncState {
  entityType: string;
  entityId: string;
  version: number;
  lastModified: Date;
  checksum: string;
  data: Record<string, unknown>;
}

export interface SyncConflict {
  local: SyncState;
  remote: SyncState;
  resolution: 'local' | 'remote' | 'merge' | 'manual';
  resolvedAt?: Date;
}

export interface OfflineQueue {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  timestamp: Date;
  retries: number;
  maxRetries: number;
}

// Database Types
export interface DatabaseSchema {
  users: User;
  courses: Course;
  lessons: Lesson;
  quizzes: Quiz;
  projects: Project;
  progress: UserProgress;
  certificates: Certificate;
  agents: Agent;
  tasks: AgentTask;
  plans: OrchestrationPlan;
  plugins: Plugin;
  syncStates: SyncState;
  syncConflicts: SyncConflict;
  offlineQueue: OfflineQueue;
  settings: Setting;
}

export interface Setting {
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'json' | 'encrypted';
  description: string;
  public: boolean;
}