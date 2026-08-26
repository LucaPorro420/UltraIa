export interface Ebook {
  id: string;
  title: string;
  tagline: string;
  description: string;
  longDescription: string;
  price: number;
  originalPrice: number;
  /** Clases de gradiente Tailwind para la portada (Dark Obsidian friendly). */
  cover: string;
  emoji: string;
  level: string;
  category: string;
  chapters: number;
  videos: number;
  pages: number;
  topics: string[];
  outline: string[];
}

export const EBOOKS: Ebook[] = [
  {
    id: 'threejs',
    title: 'Three.js Avanzado',
    tagline: 'Domina el 3D en el navegador',
    description:
      'Crea experiencias 3D interactivas en la web con JavaScript/TypeScript. Shaders, post-procesamiento, React Three Fiber y optimización.',
    longDescription:
      'Guía completa para crear experiencias 3D interactivas en el navegador. Partimos de la escena mínima y avanzamos hasta shaders GLSL personalizados, post-procesamiento con efectos de bloom, integración con React Three Fiber y técnicas de optimización (instancing, frustum culling, texturas comprimidas) para mantener 60 FPS en producción.',
    price: 49,
    originalPrice: 79,
    cover: 'from-blue-500 to-cyan-500',
    emoji: '🌐',
    level: 'Intermedio-Avanzado',
    category: 'Desarrollo Web',
    chapters: 10,
    videos: 50,
    pages: 350,
    topics: ['threejs', 'webgl', 'javascript', 'react', 'shaders'],
    outline: [
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
    id: 'unity',
    title: 'Unity Profesional',
    tagline: 'Videojuegos comerciales con C#',
    description:
      'Crea videojuegos comerciales con C#, Shader Graph, IA, físicas avanzadas y monetización multiplataforma.',
    longDescription:
      'Aprende a construir videojuegos profesionales desde cero con Unity y C#. Cubrimos el ciclo completo: arquitectura de proyecto, Shader Graph para materiales avanzados, sistemas de IA con máquinas de estado y árboles de comportamiento, físicas realistas, y monetización multiplataforma (mobile, PC, consola) con analítica y live-ops.',
    price: 59,
    originalPrice: 89,
    cover: 'from-purple-500 to-pink-500',
    emoji: '🎮',
    level: 'Intermedio-Avanzado',
    category: 'Videojuegos',
    chapters: 9,
    videos: 48,
    pages: 400,
    topics: ['unity', 'csharp', 'gamedev', 'shaders', 'ia'],
    outline: [
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
    id: 'procedural',
    title: 'Generación Procedural Planetaria',
    tagline: 'Mundos virtuales desde código',
    description:
      'Técnicas avanzadas para crear mundos virtuales: terreno, océanos, ciudades, vegetación y simulación de tráfico.',
    longDescription:
      'Un viaje profundo a la generación procedural: desde ruido de valor y Perlin hasta síntesis de planetas con shaders de superficie, simulación de océanos, colocación de vegetación por biomas, generación de ciudades con L-systems y simulación de tráfico agent-based. Todo explicado con matemáticas accesibles y código ejecutable.',
    price: 79,
    originalPrice: 119,
    cover: 'from-emerald-500 to-teal-500',
    emoji: '🌍',
    level: 'Avanzado',
    category: 'Procedural',
    chapters: 10,
    videos: 60,
    pages: 450,
    topics: ['procedural', 'planetary', 'terrain', 'shaders', 'simulacion'],
    outline: [
      'Ruido: valor, Perlin, simplex y fBm',
      'Terreno por altura y biomas',
      'Océanos y agua animada',
      'Vegetación y colocación por densidad',
      'Ciudades con L-systems',
      'Tráfico agent-based',
      'Shaders de superficie planetaria',
      'Atmósfera y iluminación',
      'Streaming de chunks',
      'Optimización y paralelización',
    ],
  },
];

export function getEbook(id: string): Ebook | undefined {
  return EBOOKS.find((e) => e.id === id);
}

export function formatPrice(value: number): string {
  return `$${value}`;
}
