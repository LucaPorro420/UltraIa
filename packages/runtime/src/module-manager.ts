import type { UltraModule } from './types';
import type { ModuleRegistry } from './module-registry';
import type { UltraEventBus } from './event-bus';
import type { UltraLogger } from './logger';

/** Runtime handle produced by the host's loader — the module's real code. */
export interface LoadedModule {
  start?: () => Promise<void> | void;
  stop?: () => Promise<void> | void;
  unload?: () => Promise<void> | void;
  health?: () => Promise<{ ok: boolean; detail?: string }> | { ok: boolean; detail?: string };
}

export interface ModuleManagerOptions {
  /**
   * Host-provided loader: imports/constructs the module on demand.
   * Called only when a module is explicitly loaded (lazy by default).
   */
  loader: (module: UltraModule) => Promise<LoadedModule>;
  onError?: (id: string, error: unknown) => void;
}

/**
 * Lifecycle controller for modules. The registry decides WHAT exists; this
 * decides WHEN it runs. Nothing loads or starts unless requested — that is the
 * "LOAD ONLY WHEN NEEDED" policy.
 */
export class ModuleManager {
  private readonly handles = new Map<string, LoadedModule>();
  private readonly loading = new Set<string>();

  constructor(
    private readonly registry: ModuleRegistry,
    private readonly events: UltraEventBus,
    private readonly logger?: UltraLogger,
    private readonly options?: ModuleManagerOptions,
  ) {}

  private loader(): (module: UltraModule) => Promise<LoadedModule> {
    if (!this.options) throw new Error('ModuleManager has no loader configured');
    return this.options.loader;
  }

  isLoaded(id: string): boolean {
    return this.handles.has(id);
  }

  getHandle(id: string): LoadedModule | undefined {
    return this.handles.get(id);
  }

  /** Loads module code (idempotent). Does NOT start it. */
  async load(id: string): Promise<LoadedModule> {
    const module = this.registry.get(id);
    if (!module) throw new Error(`module not registered: ${id}`);
    if (this.handles.has(id)) return this.handles.get(id)!;
    if (this.loading.has(id)) throw new Error(`module ${id} is already loading`);
    if (module.status === 'disabled') throw new Error(`module ${id} is disabled`);
    if (module.status === 'error') throw new Error(`module ${id} is in error state; restart first`);

    this.loading.add(id);
    this.registry.setStatus(id, 'loading');
    this.events.emit('module.loading', { id });
    try {
      const handle = await this.loader()(module);
      this.handles.set(id, handle);
      this.registry.setStatus(id, 'installed');
      this.events.emit('module.loaded', { id });
      this.logger?.info('MODULE', `module loaded`, { module: id });
      return handle;
    } catch (err) {
      this.registry.setStatus(id, 'error');
      this.events.emit('module.error', { id, error: String(err) });
      this.logger?.error('MODULE', `module load failed`, { module: id, error: String(err) });
      this.options?.onError?.(id, err);
      throw err;
    } finally {
      this.loading.delete(id);
    }
  }

  /** Starts a module. Loads it first if needed (lazy). */
  async start(id: string): Promise<void> {
    const handle = this.handles.has(id) ? this.handles.get(id)! : await this.load(id);
    const module = this.registry.get(id);
    if (module?.status === 'active') return;
    if (module?.status === 'loading') throw new Error(`module ${id} is loading`);
    if (module?.status === 'error') throw new Error(`module ${id} is in error state`);
    if (handle.start) await handle.start();
    this.registry.setStatus(id, 'active');
    this.events.emit('module.started', { id });
    this.logger?.info('MODULE', 'module started', { module: id });
  }

  async stop(id: string): Promise<void> {
    const handle = this.handles.get(id);
    if (!handle) return;
    if (handle.stop) await handle.stop();
    this.registry.setStatus(id, 'installed');
    this.events.emit('module.stopped', { id });
    this.logger?.info('MODULE', 'module stopped', { module: id });
  }

  /** Unloads module code, freeing memory. Requires stop() first. */
  async unload(id: string): Promise<void> {
    const module = this.registry.get(id);
    if (module?.status === 'active') await this.stop(id);
    const handle = this.handles.get(id);
    if (handle?.unload) await handle.unload();
    this.handles.delete(id);
    this.registry.setStatus(id, 'available');
    this.events.emit('module.unloaded', { id });
    this.logger?.info('MODULE', 'module unloaded', { module: id });
  }

  async restart(id: string): Promise<void> {
    await this.stop(id);
    await this.start(id);
  }

  /** Clears an error state so the module can be retried. */
  recoverError(id: string): boolean {
    const module = this.registry.get(id);
    if (!module || module.status !== 'error') return false;
    this.registry.setStatus(id, 'available');
    this.events.emit('module.recovered', { id });
    return true;
  }

  async status(id: string) {
    const module = this.registry.get(id);
    if (!module) return undefined;
    return { ...this.registry.describe(id)!, loaded: this.handles.has(id), status: module.status };
  }

  /** Stops every active module (reverse registration order). */
  async stopAll(): Promise<string[]> {
    const active = this.registry.list().filter((m) => m.status === 'active');
    const stopped: string[] = [];
    for (const module of active.reverse()) {
      await this.stop(module.id).catch(() => undefined);
      stopped.push(module.id);
    }
    return stopped;
  }

  /** Health check for a loaded module. */
  async health(id: string): Promise<{ ok: boolean; detail?: string }> {
    const handle = this.handles.get(id);
    if (!handle) return { ok: false, detail: 'not loaded' };
    if (!handle.health) return { ok: true };
    return handle.health();
  }
}