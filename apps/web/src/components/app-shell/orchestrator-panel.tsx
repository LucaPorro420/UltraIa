//! Live orchestrator panel showing cross-app state, learning events, and metrics.
//! Fetches from /api/orchestrator/dashboard and auto-refreshes every 10s.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Brain, BarChart3, Zap, Radio, Wifi, WifiOff } from 'lucide-react';

interface ConnectedApp {
  type: string;
  id: string;
  status: 'connected' | 'disconnected' | 'degraded';
  lastSeen: number;
  version: string;
  capabilities: string[];
}

interface LearningData {
  total: number;
  unverified: number;
  verified: number;
  byCategory: Record<string, number>;
  recent: Array<{
    id: string;
    app: string;
    category: string;
    description: string;
    impact: string;
    verified: boolean;
  }>;
}

interface OrchestratorMetric {
  name: string;
  value: number;
  unit: string;
  app: string;
  timestamp: number;
}

interface DashboardData {
  apps: ConnectedApp[];
  learning: LearningData;
  metrics: OrchestratorMetric[];
  recentCommands: Array<{
    id: string;
    from: string;
    to: string;
    action: string;
    timestamp: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  connected: 'bg-emerald-500',
  disconnected: 'bg-neutral-600',
  degraded: 'bg-amber-500',
};

const IMPACT_COLORS: Record<string, string> = {
  high: 'text-rose-400',
  medium: 'text-amber-400',
  low: 'text-emerald-400',
};

const APP_ICONS: Record<string, string> = {
  web: '🌐',
  mobile: '📱',
  vscode: '💻',
  runtime: '🧠',
};

export function OrchestratorPanel() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/orchestrator/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date());
      }
    } catch {
      // Silent fail — will retry on next interval
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10_000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading || !data) {
    return (
      <div className="rounded-lg border border-border-subtle bg-panel/60 p-4 animate-pulse">
        <div className="h-4 w-48 rounded bg-panel-header" />
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded bg-panel-header" />
          ))}
        </div>
      </div>
    );
  }

  const connectedApps = data.apps.filter((a) => a.status === 'connected');
  const disconnectedApps = data.apps.filter((a) => a.status === 'disconnected');

  return (
    <div className="rounded-lg border border-border-subtle bg-panel/60 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-neutral-200">
            Unified Orchestrator
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-neutral-500">
            <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
            LIVE
          </span>
          {lastRefresh && (
            <span className="font-mono text-[10px] text-neutral-600">
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 grid grid-cols-4 gap-3">
        <StatCard
          icon={<Wifi className="h-4 w-4 text-emerald-400" />}
          label="Connected"
          value={connectedApps.length}
          sub="apps"
        />
        <StatCard
          icon={<Brain className="h-4 w-4 text-primary" />}
          label="Learning"
          value={data.learning.total}
          sub="events"
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4 text-amber-400" />}
          label="Metrics"
          value={data.metrics.length}
          sub="recorded"
        />
        <StatCard
          icon={<Zap className="h-4 w-4 text-rose-400" />}
          label="Commands"
          value={data.recentCommands.length}
          sub="sent"
        />
      </div>

      {/* Connected apps */}
      {connectedApps.length > 0 && (
        <div className="mt-3">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
            Connected Apps
          </h3>
          <div className="flex flex-wrap gap-2">
            {connectedApps.map((app) => (
              <span
                key={app.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-panel-header px-2.5 py-1 text-xs text-neutral-300"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[app.status]}`} />
                <span>{APP_ICONS[app.type] ?? '📦'}</span>
                <span>{app.type}</span>
                <span className="text-neutral-600">v{app.version}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Disconnected apps */}
      {disconnectedApps.length > 0 && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            {disconnectedApps.map((app) => (
              <span
                key={app.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle/50 px-2.5 py-1 text-xs text-neutral-600"
              >
                <WifiOff className="h-3 w-3" />
                <span>{app.type}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Learning by category */}
      {data.learning.total > 0 && (
        <div className="mt-3">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
            Learning by Category
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.learning.byCategory).map(([cat, count]) => (
              <span
                key={cat}
                className="rounded-md bg-panel-header px-2 py-0.5 text-[11px] text-neutral-400"
              >
                {cat}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent learning */}
      {data.learning.recent && data.learning.recent.length > 0 && (
        <div className="mt-3">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
            Recent Learning
          </h3>
          <div className="space-y-1">
            {data.learning.recent.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-md border border-border-subtle/50 px-2.5 py-1.5 text-[11px]"
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{APP_ICONS[event.app] ?? '📦'}</span>
                  <span className="text-neutral-400 truncate">{event.description}</span>
                </div>
                <span className={`ml-2 shrink-0 ${IMPACT_COLORS[event.impact] ?? 'text-neutral-500'}`}>
                  {event.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="rounded-md border border-border-subtle/50 bg-panel-header/50 p-2.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-lg font-bold text-neutral-200">{value}</span>
        <span className="text-[10px] text-neutral-600">{sub}</span>
      </div>
    </div>
  );
}
