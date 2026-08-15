import type { UltraEventBus } from './event-bus';
import type { UltraLogger } from './logger';

export type RecoveryAction = 'restart' | 'ignore';

export interface RecoveryPolicy {
  /** Max auto-recovery attempts before surfacing failure. Default 2. */
  maxAttempts?: number;
  /** Delay between attempts in ms. Default 1000. */
  backoffMs?: number;
  /** What to do after a module failure. Default 'restart'. */
  action?: RecoveryAction;
}

export interface RecoveryAttempt {
  moduleId: string;
  attempt: number;
  at: string;
  error: string;
  recovered: boolean;
}

/**
 * Per-module failure recovery: capture → log → notify → cleanup → retry with
 * backoff when the policy says it is safe. A failing module NEVER blocks the
 * whole runtime — failures surface as verdicts the Shell can show.
 */
export class Recovery {
  private readonly attempts = new Map<string, { count: number; lastAt: string }>();
  private readonly policies = new Map<string, Required<RecoveryPolicy>>();
  private readonly history: RecoveryAttempt[] = [];
  private readonly maxHistory: number;

  constructor(
    private readonly events: UltraEventBus,
    private readonly logger?: UltraLogger,
  ) {
    this.maxHistory = 100;
  }

  setPolicy(moduleId: string, policy: RecoveryPolicy): void {
    this.policies.set(moduleId, {
      maxAttempts: policy.maxAttempts ?? 2,
      backoffMs: policy.backoffMs ?? 1000,
      action: policy.action ?? 'restart',
    });
  }

  getPolicy(moduleId: string): Required<RecoveryPolicy> {
    return (
      this.policies.get(moduleId) ?? { maxAttempts: 2, backoffMs: 1000, action: 'restart' }
    );
  }

  /** Clears the failure counter (call after a successful recovery/start). */
  markHealthy(moduleId: string): void {
    this.attempts.delete(moduleId);
  }

  /**
   * Runs a recovery cycle for a module failure. Returns true if the module is
   * expected to be healthy again, false when attempts are exhausted.
   */
  async onFailure(
    moduleId: string,
    error: unknown,
    retry: (attempt: number) => Promise<void>,
  ): Promise<boolean> {
    const policy = this.getPolicy(moduleId);
    const state = this.attempts.get(moduleId) ?? { count: 0, lastAt: '' };
    state.count += 1;
    state.lastAt = new Date().toISOString();
    this.attempts.set(moduleId, state);
    const message = error instanceof Error ? error.message : String(error);

    this.logger?.error('MODULE', `module failure`, { module: moduleId, error: message, attempt: state.count });
    this.events.emit('module.failure', { moduleId, error: message, attempt: state.count });

    if (policy.action === 'ignore' || state.count > policy.maxAttempts) {
      this.history.push({
        moduleId,
        attempt: state.count,
        at: state.lastAt,
        error: message,
        recovered: false,
      });
      if (this.history.length > this.maxHistory) this.history.shift();
      this.events.emit('module.recovery-exhausted', { moduleId, error: message });
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, policy.backoffMs));
    try {
      await retry(state.count);
      this.markHealthy(moduleId);
      this.history.push({
        moduleId,
        attempt: state.count,
        at: new Date().toISOString(),
        error: message,
        recovered: true,
      });
      this.events.emit('module.recovered', { moduleId, attempt: state.count });
      this.logger?.info('MODULE', 'module recovered', { module: moduleId, attempt: state.count });
      return true;
    } catch (retryErr) {
      const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
      this.logger?.warn('MODULE', 'recovery retry failed', { module: moduleId, error: retryMessage });
      this.events.emit('module.retry-failed', { moduleId, error: retryMessage, attempt: state.count });
      return this.onFailure(moduleId, retryErr, retry);
    }
  }

  recentHistory(): RecoveryAttempt[] {
    return [...this.history];
  }

  attemptsFor(moduleId: string): number {
    return this.attempts.get(moduleId)?.count ?? 0;
  }
}