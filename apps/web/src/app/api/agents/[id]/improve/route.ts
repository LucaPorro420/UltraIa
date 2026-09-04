import { OpenAICompatibleGateway, collectImprovementSignals, createProposedVersion, prisma, proposeImprovement } from '@ultraia/core';
import { z } from 'zod';
import { getBlueprintForUser } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

const bodySchema = z.object({ agentId: z.string() });

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

  const blueprint = await getBlueprintForUser(prisma, user.id, parsed.data.agentId);
  if (!blueprint) return new Response('Agent not found', { status: 404 });

  const active = blueprint.versions.find((v) => v.status === 'ACTIVE');
  if (!active) return new Response('No active version', { status: 409 });

  try {
    const signals = await collectImprovementSignals(prisma, parsed.data.agentId);
    const proposal = await proposeImprovement(new OpenAICompatibleGateway(), {
      taskDescription: blueprint.taskDescription,
      currentSystemPrompt: active.systemPrompt,
      rubric: JSON.parse(active.rubric) as string[],
      guardrails: JSON.parse(active.guardrails) as string[],
      signals,
    });
    const version = await createProposedVersion(prisma, parsed.data.agentId, proposal);
    return Response.json({
      versionId: version.versionId,
      versionNumber: version.versionNumber,
      changeSummary: proposal.changeSummary,
    });
  } catch (err) {
    return new Response('Improvement failed', { status: 400 });
  }
}
