import { OpenAICompatibleGateway, getActiveVersion, prisma, verifyApiKey } from '@ultraia/core';
import { z } from 'zod';

const bodySchema = z.object({ message: z.string().trim().min(1).max(16000) });

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const usage = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = usage.get(key);
  if (!entry || entry.resetAt < now) {
    usage.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ blueprintId: string }> },
) {
  const { blueprintId } = await params;
  const apiKey = req.headers.get('x-api-key');
  if (rateLimited(apiKey ?? 'anon')) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  const record = await verifyApiKey(prisma, apiKey, blueprintId);
  if (!record) return new Response('Invalid API key', { status: 401 });

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
  const system =
    active.systemPrompt +
    (guardrails.length ? `\n\n## Guardrails\n${guardrails.map((g, i) => `${i + 1}. ${g}`).join('\n')}` : '');
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
