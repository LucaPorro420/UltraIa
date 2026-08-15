import type { ModuleCategory, ModuleStatus, UltraModule } from './types';
import type { UltraEventBus } from './event-bus';

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+/;

/**
 * Central module metadata store. Holds ONLY descriptions — never code.
 * Capability discovery happens here without loading a single module payload,
 * so the Shell can know "what exists" while loading almost nothing.
 */
export class ModuleRegistry {
  private readonly modules = new Map<string, UltraModule>();

  constructor(private readonly events?: UltraEventBus) {}

  register(module: UltraModule): void {
    if (!ID_PATTERN.test(module.id)) {
      throw new Error(`invalid module id: "${module.id}" (must match ${ID_PATTERN})`);
    }
    if (!VERSION_PATTERN.test(module.version)) {
      throw new Error(`invalid module version: "${module.version}" (semver-ish required)`);
    }
    if (this.modules.has(module.id)) {
      throw new Error(`module already registered: ${module.id}`);
    }
    this.modules.set(module.id, { ...module });
    this.events?.emit('module.registered', { id: module.id });
  }

  unregister(id: string): boolean {
    const ok = this.modules.delete(id);
    if (ok) this.events?.emit('module.unregistered', { id });
    return ok;
  }

  get(id: string): UltraModule | undefined {
    return this.modules.get(id);
  }

  /** Snapshot of every registered module (copy — mutations go through methods). */
  list(): UltraModule[] {
    return [...this.modules.values()];
  }

  listByCategory(category: ModuleCategory): UltraModule[] {
    return this.list().filter((m) => m.category === category);
  }

  findByCapability(capability: string): UltraModule[] {
    return this.list().filter((m) => m.capabilities.includes(capability));
  }

  hasCapability(id: string, capability: string): boolean {
    return this.modules.get(id)?.capabilities.includes(capability) ?? false;
  }

  /** Simple keyword search across id, name, description and capabilities. */
  search(query: string): UltraModule[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.list().filter((m) =>
      [m.id, m.name, m.description, ...m.capabilities].some((field) => field.toLowerCase().includes(q)),
    );
  }

  setStatus(id: string, status: ModuleStatus): boolean {
    const module = this.modules.get(id);
    if (!module) return false;
    module.status = status;
    this.events?.emit('module.status', { id, status });
    return true;
  }

  count(): number {
    return this.modules.size;
  }

  /** Human/LLM-friendly capability map: { capability: [moduleIds...] }. */
  capabilityMap(): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    for (const module of this.modules.values()) {
      for (const cap of module.capabilities) {
        (map[cap] ??= []).push(module.id);
      }
    }
    return map;
  }

  /** Compact metadata for context budgets: id, status, category, capabilities. */
  describe(id: string): Pick<UltraModule, 'id' | 'name' | 'version' | 'category' | 'status' | 'capabilities'> | undefined {
    const module = this.modules.get(id);
    if (!module) return undefined;
    return {
      id: module.id,
      name: module.name,
      version: module.version,
      category: module.category,
      status: module.status,
      capabilities: module.capabilities,
    };
  }
}