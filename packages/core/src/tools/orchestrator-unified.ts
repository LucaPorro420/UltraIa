//! Unified Orchestrator — connects web, mobile, VSCode, and runtime into
// a single coordination layer. Tracks learning, syncs state, and provides
// real-time metrics across all UltraIa components.
//
// Architecture:
//   Web App ←→ Unified API ←→ Mobile App
//                 ↕
//   VSCode Extension ←→ Runtime
//                 ↕
//   Learning Tracker (truth + memory + improvements)

import { z } from 'zod';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Connected app types in the UltraIa ecosystem. */
export type AppType = 'web' | 'mobile' | 'vscode' | 'runtime';

/** Connection status for each app. */
export type AppConnectionStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

/** A connected app instance with metadata. */
export interface ConnectedApp {
  type: AppType;
  id: string;
  status: AppConnectionStatus;
  lastSeen: number; // timestamp
  version: string;
  capabilities: string[];
}

/** Learning event tracked across all apps. */
export interface LearningEvent {
  id: string;
  app: AppType;
  timestamp: number;
  category: 'improvement' | 'bug' | 'feature' | 'insight' | 'error';
  description: string;
  source?: string; // file or URL
  impact: 'low' | 'medium' | 'high';
  verified: boolean;
}

/** Cross-app metric for the dashboard. */
export interface CrossAppMetric {
  name: string;
  value: number;
  unit: string;
  app: AppType;
  timestamp: number;
}

/** Orchestration command sent between apps. */
export interface OrchestrationCommand {
  id: string;
  from: AppType;
  to: AppType | 'all';
  action: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

// ─── Schemas ────────────────────────────────────────────────────────────────

export const ConnectedAppSchema = z.object({
  type: z.enum(['web', 'mobile', 'vscode', 'runtime']),
  id: z.string().min(1),
  status: z.enum(['connected', 'disconnected', 'syncing', 'error']) as z.ZodType<AppConnectionStatus>,
  lastSeen: z.number(),
  version: z.string(),
  capabilities: z.array(z.string()),
});

export const LearningEventSchema = z.object({
  id: z.string().min(1),
  app: z.enum(['web', 'mobile', 'vscode', 'runtime']),
  timestamp: z.number(),
  category: z.enum(['improvement', 'bug', 'feature', 'insight', 'error']),
  description: z.string().min(1),
  source: z.string().optional(),
  impact: z.enum(['low', 'medium', 'high']),
  verified: z.boolean(),
});

export const OrchestrationCommandSchema = z.object({
  id: z.string().min(1),
  from: z.enum(['web', 'mobile', 'vscode', 'runtime']),
  to: z.union([z.enum(['web', 'mobile', 'vscode', 'runtime']), z.literal('all')]),
  action: z.string().min(1),
  payload: z.record(z.unknown()),
  timestamp: z.number(),
});

// ─── Unified Orchestrator ───────────────────────────────────────────────────

export class UnifiedOrchestrator {
  private apps = new Map<string, ConnectedApp>();
  private learningEvents: LearningEvent[] = [];
  private commands: OrchestrationCommand[] = [];
  private metrics: CrossAppMetric[] = [];

  /** Register an app instance. */
  registerApp(app: ConnectedApp): void {
    this.apps.set(app.id, app);
  }

  /** Update app connection status. */
  updateAppStatus(id: string, status: AppConnectionStatus): void {
    const app = this.apps.get(id);
    if (app) {
      app.status = status;
      app.lastSeen = Date.now();
    }
  }

  /** Get all connected apps. */
  getConnectedApps(): ConnectedApp[] {
    return Array.from(this.apps.values());
  }

  /** Get apps by type. */
  getAppsByType(type: AppType): ConnectedApp[] {
    return Array.from(this.apps.values()).filter(app => app.type === type);
  }

  /** Track a learning event. */
  trackLearning(event: LearningEvent): void {
    this.learningEvents.push(event);
    // Keep only last 1000 events
    if (this.learningEvents.length > 1000) {
      this.learningEvents = this.learningEvents.slice(-1000);
    }
  }

  /** Get learning events by category. */
  getLearningByCategory(category: LearningEvent['category']): LearningEvent[] {
    return this.learningEvents.filter(e => e.category === category);
  }

  /** Get learning events by app. */
  getLearningByApp(app: AppType): LearningEvent[] {
    return this.learningEvents.filter(e => e.app === app);
  }

  /** Get unverified high-impact events (priority for review). */
  getPriorityLearning(): LearningEvent[] {
    return this.learningEvents.filter(e => !e.verified && e.impact === 'high');
  }

  /** Send a command between apps. */
  sendCommand(command: OrchestrationCommand): void {
    this.commands.push(command);
    // Keep only last 500 commands
    if (this.commands.length > 500) {
      this.commands = this.commands.slice(-500);
    }
  }

  /** Get commands for a specific app. */
  getCommandsFor(app: AppType): OrchestrationCommand[] {
    return this.commands.filter(c => c.to === app || c.to === 'all');
  }

  /** Record a cross-app metric. */
  recordMetric(metric: CrossAppMetric): void {
    this.metrics.push(metric);
    // Keep only last 2000 metrics
    if (this.metrics.length > 2000) {
      this.metrics = this.metrics.slice(-2000);
    }
  }

  /** Get dashboard summary. */
  getDashboard(): {
    apps: ConnectedApp[];
    learning: {
      total: number;
      unverified: number;
      byCategory: Record<string, number>;
      byApp: Record<string, number>;
    };
    metrics: CrossAppMetric[];
    recentCommands: OrchestrationCommand[];
  } {
    const byCategory: Record<string, number> = {};
    const byApp: Record<string, number> = {};

    for (const event of this.learningEvents) {
      byCategory[event.category] = (byCategory[event.category] || 0) + 1;
      byApp[event.app] = (byApp[event.app] || 0) + 1;
    }

    return {
      apps: this.getConnectedApps(),
      learning: {
        total: this.learningEvents.length,
        unverified: this.learningEvents.filter(e => !e.verified).length,
        byCategory,
        byApp,
      },
      metrics: this.metrics.slice(-100), // last 100 metrics
      recentCommands: this.commands.slice(-20), // last 20 commands
    };
  }

  /** Export learning events for persistence. */
  exportLearning(): LearningEvent[] {
    return [...this.learningEvents];
  }

  /** Import learning events from persistence. */
  importLearning(events: LearningEvent[]): void {
    this.learningEvents = [...events];
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let instance: UnifiedOrchestrator | null = null;

/** Get or create the singleton orchestrator. */
export function getOrchestrator(): UnifiedOrchestrator {
  if (!instance) {
    instance = new UnifiedOrchestrator();
  }
  return instance;
}

// ─── Tool Definition ────────────────────────────────────────────────────────

export const ORCHESTRATOR_UNIFIED_DESCRIPTION = `Unified Orchestrator — connects web, mobile, VSCode, and runtime.
Actions:
  register_app     — Register an app instance
  update_status    — Update app connection status
  track_learning   — Track a learning event
  send_command     — Send command between apps
  record_metric    — Record a cross-app metric
  dashboard        — Get full dashboard summary
  export_learning  — Export learning events for persistence
  import_learning  — Import learning events from persistence`;
