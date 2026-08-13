import { OpenAICompatibleGateway, getActiveVersion, guardrailsBlock, prisma, verifyApiKey } from '@ultraia/core';
import { z } from 'zod';

const bodySchema = z.object({ message: z.string().trim().min(1).max(16000) });

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const MAX_ENTRIES = 10_000;
const usage = new Map<string, { count: number; resetAt: number }>();

function pruneUsage(now: number): void {
  for (const [key, entry] of usage) {
    if (entry.resetAt < now) usage.delete(key);
  }
  if (usage.size > MAX_ENTRIES) {
    const keys = [...usage.keys()];
    for (let i = 0; i < keys.length - MAX_ENTRIES; i++) usage.delete(keys[i]);
  }
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  if (usage.size > MAX_ENTRIES) pruneUsage(now);
  const entry = usage.get(key);
  if (!entry || entry.resetAt < now) {
    usage.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function clientKey(req: Request): string {
  const trustProxy = process.env.ULTRAIA_TRUST_PROXY === '1';
  if (trustProxy) {
    const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const real = req.headers.get('x-real-ip')?.trim();
    if (fwd) return `ip:${fwd}`;
    if (real) return `ip:${real}`;
  }
  return 'ip:unknown';
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ blueprintId: string }> },
) {
  const { blueprintId } = await params;
  const apiKey = req.headers.get('x-api-key');
  const rateKey = apiKey ?? clientKey(req);
  if (rateLimited(rateKey)) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  const blueprint = await prisma.agentBlueprint.findUnique({ where: { id: blueprintId } });
  if (!blueprint) return new Response('Agent not found', { status: 404 });

  let authorized = false;
  if (apiKey) {
    const record = await verifyApiKey(prisma, apiKey, blueprintId);
    authorized = Boolean(record);
  }
  if (!authorized && !blueprint.isPublic) {
    return new Response('Invalid API key (or enable public access for this agent)', { status: 401 });
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  const active = await getActiveVersion(prisma, blueprintId);
  if (!active) return new Response('No active version for this agent', { status: 409 });

  const tools = JSON.parse(active.tools) as string[];
  const guardrails = JSON.parse(active.guardrails) as string[];
  const system = active.systemPrompt + guardrailsBlock(guardrails);
  const useCalculator = tools.includes('calculator');
  const preamble = useCalculator
    ? 'You have a calculator tool. Use it for any arithmetic instead of computing by hand: call the tool with an expression like "2 + 3 * 4".'
    : '';

  try {
    const text = await new OpenAICompatibleGateway().chatText({
      model: active.model,
      system: `${system}\n${preamble}`.trim(),
      input: parsed.data.message,
    });
    return Response.json({ text });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'Agent call failed', { status: 502 });
  }
}
