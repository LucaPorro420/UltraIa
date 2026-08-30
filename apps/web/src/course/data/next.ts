import type { Framework } from '../types';

export const next: Framework = {
  id: 'next',
  name: 'Next.js',
  category: 'fullstack',
  icon: '▲',
  color: '#ffffff',
  tagline: 'Framework React full-stack con SSR, rutas y Edge.',
  description:
    'Next.js añade enrutado, rendering en servidor, generación estática y API routes sobre React. El estándar para producción en React.',
  modules: [
    {
      id: 'next-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'Proyecto, páginas y navegación.',
      lessons: [
        {
          id: 'next-setup',
          title: 'Setup del proyecto',
          level: 'basico',
          durationMin: 20,
          summary: 'Crea un proyecto Next.js.',
          topics: ['create-next-app', 'app router', 'dev'],
          content:
            `Crea la app con 'npx create-next-app'. El App Router usa carpetas en app/ como rutas.\n\n'npm run dev' levanta el servidor con HMR.`,
          examples: [
            {
              lang: 'bash',
              code: `npx create-next-app@latest mi-app
cd mi-app
npm run dev`,
              caption: 'Crear proyecto Next.js.',
            },
          ],
        },
        {
          id: 'next-page',
          title: 'Páginas y layout',
          level: 'basico',
          durationMin: 25,
          summary: 'Componentes de ruta y layout raíz.',
          topics: ['page', 'layout', 'app dir'],
          content:
            `Cada carpeta con page.tsx es una ruta. layout.tsx envuelve a todas las páginas.\n\nEl archivo page.tsx exporta por defecto el componente de la vista.`,
          examples: [
            {
              lang: 'tsx',
              code: `// app/page.tsx
export default function Home() {
  return <h1>Inicio</h1>;
}
// app/layout.tsx
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}`,
              caption: 'Página y layout raíz.',
            },
          ],
        },
        {
          id: 'next-link',
          title: 'Navegación',
          level: 'basico',
          durationMin: 20,
          summary: 'Enlaces con el componente Link.',
          topics: ['Link', 'navigate', 'SPA'],
          content:
            `Usa el componente Link de next/link para navegación cliente rápida.\n\nEvita recargar la página completa entre rutas.`,
          examples: [
            {
              lang: 'tsx',
              code: `import Link from 'next/link';
export default function Nav() {
  return <Link href="/acerca">Acerca de</Link>;
}`,
              caption: 'Enlace con Link.',
            },
          ],
        },
      ],
    },
    {
      id: 'next-intermedio',
      title: 'Datos y rendering',
      level: 'intermedio',
      summary: 'Server Components, fetch y caching.',
      lessons: [
        {
          id: 'next-server-component',
          title: 'Server Components y fetch',
          level: 'intermedio',
          durationMin: 25,
          summary: 'Obtén datos en el servidor con async/await.',
          topics: ['Server Component', 'fetch', 'await'],
          content:
            `Los Server Components pueden ser funciones async. Usas fetch directamente y Next cachea según el tipo de petición, integrándose con su capa de caché.\n\nPara datos que cambian, configura next: { revalidate } o usa cache: 'no-store' en el fetch.`,
          examples: [
            {
              lang: 'tsx',
              code: `export default async function Pagina() {
  const res = await fetch('https://api.ejemplo.com/items', {
    next: { revalidate: 60 },
  });
  const items = await res.json();
  return <ul>{items.map((i: any) => <li key={i.id}>{i.nombre}</li>)}</ul>;
}`,
              caption: 'Fetch en Server Component con revalidación.',
            },
          ],
        },
        {
          id: 'next-client',
          title: 'Client Components',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Interactividad con use client.',
          topics: ['use client', 'estado', 'eventos'],
          content:
            `Añade 'use client' al inicio para usar hooks y estado.\n\nLos Client Components se hidratan en el navegador.`,
          examples: [
            {
              lang: 'tsx',
              code: `'use client';
import { useState } from 'react';
export default function Buscador() {
  const [q, setQ] = useState('');
  return <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" />;
}`,
              caption: 'Client Component con estado.',
            },
          ],
        },
        {
          id: 'next-route-handler',
          title: 'Route Handlers (API)',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Endpoints en app/api.',
          topics: ['route', 'GET', 'POST'],
          content:
            `Crea app/api/x/route.ts exportando funciones GET/POST.\n\nEs la forma full-stack de exponer APIs dentro de Next.`,
          examples: [
            {
              lang: 'ts',
              code: `// app/api/saludo/route.ts
import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ msg: 'hola' });
}`,
              caption: 'Route Handler GET.',
            },
          ],
        },
      ],
    },
    {
      id: 'next-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'SSR, middleware y despliegue.',
      lessons: [
        {
          id: 'next-ssr',
          title: 'SSR y streaming',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Renderizado dinámico y Suspense.',
          topics: ['dynamic', 'Suspense', 'streaming'],
          content:
            `Usa Suspense para hacer streaming de partes de la página.\n\nEl SSR entrega HTML actualizado en cada request cuando hace falta.`,
          examples: [
            {
              lang: 'tsx',
              code: `import { Suspense } from 'react';
export default function Page() {
  return (
    <Suspense fallback={<p>Cargando...</p>}>
      <Lista />
    </Suspense>
  );
}`,
              caption: 'Streaming con Suspense.',
            },
          ],
        },
        {
          id: 'next-middleware',
          title: 'Middleware',
          level: 'avanzado',
          durationMin: 25,
          summary: 'Lógica en el borde (edge).',
          topics: ['middleware', 'edge', 'rewrite'],
          content:
            `middleware.ts se ejecuta antes de las rutas en el edge.\n\nÚsalo para auth, redirects o A/B testing.`,
          examples: [
            {
              lang: 'ts',
              code: `import { NextResponse } from 'next/server';
export function middleware(req: Request) {
  const url = req.nextUrl;
  if (url.pathname === '/secreto') return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}`,
              caption: 'Middleware de protección.',
            },
          ],
        },
        {
          id: 'next-deploy',
          title: 'Despliegue en Vercel',
          level: 'avanzado',
          durationMin: 25,
          summary: 'Build y plataforma.',
          topics: ['vercel', 'build', 'env'],
          content:
            `Conecta el repo a Vercel para despliegue automático por push.\n\nDefine variables de entorno en el panel y usa 'npm run build' para validar localmente.`,
          examples: [
            {
              lang: 'bash',
              code: `npm run build
npx vercel deploy --prod`,
              caption: 'Build y despliegue.',
            },
          ],
        },
      ],
    },
  ],
};
