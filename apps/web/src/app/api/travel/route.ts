//! POST /api/travel — travel video plan generation with Ken Burns scenes.
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/travel
 * Generates a travel video plan with scene-by-scene breakdown.
 * Body: { destino, estilo?, idioma?, duracion? }
 */

type TravelStyle = 'aventura' | 'relax' | 'cultura' | 'naturaleza';
type TravelLang = 'es' | 'ar';

const MOTIONS = [
  'pan left', 'pan right', 'push in', 'push out',
  'tilt up', 'tilt down', 'orbit', 'zoom in', 'zoom out',
  'crane up', 'crane down', 'track left', 'track right',
  'static', 'aerial', 'handheld',
] as const;

const SCENE_TEMPLATES: Record<TravelStyle, { lugares: string[]; descs: string[]; hooks: Record<TravelLang, string>; narrs: Record<TravelLang, string> }> = {
  aventura: {
    lugares: ['Mirador', 'Acantilado', 'Paso estrecho', 'Cumbre', 'Cascada', 'Puente colgante', 'Cueva'],
    descs: ['Vistas panoramicas de 360 grados', 'Formaciones rocosas imponentes', 'Paisaje que corta el aliento', 'Nubes rozan la cima', 'Agua cristalina cayendo', 'Estructura sobre el vacio', 'Formaciones geologicas milenarias'],
    hooks: { es: 'La aventura empieza donde termina el camino', ar: 'المغامرة تبدأ حيث ينتهي الطريق' },
    narrs: { es: 'Preparate para la emocion', ar: 'استعد للإثارة' },
  },
  relax: {
    lugares: ['Playa dorada', 'Atardecer', 'Hammock bar', 'Spa natural', 'Jardin zen', 'Terraza panoramica', 'Aguas turquesas'],
    descs: ['Arena suave bajo los pies', 'Colores que pintan el cielo', 'Brisa marina y silencio', 'Aguas termales naturales', 'Paz absoluta', 'Vista infinita al mar', 'Transparencia perfecta'],
    hooks: { es: 'Cierra los ojos, respira, llegaste', ar: 'أغمض عينيك، تنفس، وصلت' },
    narrs: { es: 'Un momento de paz', ar: 'لحظة من السلام' },
  },
  cultura: {
    lugares: ['Mercado local', 'Templo antiguo', 'Calle empedrada', 'Museo', 'Plaza principal', 'Artesanos', 'Ruinas'],
    descs: ['Colores y sabores exoticos', 'Siglos de historia', 'Arquitectura colonial', 'Obras maestras', 'Corazon de la ciudad', 'Manos que crean', 'Civilizaciones pasadas'],
    hooks: { es: 'Cada piedra cuenta una historia', ar: 'كل حجر يروي قصة' },
    narrs: { es: 'Sumergete en la cultura', ar: 'انغمس في الثقافة' },
  },
  naturaleza: {
    lugares: ['Bosque nuboso', 'Cascada escondida', 'Lago espejo', 'Volcan', 'Selva tropical', 'Cataratas', 'Pradera alpina'],
    descs: ['Niebla entre los arboles', 'Secreto de la naturaleza', 'Reflejo perfecto', 'Fuerza de la tierra', 'Biodiversidad infinita', 'Potencia natural', 'Tranquilidad verde'],
    hooks: { es: 'La naturaleza es la mejor obra de arte', ar: 'الطبيعة هي أعظم عمل فني' },
    narrs: { es: 'Conecta con la tierra', ar: 'تواصل مع الأرض' },
  },
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

function generatePlan(destino: string, estilo: TravelStyle, idioma: TravelLang, duracion: number) {
  const seed = fnv1a(`${destino}:${estilo}:${idioma}`);
  const numScenes = Math.max(3, Math.min(7, Math.round(duracion / 8)));
  const templates = SCENE_TEMPLATES[estilo];

  const scenes = [];
  for (let i = 0; i < numScenes; i++) {
    const idx = (seed + i * 7) % templates.lugares.length;
    const motionIdx = (seed + i * 13) % MOTIONS.length;
    const sceneDur = Math.round(duracion / numScenes);

    scenes.push({
      lugar: `${templates.lugares[idx]} de ${destino}`,
      descripcion: templates.descs[idx],
      motion: MOTIONS[motionIdx],
      duracionSeg: sceneDur,
      promptImagen: `${templates.lugares[idx]} of ${destino}, cinematic photography, dramatic lighting, 9:16 vertical, ultra detailed`,
      narracion: `${templates.narrs[idioma]}: ${templates.lugares[idx]}`,
    });
  }

  const musicText = estilo === 'aventura' ? 'Epic orchestral'
    : estilo === 'relax' ? 'Ambient lo-fi'
    : estilo === 'cultura' ? 'World instruments'
    : 'Nature sounds + acoustic';

  return {
    slug: slugify(destino),
    titulo: idioma === 'es' ? `Viaje a ${destino}` : `رحلة إلى ${destino}`,
    destino,
    idioma,
    estilo,
    duracionSeg: duracion,
    hook: templates.hooks[idioma],
    escenas: scenes,
    cta: idioma === 'es'
      ? `Suscribete para mas viajes a ${destino}`
      : `اشترك لمزيد من الرحلات إلى ${destino}`,
    musicaSugerida: musicText,
  };
}

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { destino?: string; estilo?: string; idioma?: string; duracion?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!body.destino || typeof body.destino !== 'string' || body.destino.trim().length === 0) {
    return NextResponse.json({ error: 'destino is required' }, { status: 400 });
  }

  const estilo = (['aventura', 'relax', 'cultura', 'naturaleza'].includes(body.estilo ?? '') ? body.estilo : 'naturaleza') as TravelStyle;
  const idioma = (['es', 'ar'].includes(body.idioma ?? '') ? body.idioma : 'es') as TravelLang;
  const duracion = Math.max(30, Math.min(60, typeof body.duracion === 'number' ? body.duracion : 45));

  const plan = generatePlan(body.destino.trim(), estilo, idioma, duracion);

  return NextResponse.json({ plan });
}
