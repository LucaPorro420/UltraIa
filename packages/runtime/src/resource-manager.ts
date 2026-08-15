import * as os from 'node:os';
import type { ResourceLevel, ResourceReport, ResourceSample, ResourceSnapshot, UltraModule } from './types';
import type { UltraEventBus } from './event-bus';

export interface ResourceCollector {
  name: string;
  collect(): ResourceSample | Promise<ResourceSample>;
}

export interface ResourceManagerOptions {
  /** Fraction (0..1) above which a resource is WARNING. Default 0.7. */
  warningAt?: number;
  /** Fraction (0..1) above which a resource is CRITICAL. Default 0.85. */
  criticalAt?: number;
  pollMs?: number;
}

/**
 * Real CPU usage sampler (os.loadavg() is [0,0,0] on Windows): computes the
 * delta of per-core busy time between polls.
 */
export class CpuUsageSampler implements ResourceCollector {
  readonly name = 'cpu';
  private last: { idle: number; total: number } | undefined;

  collect(): ResourceSample {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      idle += cpu.times.idle;
      total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }
    const now = { idle, total };
    let usage = 0;
    if (this.last) {
      const idleDelta = now.idle - this.last.idle;
      const totalDelta = now.total - this.last.total;
      if (totalDelta > 0) usage = Math.min(1, Math.max(0, 1 - idleDelta / totalDelta));
    }
    this.last = now;
    return { usage, label: 'cpu' };
  }
}

export class MemoryUsageCollector implements ResourceCollector {
  readonly name = 'memory';
  collect(): ResourceSample {
    const total = os.totalmem();
    const free = os.freemem();
    return { usage: total > 0 ? 1 - free / total : 0, label: 'memory' };
  }
}

export interface ResourceManagerLike {
  collect(): Promise<ResourceSnapshot>;
  evaluate(snapshot: ResourceSnapshot, modules?: UltraModule[]): ResourceReport;
}

/**
 * Resource monitor: NORMAL / WARNING / CRITICAL levels per resource.
 * In CRITICAL it suggests unloading inactive HEAVY/GPU modules — the Shell can
 * act on the suggestion; the manager never kills anything on its own.
 */
export class ResourceManager implements ResourceManagerLike {
  private readonly warningAt: number;
  private readonly criticalAt: number;
  private readonly pollMs: number;
  private timer?: ReturnType<typeof setInterval>;
  private lastReport?: ResourceReport;

  constructor(
    private readonly collectors: ResourceCollector[],
    private readonly events?: UltraEventBus,
    options: ResourceManagerOptions = {},
  ) {
    if (collectors.length === 0) throw new Error('ResourceManager needs at least one collector');
    this.warningAt = options.warningAt ?? 0.7;
    this.criticalAt = options.criticalAt ?? 0.85;
    this.pollMs = options.pollMs ?? 15_000;
  }

  async collect(): Promise<ResourceSnapshot> {
    const samples: Record<string, ResourceSample> = {};
    for (const collector of this.collectors) {
      try {
        samples[collector.name] = await collector.collect();
      } catch {
        // A failing collector degrades gracefully (observable, recoverable).
        samples[collector.name] = { usage: 0, label: collector.name };
      }
    }
    return { at: new Date().toISOString(), samples };
  }

  evaluate(snapshot: ResourceSnapshot, modules: UltraModule[] = []): ResourceReport {
    const perResource: ResourceReport['perResource'] = {};
    let worst: ResourceLevel = 'NORMAL';
    for (const [name, sample] of Object.entries(snapshot.samples)) {
      const level: ResourceLevel =
        sample.usage >= this.criticalAt ? 'CRITICAL' : sample.usage >= this.warningAt ? 'WARNING' : 'NORMAL';
      perResource[name] = { usage: sample.usage, level };
      if (level === 'CRITICAL') worst = 'CRITICAL';
      else if (level === 'WARNING' && worst === 'NORMAL') worst = 'WARNING';
    }

    const unloadSuggestions: string[] = [];
    if (worst === 'CRITICAL') {
      for (const module of modules) {
        if (module.status === 'installed' || module.status === 'available') {
          if (module.weight === 'HEAVY' || module.weight === 'GPU') unloadSuggestions.push(module.id);
        }
      }
    }

    this.lastReport = {
      at: snapshot.at,
      level: worst,
      perResource,
      unloadSuggestions,
    };
    return this.lastReport;
  }

  getLastReport(): ResourceReport | undefined {
    return this.lastReport;
  }

  start(): void {
    if (this.timer) return;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.pollMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async poll(): Promise<void> {
    const snapshot = await this.collect();
    const report = this.evaluate(snapshot);
    this.events?.emit('resource.updated', report);
    if (report.level === 'CRITICAL') this.events?.emit('resource.critical', report);
    else if (report.level === 'WARNING') this.events?.emit('resource.warning', report);
  }
}