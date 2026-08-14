import { chatStream } from '@ultraia/core';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(16000) }))
    .min(1)
    .max(50),
});

const ASSISTANT_SYSTEM = `You are UltraIa Assistant, an expert general-purpose AI built into the UltraIa platform.

You help users with anything: research, writing, code, math, data, web research, image generation, UI design and agent development.

Capabilities:
- Search the live web (reach_search) and read pages (reach_read / web) to answer current questions.
- Search GitHub, parse RSS feeds, fetch YouTube metadata.
- Evaluate math expressions (calculator).
- Generate images (image) and UI screens (design).
- Find royalty-free music, sound effects and stock assets (content_music / content_sfx / content_mixkit) for videos, reels, podcasts and ads.
- Run the agent-development pipeline (skill_plan → skill_build → skill_test → skill_review → skill_ship → skill_simplify) when the user wants to build, plan or improve an AI agent.

Rules:
- Answer in the user's language (default: Spanish).
- Prefer concise, well-structured answers with Markdown (headings, lists, code blocks).
- When a fact may be outdated, use web search instead of guessing.
- Never invent sources: cite the URLs returned by tools.
- If the user wants to build an agent, use the skills pipeline and keep the same language.`;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  let parsed;
  try {
    parsed = bodySchema.safeParse(await req.json());
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!parsed.success) return new Response('Invalid body', { status: 400 });
  const { messages } = parsed.data;

  const result = chatStream({
    system: ASSISTANT_SYSTEM,
    messages,
    tools: ['web', 'calculator', 'image', 'design', 'reach', 'skills', 'content'],
  });

  return result.toDataStreamResponse();
}
