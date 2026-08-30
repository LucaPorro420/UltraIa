/**
 * content-sources.ts — Fuentes de contenido derivado.
 *
 * Exporta los ebooks, cursos y learning paths como fuentes para el motor
 * de contenido interno. Cada fuente tiene la estructura ContentSource
 * que el motor consume.
 */

import type { ContentSource } from '@ultraia/core/src/tools/content-templates';

/* ------------------------------------------------------------------ */
/* Ebooks                                                              */
/* ------------------------------------------------------------------ */

export const EBOOK_SOURCES: ContentSource[] = [
  {
    id: 'ebook-threejs',
    title: 'Three.js Avanzado',
    description:
      'Guía completa para crear experiencias 3D interactivas en el navegador con JavaScript/TypeScript.',
    topics: ['threejs', 'webgl', 'javascript', 'react', 'shaders'],
    level: 'Intermedio-Avanzado',
    category: 'Desarrollo Web',
    chapters: [
      'La escena mínima: scene, camera, renderer',
      'Geometrías, materiales y luces PBR',
      'Cámaras, controles y navegación',
      'Carga de modelos glTF y texturas',
      'Shaders GLSL: vértices y fragmentos',
      'Post-procesamiento y efectos',
      'React Three Fiber en producción',
      'Instancing y optimización de rendimiento',
      'Físicas y colisiones',
      'Despliegue y monitorización',
    ],
  },
  {
    id: 'ebook-unity',
    title: 'Unity Profesional',
    description:
      'Aprende a construir videojuegos profesionales desde cero con Unity y C#.',
    topics: ['unity', 'csharp', 'gamedev', 'shaders', 'ia'],
    level: 'Intermedio-Avanzado',
    category: 'Videojuegos',
    chapters: [
      'Arquitectura de un proyecto Unity',
      'C# para juegos: patrones y rendimiento',
      'Shader Graph y materiales avanzados',
      'Físicas y cinemática',
      'IA: máquinas de estado y comportamiento',
      'Audio espacial y feedback',
      'Monetización y analítica',
      'Build multiplataforma',
      'Live-ops y actualizaciones',
    ],
  },
  {
    id: 'ebook-procedural',
    title: 'Generación Procedural Planetaria',
    description:
      'Un viaje profundo a la generación procedural: desde ruido de valor y Perlin hasta síntesis de planetas.',
    topics: ['procedural', 'planetary', 'terrain', 'shaders', 'simulacion'],
    level: 'Avanzado',
    category: 'Procedural',
    chapters: [
      'Ruido: valor, Perlin, simplex y fBm',
      'Terreno por altura y biomas',
      'Océanos y agua animada',
      'Vegetación y colocación por densidad',
      'Ciudades con L-systems',
      'Tráfico agent-based',
      'Shaders de superficie planetaria',
      'Atmósfera e iluminación',
      'Streaming de chunks',
      'Optimización y paralelización',
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Cursos (frameworks)                                                 */
/* ------------------------------------------------------------------ */

export const COURSE_SOURCES: ContentSource[] = [
  {
    id: 'course-react',
    title: 'React',
    description: 'Biblioteca para interfaces de usuario basadas en componentes.',
    topics: ['react', 'hooks', 'jsx', 'frontend'],
    category: 'frontend',
    lessons: [
      { title: 'Setup con Vite', summary: 'Crea una app React moderna con Vite.', durationMin: 20 },
      { title: 'JSX y componentes', summary: 'JSX es HTML en JavaScript.', durationMin: 25 },
      { title: 'Props y estado', summary: 'Pasa datos y gestiona estado local.', durationMin: 30 },
      { title: 'Hooks fundamentales', summary: 'useState, useEffect, useRef.', durationMin: 35 },
      { title: 'Renderizado condicional', summary: 'Muestra UI según condiciones.', durationMin: 20 },
      { title: 'Listas y keys', summary: 'Renderiza colecciones eficientemente.', durationMin: 20 },
      { title: 'Formularios controlados', summary: 'Gestiona inputs con estado.', durationMin: 25 },
      { title: 'Custom hooks', summary: 'Extrae lógica reutilizable.', durationMin: 30 },
      { title: 'Context API', summary: 'Estado global sin prop drilling.', durationMin: 25 },
      { title: 'React.memo y optimización', summary: 'Evita re-renders innecesarios.', durationMin: 30 },
    ],
  },
  {
    id: 'course-next',
    title: 'Next.js',
    description: 'Framework React fullstack con SSR, SSG y App Router.',
    topics: ['nextjs', 'react', 'ssr', 'fullstack'],
    category: 'fullstack',
    lessons: [
      { title: 'App Router', summary: 'Enrutamiento basado en archivos.', durationMin: 25 },
      { title: 'Server Components', summary: 'Componentes que corren en el servidor.', durationMin: 30 },
      { title: 'Data fetching', summary: 'Obtén datos en server y client.', durationMin: 35 },
      { title: 'API Routes', summary: 'Endpoints serverless integrados.', durationMin: 25 },
      { title: 'Middleware', summary: 'Intercepta requests antes de llegar a la ruta.', durationMin: 20 },
      { title: 'Static y Dynamic rendering', summary: 'Elige la estrategia de renderizado.', durationMin: 25 },
      { title: 'Deploy en Vercel', summary: 'Publica tu app en producción.', durationMin: 15 },
    ],
  },
  {
    id: 'course-vue',
    title: 'Vue.js',
    description: 'Framework progresivo para interfaces de usuario.',
    topics: ['vue', 'composition-api', 'frontend'],
    category: 'frontend',
    lessons: [
      { title: 'Setup y Composition API', summary: 'Crea tu primera app Vue.', durationMin: 20 },
      { title: 'Reactividad', summary: 'ref y reactive para estado.', durationMin: 25 },
      { title: 'Templates y directivas', summary: 'v-if, v-for, v-model.', durationMin: 25 },
      { title: 'Componentes y props', summary: 'Comunica componentes padre-hijo.', durationMin: 30 },
      { title: 'Watchers y computed', summary: 'Deriva estado reactivamente.', durationMin: 25 },
    ],
  },
  {
    id: 'course-angular',
    title: 'Angular',
    description: 'Framework fullstack para aplicaciones empresariales.',
    topics: ['angular', 'typescript', 'frontend'],
    category: 'frontend',
    lessons: [
      { title: 'Setup y componentes', summary: 'Crea componentes con Angular CLI.', durationMin: 20 },
      { title: 'Binding y directivas', summary: 'Conecta datos con la vista.', durationMin: 25 },
      { title: 'Servicios y DI', summary: 'Inyecta dependencias.', durationMin: 30 },
      { title: 'Routing', summary: 'Navegación entre vistas.', durationMin: 25 },
      { title: 'HTTP y Observables', summary: 'Conecta con APIs backend.', durationMin: 30 },
    ],
  },
  {
    id: 'course-svelte',
    title: 'Svelte',
    description: 'Framework compile-time sin virtual DOM.',
    topics: ['svelte', 'frontend', 'compile-time'],
    category: 'frontend',
    lessons: [
      { title: 'Setup y sintaxis', summary: 'Crea tu primera app Svelte.', durationMin: 15 },
      { title: 'Reactividad', summary: 'Asignaciones reactivas.', durationMin: 20 },
      { title: 'Componentes', summary: 'Pásame props, emite eventos.', durationMin: 25 },
      { title: 'Stores', summary: 'Estado global con stores.', durationMin: 25 },
      { title: 'Transiciones', summary: 'Animaciones integradas.', durationMin: 20 },
    ],
  },
  {
    id: 'course-node',
    title: 'Node.js',
    description: 'Runtime JavaScript para servidores.',
    topics: ['nodejs', 'javascript', 'backend'],
    category: 'backend',
    lessons: [
      { title: 'Módulos y npm', summary: 'Organiza código con módulos.', durationMin: 20 },
      { title: 'HTTP y Express', summary: 'Crea un servidor web.', durationMin: 30 },
      { title: 'REST APIs', summary: 'Diseña endpoints RESTful.', durationMin: 35 },
      { title: 'Auth y JWT', summary: 'Autentica usuarios con tokens.', durationMin: 30 },
      { title: 'WebSockets', summary: 'Comunicación en tiempo real.', durationMin: 25 },
    ],
  },
  {
    id: 'course-typescript',
    title: 'TypeScript',
    description: 'JavaScript con tipos estáticos.',
    topics: ['typescript', 'javascript', 'tipos'],
    category: 'lenguaje',
    lessons: [
      { title: 'Tipos básicos', summary: 'string, number, boolean, arrays.', durationMin: 20 },
      { title: 'Interfaces y tipos', summary: 'Define contratos de datos.', durationMin: 25 },
      { title: 'Generics', summary: 'Escribe código reutilizable con tipos.', durationMin: 30 },
      { title: 'Utility types', summary: 'Partial, Pick, Omit, Record.', durationMin: 25 },
      { title: 'Type narrowing', summary: 'Narrowing con typeof, in, discriminated unions.', durationMin: 30 },
    ],
  },
  {
    id: 'course-fastapi',
    title: 'FastAPI',
    description: 'Framework Python moderno para APIs.',
    topics: ['fastapi', 'python', 'backend'],
    category: 'backend',
    lessons: [
      { title: 'Setup y primer endpoint', summary: 'Crea tu primera API.', durationMin: 15 },
      { title: 'Pydantic models', summary: 'Valida datos con modelos.', durationMin: 25 },
      { title: 'Dependency injection', summary: 'Inyecta dependencias.', durationMin: 25 },
      { title: 'Auth y OAuth2', summary: 'Autentica con JWT.', durationMin: 30 },
      { title: 'Async y performance', summary: 'Async/await para alto rendimiento.', durationMin: 25 },
    ],
  },
  {
    id: 'course-django',
    title: 'Django',
    description: 'Framework Python fullstack para web.',
    topics: ['django', 'python', 'fullstack'],
    category: 'fullstack',
    lessons: [
      { title: 'Setup y ORM', summary: 'Crea modelos y migra.', durationMin: 25 },
      { title: 'Views y templates', summary: 'Renderiza HTML con Django.', durationMin: 30 },
      { title: 'REST con DRF', summary: 'APIs REST con Django REST Framework.', durationMin: 35 },
      { title: 'Auth y usuarios', summary: 'Gestiona usuarios y permisos.', durationMin: 25 },
      { title: 'Admin y despliegue', summary: 'Panel admin y deploy.', durationMin: 20 },
    ],
  },
  {
    id: 'course-flask',
    title: 'Flask',
    description: 'Microframework Python para APIs.',
    topics: ['flask', 'python', 'backend'],
    category: 'backend',
    lessons: [
      { title: 'Setup y rutas', summary: 'Crea tu primera app Flask.', durationMin: 15 },
      { title: 'Templates y forms', summary: 'Renderiza Jinja2.', durationMin: 20 },
      { title: 'SQLAlchemy', summary: 'ORM para Flask.', durationMin: 25 },
      { title: 'REST APIs', summary: 'APIs con Flask-RESTful.', durationMin: 25 },
      { title: 'Auth', summary: 'Login con Flask-Login.', durationMin: 20 },
    ],
  },
  {
    id: 'course-springboot',
    title: 'Spring Boot',
    description: 'Framework Java para microservicios.',
    topics: ['springboot', 'java', 'backend'],
    category: 'backend',
    lessons: [
      { title: 'Setup y primer endpoint', summary: 'Crea una app con Spring Initializr.', durationMin: 20 },
      { title: 'JPA y repositories', summary: 'Acceso a datos con Spring Data.', durationMin: 30 },
      { title: 'REST controllers', summary: 'APIs REST con Spring MVC.', durationMin: 25 },
      { title: 'Security', summary: 'Autentica con Spring Security.', durationMin: 35 },
      { title: 'Testing', summary: 'Tests con JUnit y MockMvc.', durationMin: 25 },
    ],
  },
  {
    id: 'course-laravel',
    title: 'Laravel',
    description: 'Framework PHP fullstack elegante.',
    topics: ['laravel', 'php', 'fullstack'],
    category: 'fullstack',
    lessons: [
      { title: 'Setup y artisan', summary: 'Crea una app con Laravel.', durationMin: 15 },
      { title: 'Eloquent ORM', summary: 'Modelos y migraciones.', durationMin: 25 },
      { title: 'Blade templates', summary: 'Templates con Blade.', durationMin: 20 },
      { title: 'API Routes', summary: 'APIs REST con Laravel.', durationMin: 25 },
      { title: 'Auth y sanctum', summary: 'Autentica con Sanctum.', durationMin: 30 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Todas las fuentes                                                   */
/* ------------------------------------------------------------------ */

export const ALL_CONTENT_SOURCES: ContentSource[] = [...EBOOK_SOURCES, ...COURSE_SOURCES];
