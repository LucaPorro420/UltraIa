import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { normalizeMotion, type Motion } from '../prompt/director';
import { edgeTtsAudio, voiceFor } from '../omag/tts';
import type { TopicBrief } from './topics';

/**
 * AutoPub F2 tareas 1-2 — enrutador brief → Redactor/Guionista + manifest JSON.
 *
 * Keyless-first: el Redactor y el Guionista son DETERMINISTAS (sin LLM), para que
 * 1 brief → 1 paquete de contenido reproducible en disco. Un LLM puede mejorar el
 * contenido en una fase posterior sin cambiar el contrato del manifest.
 * Tarea 2: `idioma` es/ar (patrón bilingüe RF-12) + TTS edge-tts (narración MP3).
 */

export type Idioma = 'es' | 'ar';
export type ContenidoTipo = 'texto' | 'guion';

/** Salida del Redactor: post de texto listo para blog/redes. */
export interface ContenidoTexto {
  titulo: string;
  intro: string;
  cuerpo: string[];
  cierre: string;
  cta: string;
  palabrasClave: string[];
}

/** Escena del guionista: un shot con su cámara y narración. */
export interface EscenaGuion {
  tiempo: string; // formato mm:ss
  voz: string; // texto hablado en esta escena
  camara: Motion;
  duracionSeg: number;
}

/** Salida del Guionista: guion + storyboard para video 9:16. */
export interface GuionVideo {
  titulo: string;
  hook: string; // primeros 3s — captura la atención
  escenas: EscenaGuion[];
  narracion: string; // texto completo hablado
  duracionSeg: number;
  estilo: string;
}

/** Paquete de contenido materializado (antes de `present`, F3). */
export interface ContentPackage {
  briefId: string;
  tipo: ContenidoTipo;
  idioma: Idioma;
  brief: TopicBrief;
  /** Presente si tipo === 'texto'. */
  contenido?: ContenidoTexto;
  /** Presente si tipo === 'guion'. */
  guion?: GuionVideo;
  /** Ruta del MP3 de narración (solo guion + tts=true + edge-tts alcanzable). */
  audioPath?: string | null;
  creadoEn: string; // ISO
  manifestPath?: string;
}

/** CTA por canal — patrón de captación del plan maestro (es/ar). */
const CTA_BY_CANAL: Record<Idioma, Record<TopicBrief['canal'], string>> = {
  es: {
    youtube_shorts: 'Sigue para más atajos de IA en 60 segundos.',
    tiktok: 'Guárdalo y compártelo con quien lo necesita.',
    instagram: 'Comenta qué tema quieres que desglose después.',
    blog: 'Suscríbete al blog y recibe el siguiente artículo.',
  },
  ar: {
    youtube_shorts: 'تابعني لمزيد من اختصارات الذكاء الاصطناعي في 60 ثانية.',
    tiktok: 'احفظه وشاركه مع من يحتاجه.',
    instagram: 'علّق على الموضوع الذي تريد أن أشرحه بعد ذلك.',
    blog: 'اشترك في المدونة واستقبل المقال التالي.',
  },
};

const STYLE_POR_TONO: Record<TopicBrief['tono'], string> = {
  informativo: 'cinematic, clean studio, informative overlay',
  educativo: 'tutorial style, whiteboard accents, warm light',
  entretenido: 'energetic, neon accents, fast cuts',
  inspirador: 'golden hour, aerial shots, hopeful tone',
  analitico: 'data-driven, charts overlay, neutral palette',
  noticia: 'newsroom style, breaking badge, red accents',
};

/** Conectores bilingües para el redactor (es/ar). */
const CONECTORES: Record<Idioma, { intro: (tema: string, angulo: string) => string; cierre: (tema: string) => string }> = {
  es: {
    intro: (tema, angulo) =>
      `Si estás buscando ${angulo.toLowerCase()}, hoy tienes la respuesta. ${tema} está evolucionando rápido y la mayoría de la información que circula se queda en la superficie — aquí vamos directo a lo que funciona.`,
    cierre: (tema) =>
      `En resumen: ${tema.toLowerCase()} no es una moda, es una ventaja operativa para quien lo integra con criterio. Empieza por un caso concreto, mide, y ajusta.`,
  },
  ar: {
    intro: (tema, angulo) =>
      `إذا كنت تبحث عن ${angulo}، فاليوم لديك الإجابة. ${tema} يتطور بسرعة ومعظم المعلومات المتداولة تبقى على السطح — هنا نذهب مباشرة إلى ما ينجح.`,
    cierre: (tema) =>
      `الخلاصة: ${tema} ليست موضة، بل ميزة تشغيلية لمن يدمجها بحكمة. ابدأ بحالة واحدة، قِس، ثم اضبط.`,
  },
};

/** Párrafos de cuerpo del redactor (es/ar). */
const CUERPO_POR_IDIOMA: Record<Idioma, (tema: string, tono: string, angulo: string) => string[]> = {
  es: (tema, tono, angulo) => [
    `Lo primero: no necesitas herramientas caras ni setups complejos. Lo esencial de ${tema.toLowerCase()} se puede aplicar hoy mismo con lo que ya tienes, y el resultado marca la diferencia en tu flujo diario.`,
    `El enfoque ${tono} que propone este análisis se apoya en lo que se está validando en la práctica: empezar pequeño, medir el impacto y escalar solo lo que demuestra valor. ${angulo} es el punto de entrada más directo.`,
  ],
  ar: (tema, tono, angulo) => [
    `أولاً: لا تحتاج أدوات باهظة ولا إعدادات معقدة. أساسيات ${tema} يمكن تطبيقها اليوم بما تملكه، والنتيجة تصنع الفرق في سير عملك اليومي.`,
    `النهج ${tono} الذي يقترحه هذا التحليل يعتمد على ما يتم التحقق منه عملياً: ابدأ صغيراً، قِس الأثر، ووسّع فقط ما يثبت قيمته. ${angulo} هو نقطة الدخول المباشرة.`,
  ],
};

/** Convierte `tema` en un título editorial corto (<= 80 chars). */
export function tituloDesdeBrief(brief: TopicBrief): string {
  const base = brief.tema.replace(/\s+/g, ' ').trim();
  if (base.length <= 80) return base;
  const cut = base.slice(0, 77).trimEnd();
  return `${cut}…`;
}

/** Normaliza un breve `angulo` a un enunciado accionable. */
export function anguloNormalizado(brief: TopicBrief): string {
  const a = brief.angulo.trim().replace(/[.\s]+$/, '');
  return a.length > 0 ? a : `Claves prácticas de ${brief.tema}`;
}

/** Divide texto en párrafos de lectura (2-3 oraciones). */
function aParrafos(texto: string, maxOraciones = 3): string[] {
  return texto
    .split(/(?<=[.!?])\s+/)
    .reduce<string[]>((parrafos, oracion) => {
      const ultimo = parrafos[parrafos.length - 1];
      const nOraciones = ultimo ? ultimo.split(/(?<=[.!?])\s+/).length : 0;
      if (!ultimo || nOraciones >= maxOraciones) parrafos.push(oracion);
      else parrafos[parrafos.length - 1] = `${ultimo} ${oracion}`;
      return parrafos;
    }, [])
    .map((p) => p.trim())
    .filter(Boolean);
}

/** --- REDACTOR (texto/post) ------------------------------------------------ */

export function redactar(brief: TopicBrief, idioma: Idioma = 'es'): ContenidoTexto {
  const titulo = tituloDesdeBrief(brief);
  const angulo = anguloNormalizado(brief);
  const palabras = Array.from(
    new Set(
      brief.tema
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 5),
    ),
  );
  const fuentes = brief.fuentes.slice(0, 3);

  const intro = CONECTORES[idioma].intro(brief.tema, angulo);
  const cuerpo = [
    ...CUERPO_POR_IDIOMA[idioma](brief.tema, brief.tono, angulo),
    ...(fuentes.length > 0
      ? [idioma === 'ar'
          ? `للتوسع، هذه هي المصادر المرجعية الموثقة: ${fuentes.join('، ')}. استخدمها كنقطة بداية وقارن دائماً بسياقك الخاص.`
          : `Para profundizar, estas son las fuentes de referencia verificadas: ${fuentes.join(', ')}. Úsalas como punto de partida y contrasta siempre con tu propio contexto.`]
      : []),
  ];

  const cierre = CONECTORES[idioma].cierre(brief.tema);

  return { titulo, intro, cuerpo, cierre, cta: CTA_BY_CANAL[idioma][brief.canal], palabrasClave: palabras };
}

/** --- GUIONISTA (guion + storyboard 9:16) ---------------------------------- */

/** Cuántas escenas según el formato (9:16 corto → 5-8 shots). */
export function escenasParaFormato(brief: TopicBrief): number {
  return brief.formato === '9:16 video' ? 7 : 5;
}

/** Plantillas de guion bilingües (es/ar) — 7 escenas por defecto. */
const PLANTILLAS_GUION: Record<Idioma, (angulo: string, tema: string) => string[]> = {
  es: (angulo, tema) => [
    `Abre con la pregunta que todos se hacen: ${angulo}.`,
    `El error más común: aplicar ${tema.toLowerCase()} sin un criterio claro.`,
    `El truco que cambia todo: empezar con un caso mínimo y medible.`,
    `Así lo aplicas en tu día a día, paso a paso, sin herramientas caras.`,
    `El resultado: menos fricción y más velocidad en tu flujo.`,
    `Lo que la mayoría ignora: la consistencia pesa más que la herramienta.`,
    `Cierra con la acción concreta: prueba ${angulo.toLowerCase()} esta semana.`,
  ],
  ar: (angulo, tema) => [
    `ابدأ بالسؤال الذي يطرحه الجميع: ${angulo}.`,
    `الخطأ الأكثر شيوعاً: تطبيق ${tema} بدون معيار واضح.`,
    `الحيلة التي تغيّر كل شيء: ابدأ بحالة صغيرة قابلة للقياس.`,
    `هكذا تطبّقه في يومك، خطوة بخطوة، بدون أدوات باهظة.`,
    `النتيجة: احتكاك أقل وسرعة أكبر في سير عملك.`,
    `ما يجهله معظم الناس: الاستمرارية أهم من الأداة.`,
    `اختتم بخطوة ملموسة: جرّب ${angulo} هذا الأسبوع.`,
  ],
};

const HOOK_POR_IDIOMA: Record<Idioma, (tema: string, angulo: string) => string> = {
  es: (tema, angulo) =>
    `"${tema}" — y lo que casi nadie te dice al respecto. Quédate 45 segundos y lo resuelves. (${angulo})`,
  ar: (tema, angulo) =>
    `"${tema}" — وما لا يقوله لك أحد تقريباً. ابقَ 45 ثانية وستحلّها. (${angulo})`,
};

export function guionizar(brief: TopicBrief, idioma: Idioma = 'es'): GuionVideo {
  const titulo = tituloDesdeBrief(brief);
  const angulo = anguloNormalizado(brief);
  const nEscenas = escenasParaFormato(brief);
  const style = STYLE_POR_TONO[brief.tono];

  const hook = HOOK_POR_IDIOMA[idioma](brief.tema, angulo);
  const plantillas = PLANTILLAS_GUION[idioma](angulo, brief.tema).slice(0, nEscenas);

  const motionPool: Motion[] = [
    'zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'slow-push-in',
    'dolly-in', 'pull-back', 'tilt-up', 'orbiting-shot', 'handheld-camera',
  ];
  const camaras: Motion[] = plantillas.map((_, i) => normalizeMotion(motionPool[i % motionPool.length]));

  const duracionPorEscena = Math.round(45 / nEscenas);
  const escenas: EscenaGuion[] = plantillas.map((voz, i) => {
    const inicio = i * duracionPorEscena;
    const mm = String(Math.floor(inicio / 60)).padStart(2, '0');
    const ss = String(inicio % 60).padStart(2, '0');
    return { tiempo: `${mm}:${ss}`, voz, camara: camaras[i], duracionSeg: duracionPorEscena };
  });

  const narracion = `${hook} ${plantillas.join(' ')}`;
  const duracionSeg = nEscenas * duracionPorEscena;

  return { titulo, hook, escenas, narracion, duracionSeg, estilo: style };
}

/** --- ENRUTADOR + MANIFEST ------------------------------------------------ */

/** Decide qué rol produce el contenido según el formato del brief. */
export function enrutarBrief(brief: TopicBrief): ContenidoTipo {
  return brief.formato === '9:16 video' ? 'guion' : 'texto';
}

export interface GenerarContenidoOptions {
  /** Directorio raíz donde materializar (default: `.ultraia/content`). */
  dir?: string;
  /** Sobreescribir el tipo de contenido (override del enrutamiento). */
  tipo?: ContenidoTipo;
  /** Idioma del contenido: es (default) | ar. */
  idioma?: Idioma;
  /** Generar narración MP3 (edge-tts, keyless) para guiones. Default false. */
  tts?: boolean;
  /** No escribir en disco (solo devolver el paquete). */
  dryRun?: boolean;
  /** Inyectable para tests: fn(script, lang) → MP3 Buffer|null. */
  ttsEngine?: (script: string, lang: Idioma) => Promise<Buffer | null>;
}

export interface GenerarContenidoResult {
  paquete: ContentPackage;
  /** Ruta del manifest escrito (null si dryRun). */
  manifestPath: string | null;
  escrito: boolean;
}

/** Hash FNV-1a corto → briefId estable (idempotencia entre regeneraciones). */
export function briefIdDesdeBrief(brief: TopicBrief): string {
  const fuente = `${brief.tema}|${brief.canal}|${brief.formato}|${brief.angulo}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < fuente.length; i++) {
    h ^= fuente.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `brief-${(h >>> 0).toString(36).padStart(6, '0')}`;
}

/** 1 brief → 1 paquete de contenido + manifest JSON en disco (idempotente). */
export async function generarContenido(
  brief: TopicBrief,
  opts: GenerarContenidoOptions = {},
): Promise<GenerarContenidoResult> {
  const tipo = opts.tipo ?? enrutarBrief(brief);
  const idioma = opts.idioma ?? 'es';
  const paquete: ContentPackage = {
    briefId: briefIdDesdeBrief(brief),
    tipo,
    idioma,
    brief,
    creadoEn: new Date().toISOString(),
  };
  if (tipo === 'texto') paquete.contenido = redactar(brief, idioma);
  else {
    paquete.guion = guionizar(brief, idioma);
    if (opts.tts && !opts.dryRun) {
      const tts = opts.ttsEngine ?? edgeTtsAudio;
      const audio = await tts(paquete.guion.narracion, idioma).catch(() => null);
      paquete.audioPath = audio ? null : null; // ruta se fija tras escribir
      if (audio) {
        const dir = opts.dir ?? join(process.cwd(), '.ultraia', 'content');
        const carpeta = join(dir, paquete.briefId);
        await mkdir(carpeta, { recursive: true });
        const mp3 = join(carpeta, 'narracion.mp3');
        await writeFile(mp3, audio);
        paquete.audioPath = mp3;
      }
    }
  }

  if (opts.dryRun) return { paquete, manifestPath: null, escrito: false };

  const dir = opts.dir ?? join(process.cwd(), '.ultraia', 'content');
  const carpeta = join(dir, paquete.briefId);
  const ruta = join(carpeta, 'manifest.json');
  await mkdir(carpeta, { recursive: true });
  const tmp = join(carpeta, `.manifest-${Date.now()}.tmp`);
  await writeFile(tmp, JSON.stringify(paquete, null, 2), 'utf8');
  await rename(tmp, ruta); // atómico + idempotente
  paquete.manifestPath = ruta;
  return { paquete, manifestPath: ruta, escrito: true };
}

export const enrutador = {
  redactar,
  guionizar,
  enrutarBrief,
  generarContenido,
  tituloDesdeBrief,
  anguloNormalizado,
  escenasParaFormato,
  briefIdDesdeBrief,
  CTA_BY_CANAL,
};