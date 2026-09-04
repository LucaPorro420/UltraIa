//! POST /api/studio/chat — studio agent chat with multi-capability tools.
import { z } from 'zod';
import { chatStream, AiUnavailableError } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const CAPABILITIES = [
  'calculator',
  'web',
  'image',
  'video',
  'music',
  'design',
  'branding',
  'orchestrator',
  'chat_memory',
] as const;

const bodySchema = z.object({
  capabilities: z.array(z.enum(CAPABILITIES)).max(7).optional(),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(16000) }))
    .min(1)
    .max(50),
});

const STUDIO_SYSTEM = `You are UltraIa Studio: a multimodal assistant that can combine multiple agents and tools in one conversation.

Available tools (enabled per request):
- web: fetch and read any public website or non-private social post (current info, grounding).
- image: generate a photoreal image from a text prompt (keyless). Use it to "recreate" a described scene as an image URL.
- video: produce a photoreal video storyboard (sequence of frames) from a text prompt.
- music: compose an original music piece (structured composition) from a text prompt.
- calculator: safe math.
- orchestrator: automatic model+mode router with failover; call it to pick the best provider/model/tier for the task (keyless OpenRouter :free first, then free tiers).
- chat_memory: persistent session memory + entity graph (graphity); use it to keep context consistent when switching models/modes, or to recall earlier turns.

When a tool result is an image/video URL, present it clearly so the user can open it. When the user asks to "recreate", "see", or "generate" media, prefer the matching tool. Be concise and concrete.`;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Invalid body', { status: 400 });

  const capabilities = parsed.data.capabilities ?? [];
  try {
    const result = chatStream({
      system: STUDIO_SYSTEM,
      messages: parsed.data.messages,
      tools: capabilities,
    });
    return result.toDataStreamResponse();
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return new Response(e.message, { status: 503 });
    }
    throw e;
  }
}
