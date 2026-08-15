export type ModuleCategory =
  | 'ai'
  | 'video'
  | 'audio'
  | 'web'
  | 'code'
  | 'automation'
  | 'system'
  | 'data';

export type ModuleStatus =
  | 'available'
  | 'installed'
  | 'loading'
  | 'active'
  | 'error'
  | 'disabled';

export type ModuleWeight = 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'GPU' | 'EXTERNAL';

/**
 * Metadata-only description of a module. The registry stores these WITHOUT
 * loading any code — capability discovery never touches a module's payload.
 */
export interface UltraModule {
  id: string;
  name: string;
  version: string;
  description: string;
  category: ModuleCategory;
  capabilities: string[];
  status: ModuleStatus;
  entryPoint?: string;
  route?: string;
  api?: string;
  dependencies?: string[];
  estimatedMemory?: number;
  lazy?: boolean;
  weight?: ModuleWeight;
  /** Max number of auto-recovery attempts before surfacing an error. */
  maxRetries?: number;
}

export type TaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type TaskPriority = 0 | 1 | 2 | 3 | 4 | 5;

export interface TaskLogEntry {
  at: string;
  message: string;
}

export interface Task<TResult = unknown> {
  id: string;
  type: string;
  module?: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  attempt: number;
  logs: TaskLogEntry[];
  result?: TResult;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export type MemoryType =
  | 'PROJECT'
  | 'ARCHITECTURE'
  | 'MODULE'
  | 'TASK'
  | 'ERROR'
  | 'SOLUTION'
  | 'DECISION'
  | 'LEARNING'
  | 'USER_PREFERENCE'
  | 'PERFORMANCE';

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  source: string;
  content: string;
  importance: number;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  moduleId?: string;
  /** Content hash used for deduplication. */
  hash: string;
}

export interface MemoryReport {
  projectId?: string;
  createdAt: string;
  sections: Partial<Record<MemoryType, string[]>>;
  recommendations: string[];
  entryCount: number;
}

export type ResourceLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface ResourceSample {
  /** 0..1 fraction of the resource that is consumed. */
  usage: number;
  label: string;
}

export interface ResourceSnapshot {
  at: string;
  samples: Record<string, ResourceSample>;
}

export interface ResourceReport {
  at: string;
  level: ResourceLevel;
  perResource: Record<string, { usage: number; level: ResourceLevel }>;
  /** Module ids suggested for unloading when resources are critical. */
  unloadSuggestions: string[];
}

export type CommandLevel = 'safe' | 'restricted' | 'admin';

export interface CommandContext {
  role: 'user' | 'operator' | 'admin';
  module?: string;
  user?: string;
}

export interface CommandDefinition {
  id: string;
  level: CommandLevel;
  description: string;
  handler: (args: Record<string, unknown>, ctx: CommandContext) => Promise<unknown> | unknown;
}

export interface CommandRecord {
  command: string;
  timestamp: string;
  module?: string;
  actor: string;
  result: unknown;
  durationMs: number;
  error?: string;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthResult {
  ok: boolean;
  detail?: string;
  durationMs?: number;
}

export interface HealthReport {
  status: HealthStatus;
  at: string;
  checks: Record<string, HealthResult>;
  criticalFailures: string[];
  degraded: string[];
}

export interface RuntimeStatus {
  state: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  startedAt?: string;
  uptimeMs?: number;
  modules: { id: string; status: ModuleStatus }[];
  tasks: { queued: number; running: number; failed: number; completed: number };
  memory: { entries: number };
  version: string;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type LogCategory =
  | 'SYSTEM'
  | 'MODULE'
  | 'AI'
  | 'TASK'
  | 'SECURITY'
  | 'MEMORY'
  | 'INSTALL';

export interface LogEntry {
  at: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  module?: string;
  meta?: Record<string, unknown>;
}