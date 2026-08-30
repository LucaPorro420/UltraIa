/**
 * content-templates.ts — Plantillas de contenido derivado.
 *
 * Determinista, keyless, bilingüe es/ar. Convierte fuentes de contenido
 * (ebooks, cursos, learning paths) en blog posts, guiones de video, y
 * captions para redes sociales.
 */

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type Idioma = 'es' | 'ar';
export type DerivedType = 'blog-post' | 'video-script' | 'social-caption' | 'thread';

export interface ContentSource {
  id: string;
  title: string;
  description: string;
  topics: string[];
  chapters?: string[];
  lessons?: { title: string; summary: string; durationMin: number }[];
  level?: string;
  category?: string;
}

export interface DerivedContent {
  type: DerivedType;
  sourceId: string;
  title: string;
  body: string;
  tags: string[];
  idioma: Idioma;
  wordCount: number;
  estimatedReadMin: number;
}

/* ------------------------------------------------------------------ */
/* Conectores bilingües                                                */
/* ------------------------------------------------------------------ */

const CONECTORES: Record<Idioma, { intro: string[]; section: string[]; cta: string[] }> = {
  es: {
    intro: [
      'En este artículo exploramos',
      'Hoy vamos a profundizar en',
      'Te presentamos una guía completa sobre',
      'Descubre todo lo que necesitas saber sobre',
    ],
    section: [
      'Ahora veamos',
      'Pasemos a',
      'Continuemos con',
      'El siguiente punto importante es',
    ],
    cta: [
      '¿Te gustó? Compártelo con tu equipo.',
      '¿Listo para aplicarlo? Empieza hoy.',
      '¿Quieres aprender más? Explora nuestros cursos.',
      '¿Tienes dudas? Déjanas en los comentarios.',
    ],
  },
  ar: {
    intro: [
      'في هذا المقال نستكشف',
      'اليوم سنتعمق في',
      'نقدم لك دليلًا شاملاً حول',
      'اكتشف كل ما تحتاج معرفته حول',
    ],
    section: [
      'والآن لنر',
      'لنتنتقل إلى',
      'لنتابع مع',
      'النقطة المهمة التالية هي',
    ],
    cta: [
      'أعجبك؟ شاركه مع فريقك.',
      'مستعد للتطبيق؟ ابدأ اليوم.',
      'تريد معرفة المزيد؟ استكشف دوراتنا.',
      'لديك أسئلة؟ اتركها في التعليقات.',
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Blog Post                                                           */
/* ------------------------------------------------------------------ */

function blogTitle(source: ContentSource, idioma: Idioma): string {
  const prefix = idioma === 'es' ? 'Guía completa de' : 'الدليل الشامل ل';
  return `${prefix} ${source.title}`;
}

function blogIntro(source: ContentSource, idioma: Idioma): string {
  const conn = CONECTORES[idioma].intro;
  const opener = conn[Math.abs(hash(source.id)) % conn.length];
  return `${opener} **${source.title}**. ${source.description}`;
}

function blogSections(source: ContentSource, idioma: Idioma): string[] {
  const sections: string[] = [];
  const sectionConns = CONECTORES[idioma].section;

  if (source.chapters && source.chapters.length > 0) {
    for (let i = 0; i < source.chapters.length; i++) {
      const conn = sectionConns[i % sectionConns.length];
      sections.push(`## ${source.chapters[i]}\n\n${conn} ${source.chapters[i].toLowerCase()}.`);
    }
  } else if (source.lessons && source.lessons.length > 0) {
    for (let i = 0; i < source.lessons.length; i++) {
      const lesson = source.lessons[i];
      const conn = sectionConns[i % sectionConns.length];
      sections.push(`## ${lesson.title}\n\n${conn} ${lesson.summary} (~${lesson.durationMin} min).`);
    }
  }

  return sections;
}

function blogCta(source: ContentSource, idioma: Idioma): string {
  const ctas = CONECTORES[idioma].cta;
  return ctas[Math.abs(hash(source.id + 'cta')) % ctas.length];
}

export function generateBlogPost(source: ContentSource, idioma: Idioma = 'es'): DerivedContent {
  const title = blogTitle(source, idioma);
  const intro = blogIntro(source, idioma);
  const sections = blogSections(source, idioma);
  const cta = blogCta(source, idioma);

  const body = [
    `# ${title}`,
    '',
    intro,
    '',
    ...sections,
    '',
    `---\n\n${cta}`,
    '',
    source.topics.length > 0
      ? idioma === 'es'
        ? `**Temas:** ${source.topics.join(', ')}`
        : `**المواضيع:** ${source.topics.join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const wordCount = body.split(/\s+/).length;
  return {
    type: 'blog-post',
    sourceId: source.id,
    title,
    body,
    tags: source.topics,
    idioma,
    wordCount,
    estimatedReadMin: Math.max(1, Math.ceil(wordCount / 200)),
  };
}

/* ------------------------------------------------------------------ */
/* Video Script (YouTube Shorts / TikTok ≤60s)                         */
/* ------------------------------------------------------------------ */

function videoHook(source: ContentSource, idioma: Idioma): string {
  const hooks: Record<Idioma, string[]> = {
    es: [
      `¿Sabías que ${source.title} puede cambiar la forma en que programas?`,
      `Esto es lo que nadie te dice sobre ${source.title.toLowerCase()}.`,
      `En 60 segundos te explico ${source.title.toLowerCase()}.`,
      `${source.title}: lo que necesitas saber AHORA.`,
    ],
    ar: [
      `هل تعلم أن ${source.title} يمكن أن يغير طريقة برمجتك؟`,
      `هذا ما لا يخبرك به أحد حول ${source.title.toLowerCase()}.`,
      `في 60 ثانية أشرح لك ${source.title.toLowerCase()}.`,
      `${source.title}: ما تحتاج معرفته الآن.`,
    ],
  };
  const h = hooks[idioma];
  return h[Math.abs(hash(source.id + 'hook')) % h.length];
}

function videoScenes(source: ContentSource, idioma: Idioma): string[] {
  const items = source.chapters?.slice(0, 4) || source.lessons?.slice(0, 4).map((l) => l.title) || [];
  const scenes: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const num = idioma === 'es' ? `Escena ${i + 1}` : `مشهد ${i + 1}`;
    scenes.push(`**${num}:** ${items[i]}`);
  }

  return scenes;
}

function videoCta(source: ContentSource, idioma: Idioma): string {
  return idioma === 'es'
    ? `¿Quieres aprender ${source.title.toLowerCase()}? Link en la bio.`
    : `تريد تعلم ${source.title.toLowerCase()}؟ الرابط في البايو.`;
}

export function generateVideoScript(source: ContentSource, idioma: Idioma = 'es'): DerivedContent {
  const hook = videoHook(source, idioma);
  const scenes = videoScenes(source, idioma);
  const cta = videoCta(source, idioma);

  const body = [
    `# Guion: ${source.title}`,
    '',
    `## Hook (0-3s)`,
    hook,
    '',
    `## Desarrollo (3-50s)`,
    ...scenes,
    '',
    `## CTA (50-60s)`,
    cta,
  ].join('\n');

  const wordCount = body.split(/\s+/).length;
  return {
    type: 'video-script',
    sourceId: source.id,
    title: source.title,
    body,
    tags: [...source.topics, 'video', 'shorts'],
    idioma,
    wordCount,
    estimatedReadMin: 1, // ≤60s video
  };
}

/* ------------------------------------------------------------------ */
/* Social Caption (≤280 chars)                                         */
/* ------------------------------------------------------------------ */

export function generateSocialCaption(source: ContentSource, idioma: Idioma = 'es'): DerivedContent {
  const emojis: Record<string, string> = {
    frontend: '⚛️',
    backend: '🔧',
    fullstack: '🚀',
    gamedev: '🎮',
    procedural: '🌍',
    'Desarrollo Web': '🌐',
    Videojuegos: '🎮',
    Procedural: '🌍',
  };
  const emoji = emojis[source.category || ''] || '💻';

  const caption =
    idioma === 'es'
      ? `${emoji} ${source.title}: ${source.description.slice(0, 180)} #${source.topics.slice(0, 3).join(' #')}`
      : `${emoji} ${source.title}: ${source.description.slice(0, 180)} #${source.topics.slice(0, 3).join(' #')}`;

  const truncated = caption.length > 280 ? caption.slice(0, 277) + '...' : caption;
  const wordCount = truncated.split(/\s+/).length;

  return {
    type: 'social-caption',
    sourceId: source.id,
    title: source.title,
    body: truncated,
    tags: source.topics.slice(0, 3),
    idioma,
    wordCount,
    estimatedReadMin: 1,
  };
}

/* ------------------------------------------------------------------ */
/* Thread (X/Twitter, 5 tweets)                                        */
/* ------------------------------------------------------------------ */

export function generateThread(source: ContentSource, idioma: Idioma = 'es'): DerivedContent {
  const opener =
    idioma === 'es'
      ? `🧵 Hilo sobre ${source.title}\n\n${source.description}`
      : `🧵 خيط حول ${source.title}\n\n${source.description}`;

  const items = source.chapters?.slice(0, 4) || source.lessons?.slice(0, 4).map((l) => l.title) || [];
  const tweets = [opener];

  for (let i = 0; i < items.length; i++) {
    const prefix = idioma === 'es' ? `${i + 1}/` : `${i + 1}/`;
    tweets.push(`${prefix} ${items[i]}`);
  }

  const closer =
    idioma === 'es'
      ? `¿Te ayudó? Retuitea el primer tweet y sigue @UltraIa para más.`
      : `ساعدك؟ أعد تغريد التغريدة الأولى وتابع @UltraIa للمزيد.`;
  tweets.push(closer);

  const body = tweets.join('\n\n---\n\n');
  const wordCount = body.split(/\s+/).length;

  return {
    type: 'thread',
    sourceId: source.id,
    title: `Thread: ${source.title}`,
    body,
    tags: [...source.topics, 'hilo', 'thread'],
    idioma,
    wordCount,
    estimatedReadMin: 2,
  };
}

/* ------------------------------------------------------------------ */
/* Utilidad                                                            */
/* ------------------------------------------------------------------ */

/** Hash simple djb2 — determinista, sin Math.random. */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return h;
}
