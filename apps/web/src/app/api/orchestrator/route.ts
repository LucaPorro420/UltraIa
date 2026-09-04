//! POST /api/orchestrator — unified orchestration endpoint.
// Connects web, mobile, VSCode, and runtime. Tracks learning, syncs state,
// provides real-time metrics. Wires to existing AutoPub/Cerebro systems.
import { z } from 'zod';
import { getCurrentUser } from '@/lib/server/context';
import {
  getOrchestrator,
  ConnectedAppSchema,
  LearningEventSchema,
  OrchestrationCommandSchema,
} from '@ultraia/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  action: z.enum([
    'register_app',
    'update_status',
    'track_learning',
    'send_command',
    'record_metric',
    'dashboard',
    'export_learning',
    'import_learning',
  ]),
  // register_app
  app: ConnectedAppSchema.optional(),
  // update_status
  appId: z.string().optional(),
  status: z.enum(['connected', 'disconnected', 'syncing', 'error']).optional(),
  // track_learning
  event: LearningEventSchema.optional(),
  // send_command
  command: OrchestrationCommandSchema.optional(),
  // record_metric
  metric: z
    .object({
      name: z.string(),
      value: z.number(),
      unit: z.string(),
      app: z.enum(['web', 'mobile', 'vscode', 'runtime']),
    })
    .optional(),
  // import_learning
  events: z.array(LearningEventSchema).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const orchestrator = getOrchestrator();
  const { action } = parsed.data;

  switch (action) {
    case 'register_app': {
      if (!parsed.data.app) {
        return Response.json({ error: 'app required' }, { status: 400 });
      }
      orchestrator.registerApp(parsed.data.app);
      return Response.json({ ok: true, apps: orchestrator.getConnectedApps() });
    }

    case 'update_status': {
      const { appId, status } = parsed.data;
      if (!appId || !status) {
        return Response.json({ error: 'appId + status required' }, { status: 400 });
      }
      orchestrator.updateAppStatus(appId, status);
      return Response.json({ ok: true });
    }

    case 'track_learning': {
      if (!parsed.data.event) {
        return Response.json({ error: 'event required' }, { status: 400 });
      }
      orchestrator.trackLearning(parsed.data.event);
      return Response.json({ ok: true, total: orchestrator.getLearningByApp(parsed.data.event.app).length });
    }

    case 'send_command': {
      if (!parsed.data.command) {
        return Response.json({ error: 'command required' }, { status: 400 });
      }
      orchestrator.sendCommand(parsed.data.command);
      return Response.json({ ok: true });
    }

    case 'record_metric': {
      if (!parsed.data.metric) {
        return Response.json({ error: 'metric required' }, { status: 400 });
      }
      orchestrator.recordMetric({
        ...parsed.data.metric,
        timestamp: Date.now(),
      });
      return Response.json({ ok: true });
    }

    case 'dashboard': {
      return Response.json(orchestrator.getDashboard());
    }

    case 'export_learning': {
      return Response.json({ events: orchestrator.exportLearning() });
    }

    case 'import_learning': {
      if (!parsed.data.events) {
        return Response.json({ error: 'events required' }, { status: 400 });
      }
      orchestrator.importLearning(parsed.data.events);
      return Response.json({ ok: true, imported: parsed.data.events.length });
    }

    default:
      return Response.json({ error: 'Unknown action' }, { status: 400 });
  }
}

/** GET /api/orchestrator — quick dashboard summary. */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const orchestrator = getOrchestrator();
  return Response.json(orchestrator.getDashboard());
}
