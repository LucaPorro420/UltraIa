//! GET /api/orchestrator/dashboard — cross-app metrics dashboard.
// Provides unified view of all connected apps, learning events, and metrics.
// Wires to existing AutoPub/Cerebro systems for real-time insights.
import { getCurrentUser } from '@/lib/server/context';
import { getOrchestrator, getLearningTracker } from '@ultraia/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/orchestrator/dashboard — full dashboard with learning insights. */
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const orchestrator = getOrchestrator();
  const tracker = getLearningTracker();

  const dashboard = orchestrator.getDashboard();
  const learningSummary = tracker.getSummary();

  // Merge insights from both systems
  const insights = [
    ...dashboard.learning.byCategory,
    ...learningSummary.insights.map(i => ({
      pattern: i.pattern,
      count: i.frequency,
      apps: i.apps,
      recommendation: i.recommendation,
    })),
  ];

  return Response.json({
    ...dashboard,
    learning: {
      ...dashboard.learning,
      insights,
      topPatterns: learningSummary.topPatterns,
      appContributions: learningSummary.appContributions,
    },
    timestamp: Date.now(),
  });
}
