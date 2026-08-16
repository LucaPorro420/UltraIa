// //! Seed de la cuenta ADMIN de UltraIa.
// * Login: user: admin  /  password: admin
// * La cuenta admin contiene TODOS los recursos: los 8 agentes de memoria
// * (7 especialistas + Orquestador, todos publicos para poder verlos),
// * el tech radar, la libreria de prompts (ver seed-library.mjs) y el studio.
// * Correr con: node packages/core/prisma/seed-admin.mjs
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD, AGENTS, buildPrompt } from './seed-data.mjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'ADMIN', name: ADMIN_NAME, passwordHash },
    create: { email: ADMIN_EMAIL, name: ADMIN_NAME, role: 'ADMIN', passwordHash },
  });
  const workspace = await prisma.workspace.upsert({
    where: { id: 'ws-admin' },
    update: { name: 'UltraIa HQ', ownerId: user.id },
    create: { id: 'ws-admin', name: 'UltraIa HQ', ownerId: user.id },
  });

  // * Todos los recursos: los 8 agentes de memoria, clonados con ids propios del admin.
  for (const a of AGENTS) {
    const id = 'bp-admin-' + a.id.replace('bp-', '');
    const systemPrompt = buildPrompt(a.base, a.skills, a.loop);
    const caps = [...new Set([...a.caps, 'skills', 'content', 'memory'])];
    const isPublic = a.isPublic ?? true; // admin: todo visible ("contiene todos los recursos")
    const blueprint = await prisma.agentBlueprint.upsert({
      where: { id },
      update: { name: a.name, taskDescription: a.task, isPublic },
      create: {
        id,
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
        tools: JSON.stringify(caps),
        rubric: 'Coordinación/ejecución correcta según el rol; uso de skills y loop; citas cuando aplica.',
        guardrails: 'No inventes datos; delega al especialista correcto; marca incertidumbre.',
        status: 'ACTIVE',
        changeSummary: 'Admin resources: all agents available to the admin account',
      },
      create: {
        blueprintId: blueprint.id,
        versionNumber: 1,
        systemPrompt,
        model: '',
        tools: JSON.stringify(caps),
        rubric: 'Coordinación/ejecución correcta según el rol; uso de skills y loop; citas cuando aplica.',
        guardrails: 'No inventes datos; delega al especialista correcto; marca incertidumbre.',
        status: 'ACTIVE',
        changeSummary: 'Admin resources: all agents available to the admin account',
      },
    });
    console.log('admin resource:', a.name, '->', caps.join(','));
  }

  console.log('');
  console.log('Admin seed done. Login:');
  console.log('  user: admin');
  console.log('  password: admin');
  console.log('  (o email: admin@ultraia.local)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());