// //! Seed de los agentes de UltraIa usados como MEMORIA PRIVADA.
// * Los 7 especialistas + 1 Orquestador son PRIVADOS (isPublic: false): son la
// * "memoria" del sistema. Cada uno lleva HABILIDADES (skills) y un BUCLE (loop)
// * de trabajo autónomo embebidos en el systemPrompt.
// * Correr con: node packages/core/prisma/seed-agents.mjs
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AGENTS, DEMO_EMAIL, DEMO_PASSWORD, buildPrompt } from './seed-data.mjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: 'UltraIa Starter', passwordHash },
  });
  const workspace = await prisma.workspace.upsert({
    where: { id: 'ws-starter' },
    update: {},
    create: { id: 'ws-starter', name: 'UltraIa Starter', ownerId: user.id },
  });

  // * Especialistas PRIVADOS (memoria del sistema); solo el Orquestador es publico (isPublic: true).
  for (const a of AGENTS) {
    const systemPrompt = buildPrompt(a.base, a.skills, a.loop);
    const isPublic = a.isPublic ?? false;
    const blueprint = await prisma.agentBlueprint.upsert({
      where: { id: a.id },
      update: { name: a.name, taskDescription: a.task, isPublic },
      create: {
        id: a.id,
        workspaceId: workspace.id,
        name: a.name,
        taskDescription: a.task,
        isPublic,
        evalInputs: '[]',
      },
    });
    await prisma.agentVersion.upsert({
      where: { blueprintId_versionNumber: { blueprintId: blueprint.id, versionNumber: 1 } },
      update: {
        systemPrompt,
        model: '',
        tools: JSON.stringify(a.caps),
        rubric: 'Coordinación/ejecución correcta según el rol; uso de skills y loop; citas cuando aplica.',
        guardrails: 'No inventes datos; delega al especialista correcto; marca incertidumbre.',
        status: 'ACTIVE',
        changeSummary: 'Starter agents: private memory + skills + loops + orchestrator',
      },
      create: {
        blueprintId: blueprint.id,
        versionNumber: 1,
        systemPrompt,
        model: '',
        tools: JSON.stringify(a.caps),
        rubric: 'Coordinación/ejecución correcta según el rol; uso de skills y loop; citas cuando aplica.',
        guardrails: 'No inventes datos; delega al especialista correcto; marca incertidumbre.',
        status: 'ACTIVE',
        changeSummary: 'Starter agents: private memory + skills + loops + orchestrator',
      },
    });
    console.log('seeded (private):', a.name, '->', a.caps.join(','));
  }
  console.log('Starter agents seed done (8 agents, all private).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
