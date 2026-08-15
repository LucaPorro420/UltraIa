import * as path from 'node:path';
import type { RuntimeStatus, UltraModule } from './types';
import { UltraPaths, UltraConfig, loadEnvFile } from './config';
import { UltraLogger, MemoryLogSink, type UltraLoggerOptions } from './logger';
import { UltraEventBus } from './event-bus';
import { TaskManager } from './task-manager';
import { ModuleRegistry } from './module-registry';
import { ModuleManager, type LoadedModule } from './module-manager';
import {
  ResourceManager,
  CpuUsageSampler,
  MemoryUsageCollector,
  type ResourceCollector,
} from './resource-manager';
import { CommandExecutor } from './command-executor';
import { HealthManager } from './health';
import { Recovery } from './recovery';
import { MemoryManager, type MemoryPersistence } from './memory';
import { ContextSelector } from './context';

export interface RuntimeOptions {
  /** Root of the .ultraia/ directory. Default <project>/../.ultraia (project-adjacent). */
  root?: string;
  /** Project root (where .env / package.json live). Default process.cwd(). */
  projectRoot?: string;
  /** Extra resource collectors (GPU, disk, workers…). */
  resourceCollectors?: ResourceCollector[];
  /** Loader used by ModuleManager (host-provided; modules stay lazy without it). */
  loader?: (module: UltraModule) => Promise<LoadedModule>;
  /** Memory persistence (default: JSON file under .ultraia/memory/). */
  memoryPersistence?: MemoryPersistence;
  loggerSinks?: UltraLoggerOptions['sinks'];
}

export interface RuntimeModule {
  id: string;
  name: string;
  version: string;
  description: string;
  category: UltraModule['category'];
  capabilities: string[];
  weight?: UltraModule['weight'];
  lazy?: boolean;
}

/**
 * The local execution runtime: single owner of services, modules, tasks,
 * resources, commands, health, memory and events. The Shell talks to this
 * object (directly or via the future Local API) — never to the OS.
 */
export class UltraRuntime {
  readonly paths: UltraPaths;
  readonly config: UltraConfig;
  readonly logger: UltraLogger;
  readonly memoryLogs: MemoryLogSink;
  readonly events: UltraEventBus;
  readonly tasks: TaskManager;
  readonly registry: ModuleRegistry;
  readonly modules: ModuleManager;
  readonly resources: ResourceManager;
  readonly commands: CommandExecutor;
  readonly health: HealthManager;
  readonly recovery: Recovery;
  readonly memory: MemoryManager;
  readonly context: ContextSelector;

  readonly version = '0.1.0';
  private state: RuntimeStatus['state'] = 'stopped';
  private startedAt?: string;
  private readonly projectRoot: string;
  private readonly options: RuntimeOptions;

  private constructor(options: RuntimeOptions) {
    this.options = options;
    this.projectRoot = options.projectRoot ?? process.cwd();
    this.paths = new UltraPaths(options.root ?? path.join(this.projectRoot, '.ultraia'));
    this.memoryLogs = new MemoryLogSink();
    this.logger = new UltraLogger({ sinks: options.loggerSinks ?? [this.memoryLogs] });
    this.config = new UltraConfig({ configDir: this.paths.config });
    this.events = new UltraEventBus(this.logger);
    this.tasks = new TaskManager(this.events, { onFailure: (task, error) => this.onTaskFailure(task.id, error) });
    this.registry = new ModuleRegistry(this.events);
    this.modules = new ModuleManager(
      this.registry,
      this.events,
      this.logger,
      options.loader ? { loader: options.loader, onError: (id, error) => void this.recovery.onFailure(id, error, () => this.modules.start(id)) } : undefined,
    );
    this.resources = new ResourceManager(
      [new CpuUsageSampler(), new MemoryUsageCollector(), ...(options.resourceCollectors ?? [])],
      this.events,
    );
    this.commands = new CommandExecutor(this.events, this.logger);
    this.health = new HealthManager(this.events, this.logger);
    this.recovery = new Recovery(this.events, this.logger);
    this.memory = new MemoryManager(
      this.events,
      this.logger,
      options.memoryPersistence ? { persistence: options.memoryPersistence } : {},
    );
    this.context = new ContextSelector();
  }

  static create(options: RuntimeOptions = {}): UltraRuntime {
    return new UltraRuntime(options);
  }

  get stateName(): RuntimeStatus['state'] {
    return this.state;
  }

  /** Boot sequence: dirs → env → memory → default modules/commands → healthy. */
  async start(): Promise<void> {
    if (this.state === 'running') return;
    this.state = 'starting';
    this.startedAt = new Date().toISOString();
    this.events.emit('runtime.starting', { version: this.version });
    try {
      this.paths.ensure();
      loadEnvFile(path.join(this.projectRoot, '.env'));
      loadEnvFile(path.join(this.projectRoot, 'apps', 'web', '.env'));
      await this.memory.init();
      this.registerSystemModules();
      this.registerSystemCommands();
      this.registerSystemHealth();
      this.resources.start();
      this.state = 'running';
      this.events.emit('runtime.started', { version: this.version });
      this.logger.info('SYSTEM', 'runtime started', { version: this.version, root: this.paths.root });
    } catch (err) {
      this.state = 'error';
      this.events.emit('runtime.error', { error: String(err) });
      this.logger.error('SYSTEM', 'runtime failed to start', { error: String(err) });
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.state === 'stopped') return;
    this.state = 'stopping';
    this.events.emit('runtime.stopping');
    this.resources.stop();
    await this.modules.stopAll();
    const report = this.memory.generateReport();
    this.memory.store({
      type: 'PROJECT',
      source: 'runtime.stop',
      content: `Session closed. ${report.entryCount} memories aggregated.`,
      importance: 0.4,
    });
    await this.memory.persist();
    this.state = 'stopped';
    this.events.emit('runtime.stopped', { uptimeMs: this.uptimeMs() });
    this.logger.info('SYSTEM', 'runtime stopped');
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  status(): RuntimeStatus {
    const counts = this.tasks.counts();
    return {
      state: this.state,
      startedAt: this.startedAt,
      uptimeMs: this.state === 'running' ? this.uptimeMs() : undefined,
      modules: this.registry.list().map((m) => ({ id: m.id, status: m.status })),
      tasks: { queued: counts.queued, running: counts.running, failed: counts.failed, completed: counts.completed },
      memory: { entries: this.memory.count() },
      version: this.version,
    };
  }

  async healthReport() {
    return this.health.runAll();
  }

  /** Discovers modules from the host: metadata only, nothing loaded. */
  registerModules(modules: RuntimeModule[]): void {
    for (const module of modules) {
      this.registry.register({
        ...module,
        status: 'available',
        lazy: module.lazy ?? true,
      });
    }
  }

  private registerSystemModules(): void {
    if (this.registry.get('system')) return;
    this.registry.register({
      id: 'system',
      name: 'UltraIa System',
      version: this.version,
      description: 'Core runtime services (tasks, memory, resources, health).',
      category: 'system',
      capabilities: ['system.status', 'system.health', 'system.memory'],
      status: 'available',
      weight: 'LIGHT',
      lazy: false,
    });
    this.registry.register({
      id: 'memory',
      name: 'Memory System',
      version: this.version,
      description: 'Structured session and project memory with reports.',
      category: 'data',
      capabilities: ['memory.store', 'memory.search', 'memory.report'],
      status: 'available',
      weight: 'LIGHT',
      lazy: false,
    });
  }

  private registerSystemCommands(): void {
    if (this.commands.listCommands().some((c) => c.id === 'system.status')) return;
    this.commands.register({
      id: 'system.status',
      level: 'safe',
      description: 'Runtime status snapshot',
      handler: () => this.status(),
    });
    this.commands.register({
      id: 'system.health',
      level: 'safe',
      description: 'Run all health checks',
      handler: async () => this.health.runAll(),
    });
    this.commands.register({
      id: 'system.modules',
      level: 'safe',
      description: 'List module metadata (no loading)',
      handler: () => this.registry.list().map((m) => this.registry.describe(m.id)),
    });
    this.commands.register({
      id: 'system.memory',
      level: 'safe',
      description: 'Search runtime memory',
      handler: (args: Record<string, unknown>) =>
        this.memory.search({ query: typeof args.query === 'string' ? args.query : undefined, limit: 20 }),
    });
    this.commands.register({
      id: 'system.capabilities',
      level: 'safe',
      description: 'Capability map for the AI orchestrator (no module loading)',
      handler: () => this.registry.capabilityMap(),
    });
    this.commands.register({
      id: 'module.start',
      level: 'restricted',
      description: 'Start a module (lazy load on demand)',
      handler: async (args: Record<string, unknown>) => {
        if (typeof args.id !== 'string') throw new Error('module.start requires args.id');
        await this.modules.start(args.id);
        return this.registry.describe(args.id);
      },
    });
    this.commands.register({
      id: 'module.stop',
      level: 'restricted',
      description: 'Stop a running module',
      handler: async (args: Record<string, unknown>) => {
        if (typeof args.id !== 'string') throw new Error('module.stop requires args.id');
        await this.modules.stop(args.id);
        return { id: args.id, status: this.registry.get(args.id)?.status };
      },
    });
    this.commands.register({
      id: 'task.list',
      level: 'safe',
      description: 'List tasks',
      handler: () => this.tasks.list(),
    });
    this.commands.register({
      id: 'task.cancel',
      level: 'restricted',
      description: 'Cancel a task',
      handler: (args: Record<string, unknown>) => {
        if (typeof args.id !== 'string') throw new Error('task.cancel requires args.id');
        return this.tasks.cancel(args.id);
      },
    });
  }

  private registerSystemHealth(): void {
    if (this.health.listChecks().includes('runtime')) return;
    this.health.register({
      name: 'runtime',
      critical: true,
      run: () => ({ ok: this.state === 'running', detail: `state=${this.state}` }),
    });
    this.health.register({
      name: 'modules',
      critical: false,
      run: async () => {
        const loaded = this.registry.list().filter((m) => m.status === 'active');
        return { ok: true, detail: `${loaded.length} active` };
      },
    });
    this.health.register({
      name: 'memory',
      critical: false,
      run: async () => ({ ok: true, detail: `${this.memory.count()} entries` }),
    });
    this.health.register({
      name: 'resources',
      critical: false,
      run: async () => {
        const snapshot = await this.resources.collect();
        const report = this.resources.evaluate(snapshot);
        // Informational: resource pressure is surfaced via resource.* events,
        // not as a health failure (RAM can be high on dev machines).
        return { ok: true, detail: `level=${report.level}` };
      },
    });
  }

  private uptimeMs(): number {
    if (!this.startedAt) return 0;
    return Date.now() - new Date(this.startedAt).getTime();
  }

  private onTaskFailure(taskId: string, error: unknown): void {
    const task = this.tasks.get(taskId);
    this.memory.store({
      type: 'ERROR',
      source: 'task',
      content: `Task ${task?.type ?? taskId} failed: ${error instanceof Error ? error.message : String(error)}`,
      importance: 0.6,
      moduleId: task?.module,
    });
  }
}