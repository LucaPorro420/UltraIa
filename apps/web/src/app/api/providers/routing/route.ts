import { getCurrentUser } from '@/lib/server/context';
import { providerStrategySchema, routingSummary, type ProviderName } from '@ultraia/core';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  strategy: providerStrategySchema.optional(),
  taskType: z.enum(['chat', 'coding', 'reasoning', 'vision', 'fast', 'agent', 'summarize', 'translate']).optional(),
  tier: z.enum(['fast', 'balanced', 'reasoning', 'coding', 'vision']).optional(),
  preferredProvider: z.string().optional(),
  model: z.string().optional(),
});

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const parsed = requestSchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { preferredProvider, ...rest } = parsed.data;
  return Response.json({ ok: true, routing: routingSummary({ ...rest, preferredProvider: preferredProvider as ProviderName | undefined }) }, { headers: { 'cache-control': 'no-store' } });
}

