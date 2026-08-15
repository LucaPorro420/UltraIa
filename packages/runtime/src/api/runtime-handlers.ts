import { ApiError } from './server';
import type { ApiHandlers } from './server';
import type { MemoryType, TaskPriority } from '../types';
import type { UltraRuntime } from '../runtime';

const MEMORY_TYPES: readonly MemoryType[] = [
  'PROJECT',
  'ARCHITECTURE',
  'MODULE',
  'TASK',
  'ERROR',
  'SOLUTION',
  'DECISION',
  'LEARNING',
  'USER_PREFERENCE',
  'PERFORMANCE',
];

/** Topics streamed to WS clients. Anything else stays in-process. */
const EVENT_FILTER = /^(module|task|health|resource|memory|runtime|api)\./;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseTypes(raw: string | undefined): MemoryType[] | undefined {
  if (!raw) return undefined;
  const types = raw.split(',').filter((t) => (MEMORY_TYPES as readonly string[]).includes(t)) as MemoryType[];
  return types.length > 0 ? types : undefined;
}

function parsePriority(raw: unknown): TaskPriority | undefined {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > 5) return undefined;
  return raw as TaskPriority;
}

function parseBudgetChars(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return undefined;
  return Math.floor(raw);
}

/**
 * Adapter from UltraRuntime internals to the Local API. Validation lives
 * here (and in the runtime), never in the transport layer.
 */
export function runtimeApiHandlers(runtime: UltraRuntime): ApiHandlers {
  return {
    health: () => runtime.health.runAll(),

    status: () => runtime.status(),

    listModules: () => runtime.registry.list().map((m) => runtime.registry.describe(m.id)),

    startModule: async (id) => {
      if (!runtime.registry.get(id)) throw new ApiError(404, `module not found: ${id}`);
      await runtime.modules.start(id);
      return runtime.registry.describe(id);
    },

    stopModule: async (id) => {
      if (!runtime.registry.get(id)) throw new ApiError(404, `module not found: ${id}`);
      await runtime.modules.stop(id);
      return { id, status: runtime.registry.get(id)?.status };
    },

    executeCommand: async (body) => {
      if (!isRecord(body) || typeof body.command !== 'string' || body.command.length === 0) {
        throw new ApiError(400, 'body.command (non-empty string) is required');
      }
      const role = body.role === 'admin' || body.role === 'operator' ? body.role : 'user';
      const args = isRecord(body.args) ? body.args : {};
      return runtime.commands.execute(body.command, args, { role });
    },

    createTask: (body) => {
      if (!isRecord(body) || typeof body.type !== 'string' || body.type.length === 0) {
        throw new ApiError(400, 'body.type (non-empty string) is required');
      }
      return runtime.tasks.create(body.type, {
        module: typeof body.module === 'string' ? body.module : undefined,
        priority: parsePriority(body.priority),
      });
    },

    getTask: (id) => {
      const task = runtime.tasks.get(id);
      if (!task) throw new ApiError(404, `task not found: ${id}`);
      return task;
    },

    storeMemory: (body) => {
      if (
        !isRecord(body) ||
        typeof body.type !== 'string' ||
        !(MEMORY_TYPES as readonly string[]).includes(body.type) ||
        typeof body.source !== 'string' ||
        body.source.length === 0 ||
        typeof body.content !== 'string' ||
        body.content.length === 0
      ) {
        throw new ApiError(400, 'body.type (valid MemoryType), source and content (strings) are required');
      }
      return runtime.memory.store({
        type: body.type as MemoryType,
        source: body.source,
        content: body.content,
        importance: typeof body.importance === 'number' ? body.importance : undefined,
        confidence: typeof body.confidence === 'number' ? body.confidence : undefined,
        projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
        moduleId: typeof body.moduleId === 'string' ? body.moduleId : undefined,
      });
    },

    queryMemory: (query, types, budgetChars) =>
      runtime.context.selectFromMemory(runtime.memory, {
        query,
        types: parseTypes(types),
        budgetChars: parseBudgetChars(budgetChars),
      }),

    configSummary: () => runtime.config.toPublicView(),

    subscribeEvents: (listener) =>
      runtime.events.on('*', (payload, topic) => {
        if (EVENT_FILTER.test(topic)) listener(topic, payload);
      }),

    close: async () => {
      // The server's lifecycle is owned by UltraRuntime.stopLocalApi(); nothing
      // to tear down here (reserved for future host cleanup).
    },
  };
}