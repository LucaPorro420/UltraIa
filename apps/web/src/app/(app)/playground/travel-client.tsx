'use client';

import { useState, useCallback } from 'react';

/**
 * Interactive Travel Video Planner.
 * Enter destination, choose style/language, generate scene-by-scene plan
 * with Pollinations image previews and export.
 */

type TravelStyle = 'aventura' | 'relax' | 'cultura' | 'naturaleza';
type TravelLang = 'es' | 'ar';

const MOTIONS = [
  'pan left', 'pan right', 'push in', 'push out',
  'tilt up', 'tilt down', 'orbit', 'zoom in', 'zoom out',
  'crane up', 'crane down', 'track left', 'track right',
  'static', 'aerial', 'handheld',
] as const;

const STYLES: { id: TravelStyle; label: string; icon: string; desc: string }[] = [
  { id: 'aventura', label: 'Aventura', icon: '🏔', desc: 'Emocion, adrenalina, acantilados' },
  { id: 'relax', label: 'Relax', icon: '🏖', desc: 'Playa, atardecer, serenidad' },
  { id: 'cultura', label: 'Cultura', icon: '🏛', desc: 'Arquitectura, historia, mercados' },
  { id: 'naturaleza', label: 'Naturaleza', icon: '🌿', desc: 'Bosques, cascadas, flora' },
];

interface TravelScene {
  lugar: string;
  descripcion: string;
  motion: string;
  duracionSeg: number;
  promptImagen: string;
  narracion: string;
}

interface TravelPlan {
  slug: string;
  titulo: string;
  destino: string;
  idioma: TravelLang;
  estilo: TravelStyle;
  duracionSeg: number;
  hook: string;
  escenas: TravelScene[];
  cta: string;
  musicaSugerida: string;
}

// Deterministic slug
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// Simple hash
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

// Deterministic scene generation
function generatePlan(destino: string, estilo: TravelStyle, idioma: TravelLang, duracion: number): TravelPlan {
  const seed = fnv1a(`${destino}:${estilo}:${idioma}`);
  const numScenes = Math.max(3, Math.min(7, Math.round(duracion / 8)));

  const sceneTemplates: Record<TravelStyle, { lugares: string[]; descs: string[]; hooks: string[]; narrs: string[] }> = {
    aventura: {
      lugares: ['Mirador', 'Acantilado', 'Paso estrecho', 'Cumbre', 'Cascada', 'Puente colgante', 'Cueva'],
      descs: ['Vistas panorámicas de 360 grados', 'Formaciones rocosas imponentes', 'Paisaje que corta el aliento', 'Nubes rozan la cima', 'Agua cristalina cayendo', 'Estructura sobre el vacío', 'Formaciones geológicas milenarias'],
      hooks: idioma === 'es' ? 'La aventura empieza donde termina el camino' : 'المغامرة تبدأ حيث ينتهي الطريق',
      narrs: idioma === 'es' ? 'Prepárate para la emoción' : 'استعد للإثارة',
    },
    relax: {
      lugares: ['Playa dorada', 'Atardecer', 'Hammock bar', 'Spa natural', 'Jardín zen', 'Terraza panorámica', 'Aguas turquesas'],
      descs: ['Arena suave bajo los pies', 'Colores que pintan el cielo', 'Brisa marina y silencio', 'Aguas termales naturales', 'Paz absoluta', 'Vista infinita al mar', 'Transparencia perfecta'],
      hooks: idioma === 'es' ? 'Cierra los ojos, respira, llegaste' : 'أغمض عينيك، تنفس، وصلت',
      narrs: idioma === 'es' ? 'Un momento de paz' : 'لحظة من السلام',
    },
    cultura: {
      lugares: ['Mercado local', 'Templo antiguo', 'Calle empedrada', 'Museo', 'Plaza principal', 'Artesanos', 'Ruinas'],
      descs: ['Colores y sabores exóticos', 'Siglos de historia', 'Arquitectura colonial', 'Obras maestras', 'Corazón de la ciudad', 'Manos que crean', 'Civilizaciones pasadas'],
      hooks: idioma === 'es' ? 'Cada piedra cuenta una historia' : 'كل حجر يروي قصة',
      narrs: idioma === 'es' ? 'Sumérgete en la cultura' : 'انغمس في الثقافة',
    },
    naturaleza: {
      lugares: ['Bosque nuboso', 'Cascada escondida', 'Lago espejo', 'Volcán', 'Selva tropical', 'Cataratas', 'Pradera alpina'],
      descs: ['Niebla entre los árboles', 'Secreto de la naturaleza', 'Reflejo perfecto', 'Fuerza de la tierra', 'Biodiversidad infinita', 'Potencia natural', 'Tranquilidad verde'],
      hooks: idioma === 'es' ? 'La naturaleza es la mejor obra de arte' : 'الطبيعة هي أعظم عمل فني',
      narrs: idioma === 'es' ? 'Conecta con la tierra' : 'تواصل مع الأرض',
    },
  };

  const templates = sceneTemplates[estilo];
  const scenes: TravelScene[] = [];

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

  const hookText = templates.hooks;
  const ctaText = idioma === 'es'
    ? `Suscríbete para más viajes a ${destino}`
    : `اشترك لمزيد من الرحلات إلى ${destino}`;
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
    hook: hookText,
    escenas: scenes,
    cta: ctaText,
    musicaSugerida: musicText,
  };
}

// Pollinations URL builder
function pollinationsUrl(prompt: string, width = 405, height = 720, seed = 42): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
}

export function TravelClient() {
  const [destino, setDestino] = useState('');
  const [estilo, setEstilo] = useState<TravelStyle>('naturaleza');
  const [idioma, setIdioma] = useState<TravelLang>('es');
  const [duracion, setDuracion] = useState(45);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [selectedScene, setSelectedScene] = useState(0);
  const [imageSeed, setImageSeed] = useState(42);

  const generate = useCallback(() => {
    if (!destino.trim()) return;
    const p = generatePlan(destino.trim(), estilo, idioma, duracion);
    setPlan(p);
    setSelectedScene(0);
  }, [destino, estilo, idioma, duracion]);

  function exportPlanJson() {
    if (!plan) return;
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `travel-${plan.slug}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportScenesMd() {
    if (!plan) return;
    let md = `# ${plan.titulo}\n\n`;
    md += `**Destino:** ${plan.destino} | **Estilo:** ${plan.estilo} | **Idioma:** ${plan.idioma}\n`;
    md += `**Duracion:** ${plan.duracionSeg}s | **Escenas:** ${plan.escenas.length}\n\n`;
    md += `## Hook\n${plan.hook}\n\n`;
    for (let i = 0; i < plan.escenas.length; i++) {
      const s = plan.escenas[i];
      md += `## Escena ${i + 1}: ${s.lugar}\n`;
      md += `- **Duracion:** ${s.duracionSeg}s | **Motion:** ${s.motion}\n`;
      md += `- **Descripcion:** ${s.descripcion}\n`;
      md += `- **Narracion:** ${s.narracion}\n`;
      md += `- **Prompt:** ${s.promptImagen}\n\n`;
    }
    md += `## CTA\n${plan.cta}\n\n`;
    md += `## Musica\n${plan.musicaSugerida}\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.download = `travel-${plan.slug}.md`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const labelCls = 'mb-1 block text-xs font-medium uppercase tracking-wide text-[#9a9aae]';
  const inputCls = 'w-full rounded-lg border border-[#26263a] bg-[#0c0c10] px-3 py-2 text-sm text-[#e7e7ee] placeholder-[#6b6b80] focus:border-[#8b5cf6] focus:outline-none';

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      {/* Preview / Scenes */}
      <div className="space-y-4">
        {!plan ? (
          <div className="flex h-[400px] items-center justify-center rounded-lg border border-[#26263a] border-dashed bg-[#0c0c10]">
            <div className="text-center">
              <p className="text-sm text-[#6b6b80]">Ingresa un destino y genera un plan de viaje</p>
              <p className="mt-1 text-xs text-[#4a4a60]">Las escenas aparecerán aquí con previews de imagen</p>
            </div>
          </div>
        ) : (
          <>
            {/* Plan header */}
            <div className="rounded-lg border border-[#26263a] bg-[#0c0c10] p-4">
              <h3 className="text-lg font-semibold text-[#e7e7ee]">{plan.titulo}</h3>
              <p className="mt-1 text-sm text-[#9a9aae]">{plan.hook}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-[#8b5cf6]/15 px-2 py-0.5 text-[#8b5cf6]">{plan.estilo}</span>
                <span className="rounded-md bg-[#26263a] px-2 py-0.5 text-[#c7c7d6]">{plan.idioma.toUpperCase()}</span>
                <span className="rounded-md bg-[#26263a] px-2 py-0.5 text-[#c7c7d6]">{plan.duracionSeg}s</span>
                <span className="rounded-md bg-[#26263a] px-2 py-0.5 text-[#c7c7d6]">{plan.escenas.length} escenas</span>
              </div>
            </div>

            {/* Scene image preview */}
            <div className="relative overflow-hidden rounded-lg border border-[#26263a] bg-[#0c0c10]">
              <img
                src={pollinationsUrl(plan.escenas[selectedScene].promptImagen, 405, 720, imageSeed)}
                alt={plan.escenas[selectedScene].lugar}
                className="mx-auto max-h-[400px] object-contain"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0c0c10] to-transparent p-4">
                <div className="text-sm font-medium text-[#e7e7ee]">{plan.escenas[selectedScene].lugar}</div>
                <div className="text-xs text-[#9a9aae]">{plan.escenas[selectedScene].motion} | {plan.escenas[selectedScene].duracionSeg}s</div>
              </div>
            </div>

            {/* Scene thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {plan.escenas.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedScene(i)}
                  className={`flex-shrink-0 rounded-lg border p-2 text-left transition-colors ${
                    selectedScene === i
                      ? 'border-[#8b5cf6] bg-[#8b5cf6]/10'
                      : 'border-[#26263a] bg-[#0c0c10] hover:border-[#3a3a52]'
                  }`}
                >
                  <div className="text-xs font-medium text-[#e7e7ee]">Escena {i + 1}</div>
                  <div className="text-[10px] text-[#6b6b80]">{s.lugar.split(' de ')[0]}</div>
                  <div className="mt-1 text-[10px] text-[#8b5cf6]">{s.motion}</div>
                </button>
              ))}
            </div>

            {/* Scene details */}
            <div className="rounded-lg border border-[#26263a] bg-[#0c0c10] p-4 space-y-2">
              <div className="text-xs text-[#6b6b80]">Narracion</div>
              <p className="text-sm text-[#e7e7ee]">{plan.escenas[selectedScene].narracion}</p>
              <div className="text-xs text-[#6b6b80]">Prompt de imagen</div>
              <code className="block rounded bg-[#1a1a2a] p-2 text-[10px] text-[#9a9aae] break-all">
                {plan.escenas[selectedScene].promptImagen}
              </code>
            </div>

            {/* CTA + Music */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#26263a] bg-[#0c0c10] p-3">
                <div className="text-xs text-[#6b6b80]">CTA</div>
                <p className="mt-1 text-xs text-[#e7e7ee]">{plan.cta}</p>
              </div>
              <div className="rounded-lg border border-[#26263a] bg-[#0c0c10] p-3">
                <div className="text-xs text-[#6b6b80]">Musica</div>
                <p className="mt-1 text-xs text-[#e7e7ee]">{plan.musicaSugerida}</p>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex gap-2">
              <button onClick={exportPlanJson} className="rounded-lg border border-[#26263a] bg-[#0c0c10] px-3 py-1.5 text-xs text-[#c7c7d6] hover:border-[#3a3a52]">
                Export JSON
              </button>
              <button onClick={exportScenesMd} className="rounded-lg border border-[#26263a] bg-[#0c0c10] px-3 py-1.5 text-xs text-[#c7c7d6] hover:border-[#3a3a52]">
                Export Markdown
              </button>
              <button
                onClick={() => setImageSeed((s) => s + 1)}
                className="rounded-lg border border-[#26263a] bg-[#0c0c10] px-3 py-1.5 text-xs text-[#c7c7d6] hover:border-[#3a3a52]"
              >
                Shuffle Image
              </button>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Destination */}
        <div>
          <label className={labelCls}>Destination</label>
          <input
            type="text"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generate()}
            placeholder="ej: Kyoto, Santorini, Patagonia..."
            className={inputCls}
          />
        </div>

        {/* Style */}
        <div>
          <label className={labelCls}>Style</label>
          <div className="grid grid-cols-2 gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setEstilo(s.id)}
                className={`rounded-lg border p-2 text-left transition-colors ${
                  estilo === s.id
                    ? 'border-[#8b5cf6] bg-[#8b5cf6]/10'
                    : 'border-[#26263a] bg-[#0c0c10] hover:border-[#3a3a52]'
                }`}
              >
                <span className="text-sm">{s.icon}</span>
                <div className="text-xs font-medium text-[#e7e7ee]">{s.label}</div>
                <div className="text-[10px] text-[#6b6b80]">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className={labelCls}>Language</label>
          <div className="flex gap-1.5">
            <button
              onClick={() => setIdioma('es')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs transition-colors ${
                idioma === 'es'
                  ? 'bg-[#8b5cf6] text-white'
                  : 'border border-[#26263a] bg-[#0c0c10] text-[#c7c7d6]'
              }`}
            >
              Espanol
            </button>
            <button
              onClick={() => setIdioma('ar')}
              className={`flex-1 rounded-lg px-3 py-2 text-xs transition-colors ${
                idioma === 'ar'
                  ? 'bg-[#8b5cf6] text-white'
                  : 'border border-[#26263a] bg-[#0c0c10] text-[#c7c7d6]'
              }`}
            >
              Arabic
            </button>
          </div>
        </div>

        {/* Duration */}
        <div>
          <div className="flex justify-between text-xs">
            <span className="text-[#9a9aae]">Duration</span>
            <span className="text-[#e7e7ee]">{duracion}s</span>
          </div>
          <input
            type="range"
            min={30}
            max={60}
            step={5}
            value={duracion}
            onChange={(e) => setDuracion(Number(e.target.value))}
            className="w-full accent-[#8b5cf6]"
          />
          <div className="flex justify-between text-[10px] text-[#6b6b80]">
            <span>30s (Short)</span><span>60s (Long)</span>
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={generate}
          disabled={!destino.trim()}
          className="w-full rounded-lg bg-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#7c3aed] disabled:opacity-50"
        >
          Generate Travel Plan
        </button>

        {/* Info */}
        <div className="rounded-lg border border-[#26263a] bg-[#0c0c10] p-3">
          <div className="text-xs text-[#6b6b80]">About</div>
          <p className="mt-1 text-xs text-[#9a9aae]">
            Plan determinista con prompts listos para Pollinations (keyless, gratis).
            Para render real con ffmpeg, usa <code className="text-[#8b5cf6]">/api/travel</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
