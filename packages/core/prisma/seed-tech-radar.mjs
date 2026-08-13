// Seed script for the TechRadar table (roadmap grafico).
// Run once with: node packages/core/prisma/seed-tech-radar.mjs
// It UPSERTs by `name`, so it is safe to re-run.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// //! Cada entrada es una tecnologia real del proyecto UltraIa.
// * usagePercent = peso aproximado en el codigo fuente (no suma 100).
// * importance   = 1 (bajo) .. 5 (critico).
// * connections  = nombres de otras techs de las que depende.
// * improvements = mejoras sugeridas (backlog del roadmap).
const TECHS = [
  {
    name: 'Next.js',
    category: 'Framework web',
    usagePercent: 30,
    importance: 5,
    connections: ['React', 'Tailwind CSS', 'Vercel AI SDK', 'Prisma'],
    improvements: [
      'Separar rutas publicas de (app) con middleware de auth mas explicito',
      'Anadir /roadmap al sitemap y metadata',
    ],
    status: 'active',
    notes: 'Framework principal. App Router. Lo que el usuario ve en el navegador.',
  },
  {
    name: 'React',
    category: 'UI',
    usagePercent: 35,
    importance: 5,
    connections: ['Next.js', 'Tailwind CSS'],
    improvements: ['Componentizar mas los paneles del Studio'],
    status: 'active',
    notes: 'Biblioteca de componentes. Version 19.',
  },
  {
    name: 'Tailwind CSS',
    category: 'Estilos',
    usagePercent: 8,
    importance: 4,
    connections: ['React'],
    improvements: ['Documentar la paleta de colores (glow-*) en la guia'],
    status: 'active',
    notes: 'Framework de estilos utilitario (v4).',
  },
  {
    name: 'Vercel AI SDK',
    category: 'IA',
    usagePercent: 6,
    importance: 5,
    connections: ['OpenAICompatibleGateway', 'React'],
    improvements: ['Soportar mas proveedores de chat ademas de OpenAI-compatible'],
    status: 'active',
    notes: 'Paquetes "ai" y "@ai-sdk/openai". Conecta el chat con el gateway.',
  },
  {
    name: 'OpenAICompatibleGateway',
    category: 'IA (core)',
    usagePercent: 4,
    importance: 5,
    connections: ['Vercel AI SDK', 'Prisma'],
    improvements: ['Permitir cambiar de modelo por variable de entorno'],
    status: 'active',
    notes: 'Gateway en packages/core que habla con cualquier API tipo OpenAI.',
  },
  {
    name: 'Prisma',
    category: 'Base de datos',
    usagePercent: 10,
    importance: 5,
    connections: ['SQLite'],
    improvements: ['Anadir tabla TechRadar a un panel admin editable'],
    status: 'active',
    notes: 'ORM. Define el esquema y migra la base de datos.',
  },
  {
    name: 'SQLite',
    category: 'Base de datos',
    usagePercent: 2,
    importance: 4,
    connections: ['Prisma'],
    improvements: ['Evaluar Postgres para multi-usuario real'],
    status: 'active',
    notes: 'Motor de BD local (dev.db). Solo para desarrollo.',
  },
  {
    name: '@google/stitch-sdk',
    category: 'IA / Diseno',
    usagePercent: 2,
    importance: 3,
    connections: ['Herramienta Design (core)'],
    improvements: ['Fallback a Figma si no hay STITCH_API_KEY', 'Cachear HTML generado'],
    status: 'active',
    notes: 'SDK oficial de Google Stitch para generar UI desde texto.',
  },
  {
    name: 'lucide-react',
    category: 'UI',
    usagePercent: 3,
    importance: 3,
    connections: ['React'],
    improvements: [],
    status: 'active',
    notes: 'Iconos SVG usados en toda la app.',
  },
  {
    name: 'react-resizable-panels',
    category: 'UI',
    usagePercent: 2,
    importance: 3,
    connections: ['React'],
    improvements: ['Persistir el tamano de los paneles del Studio'],
    status: 'active',
    notes: 'Paneles redimensionables del Studio.',
  },
  {
    name: 'sonner',
    category: 'UI',
    usagePercent: 1,
    importance: 2,
    connections: ['React'],
    improvements: [],
    status: 'active',
    notes: 'Toast/notificaciones.',
  },
  {
    name: 'bcryptjs',
    category: 'Auth',
    usagePercent: 1,
    importance: 4,
    connections: ['Prisma'],
    improvements: ['Rotar hash si se cambia la politica de password'],
    status: 'active',
    notes: 'Hashea contrasenas de usuario.',
  },
  {
    name: 'zod',
    category: 'Validacion',
    usagePercent: 3,
    importance: 4,
    connections: [],
    improvements: ['Reutilizar esquemas zod entre rutas y formularios'],
    status: 'active',
    notes: 'Valida formularios y bodies de API.',
  },
  {
    name: 'clsx / tailwind-merge',
    category: 'Utilidades',
    usagePercent: 2,
    importance: 2,
    connections: ['Tailwind CSS'],
    improvements: [],
    status: 'active',
    notes: 'Combinan clases CSS sin conflictos.',
  },
  {
    name: 'date-fns',
    category: 'Utilidades',
    usagePercent: 1,
    importance: 2,
    connections: [],
    improvements: [],
    status: 'active',
    notes: 'Formato de fechas.',
  },
];

async function main() {
  for (const t of TECHS) {
    await prisma.techRadar.upsert({
      where: { name: t.name },
      update: {
        category: t.category,
        usagePercent: t.usagePercent,
        importance: t.importance,
        connections: JSON.stringify(t.connections),
        improvements: JSON.stringify(t.improvements),
        status: t.status,
        notes: t.notes,
      },
      create: {
        name: t.name,
        category: t.category,
        usagePercent: t.usagePercent,
        importance: t.importance,
        connections: JSON.stringify(t.connections),
        improvements: JSON.stringify(t.improvements),
        status: t.status,
        notes: t.notes,
      },
    });
    console.log('upserted:', t.name);
  }
  console.log('TechRadar seed done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
