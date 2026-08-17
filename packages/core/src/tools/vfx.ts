// -----------------------------------------------------------------------------
// vfx.ts — capability `vfx`
// -----------------------------------------------------------------------------
// Port ORIGINAL de los PRINCIPIOS del plugin Higgsfield para DaVinci Resolve
// (higgsfield.ai/plugins/davinci, enlaces.txt linea 811, TikTok @studioeditionoficial,
// verificado 17/08/2026). Sin codigo copiado: re-diseno en el estilo del dominio puro
// de UltraIa (determinista, sin red, sin LLM).
// - El plugin integra 7 tools IA DENTRO del timeline: Generate Video/Image, AI LUT
//   Creator, Draw to Edit, Reframe, Remove Background, Upscale. El valor no es cada
//   tool: es pedir la operacion desde el contexto del clip activo y que el resultado
//   vuelva al flujo sin friccion. Aqui eso se traduce en `plan*` deterministas que
//   producen argv de ffmpeg / planes de ejecucion (el render real lo hace video_edit,
//   la generacion los providers del Gen-Engine).
// - Framework B-roll (dreamina.capcut.com): "define el job: missing beat, frame shape,
//   motion need, transition" -> `planBroll`.
// Fuente: learning/sources/higgsfield-davinci.md, docs/RAZONAMIENTO-HIGGSFIELD-DAVINCI.md.
// -----------------------------------------------------------------------------

/** Centro de accion normalizado (0-1) en un instante del clip. */
export type ActionCenter = {
  /** Tiempo en segundos dentro del clip. */
  t: number;
  /** Centro X normalizado 0-1 (izquierda->derecha). */
  x01: number;
  /** Centro Y normalizado 0-1 (arriba->abajo). */
  y01: number;
  /** Ancho del sujeto normalizado 0-1 (para escalar el padding). */
  w01: number;
};

export type ReframeInput = {
  /** Ancho fuente en pixeles (ej. 1920). */
  width: number;
  /** Alto fuente en pixeles (ej. 1080). */
  height: number;
  /** Duracion total del clip en segundos. */
  durSeg: number;
  /** Centros de accion ordenados por t (min 1). */
  centers: ActionCenter[];
  /** Aspecto destino (ancho/alto). Default 9/16 (vertical para Shorts/Reels). */
  targetRatio?: number;
  /** Margen de seguridad normalizado 0-0.5 (sujeto nunca pega al borde). Default 0.15. */
  pad?: number;
  /** Velocidad maxima de pan en fracciones del ancho de crop por segundo. Default 0.35. */
  maxPanPerSec?: number;
};

export type ReframeCrop = {
  start: number;
  end: number;
  /** Crop en pixeles del frame fuente. */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ReframePlan = {
  /** Tamano del frame destino (crop escalado tal cual sale del filtro). */
  target: { width: number; height: number };
  /** Segmentos de crop ordenados y contiguos [0, durSeg]. */
  crops: ReframeCrop[];
  notes: string[];
  /** Ejemplo de argv ffmpeg por segmento (crop + concat, re-encode obligatorio). */
  ffmpegHint: string;
};

export type UpscaleInput = {
  width: number;
  height: number;
  /** Objetivo: altura de referencia o factor. Default '1080p'. */
  target?: '1080p' | '1440p' | '4k' | '8k' | '2x' | '4x';
};

export type UpscalePlan = {
  from: { width: number; height: number };
  to: { width: number; height: number };
  scaleFactor: number;
  /** Escala 2x-4x clasica vs generativa (>4x necesita modelo de super-resolucion). */
  kind: 'classic' | 'generative';
  argv: string[];
  notes: string[];
};

export type GradeHints = {
  /** Exposicion en stops (-1..1). */
  exposure: number;
  /** Contraste (1 = neutro). */
  contrast: number;
  /** Temperatura -1 fria .. +1 calida. */
  temperature: number;
  /** Tint -1 verde .. +1 magenta. */
  tint: number;
  /** Saturacion (1 = neutro, 0 = mono). */
  saturation: number;
};

export type LutStyle = 'warm-cinematic' | 'neutral-punch' | 'teal-orange' | 'mono' | 'custom';

export type LutMatchInput = {
  /** Look objetivo (mismos nombres que video_edit grade). */
  style: LutStyle;
  /** Hints parciales para override (custom). */
  hints?: Partial<GradeHints>;
};

export type LutMatchPlan = {
  hints: GradeHints;
  /** argv ffmpeg eq= (exposicion/contraste/saturacion). */
  eqArgs: string[];
  /** Temperatura/tint se aplican aparte (colorbalance/colortemp). */
  temperatureArgs: string[];
  /** Nombre de 3DL sugerido (match real de referencia requiere CV -> delegado). */
  lutName: string;
  notes: string[];
};

export type RotoInput = {
  durSeg: number;
  fps: number;
  /** keyframe = recorte cada N frames + interpolacion; full = frame a frame. */
  mode?: 'keyframe' | 'full';
  /** Cada cuantos frames se recorta en modo keyframe. Default 10. */
  keyEveryFrames?: number;
};

export type RotoPlan = {
  frameCount: number;
  keyframes: number;
  /** Estimacion en minutos (modelo determinista documentado en notes). */
  estMin: number;
  alphaMode: 'straight' | 'premultiplied';
  cleanupPasses: string[];
  notes: string[];
};

export type DrawStyle = 'lineart' | 'scribble' | 'colored-sketch' | 'painterly';

export type DrawInput = {
  /** Estilo del boceto de entrada. */
  style: DrawStyle;
  /** Descripcion del sujeto (ej. "un dragon volando sobre la ciudad"). */
  subject: string;
  /** Movimiento de camara deseado (vocabulario MOTIONS de OMAG si se conoce). */
  motion?: string;
  aspect?: '9:16' | '1:1' | '16:9';
};

export type DrawPlan = {
  prompt: string;
  /** Semilla determinista (hash del subject) para reproduccion. */
  seed: number;
  negativeHint: string;
  notes: string[];
};

export type BrollInput = {
  /** Que falta en la edicion (ej. "closeup del producto girando"). */
  missingBeat: string;
  frameShape: '9:16' | '1:1' | '16:9';
  /** Necesidad de movimiento (ej. "slow push-in", "orbit"). */
  motionNeed: string;
  /** Transicion que debe soportar el clip (ej. "cut", "dissolve"). */
  transition: string;
  durationSeg: number;
  /** Look/tono (ej. "editorial dark", "lifestyle bright"). */
  style: string;
};

export type BrollPlan = {
  request: {
    missingBeat: string;
    frameShape: string;
    motionNeed: string;
    transition: string;
    durationSeg: number;
    style: string;
  };
  prompt: string;
  /** Encaminamiento de provider (premium vs keyless fallback). */
  providerHint: string;
  notes: string[];
};

// ------------------------------------------------------------------- reframe

/** 16:9 -> 9:16 (u otro aspecto) siguiendo centros de accion con pan suave. */
export function planReframe(input: ReframeInput): ReframePlan {
  const notes: string[] = [];
  const { width, height, durSeg } = input;
  const targetRatio = input.targetRatio ?? 9 / 16;
  const pad = clamp01(input.pad ?? 0.15);
  const maxPan = input.maxPanPerSec ?? 0.35;
  if (input.centers.length === 0) throw new Error('reframe requiere al menos 1 centro de accion');
  const centers = [...input.centers].sort((a, b) => a.t - b.t);
  if (centers[0].t < 0 || centers[centers.length - 1].t > durSeg) throw new Error('centros fuera del rango [0, durSeg]');

  // Tamano del crop base: recorta el lado largo hasta el aspecto destino.
  // Invariante: el crop SIEMPRE cabe en el frame fuente (w <= width, h <= height).
  let w: number;
  let h: number;
  if (width / height >= targetRatio) {
    h = height;
    w = Math.round(height * targetRatio);
  } else {
    w = width;
    h = Math.round(width / targetRatio);
  }

  const padX = Math.round(pad * width);
  const padY = Math.round(pad * height);
  const minX = w < width ? Math.min(padX, Math.floor((width - w) / 2)) : 0;
  const minY = h < height ? Math.min(padY, Math.floor((height - h) / 2)) : 0;
  const maxX = Math.max(minX, width - w - minX);
  const maxY = Math.max(minY, height - h - minY);

  const windowAt = (c: ActionCenter): { x: number; y: number } => {
    const cx = Math.round(c.x01 * width - w / 2);
    const cy = Math.round(c.y01 * height - h / 2);
    return { x: clamp(cx, minX, maxX), y: clamp(cy, minY, maxY) };
  };

  const crops: ReframeCrop[] = [];
  const push = (start: number, end: number, win: { x: number; y: number }): void => {
    if (end - start <= 0.001) return;
    crops.push({ start: round2(start), end: round2(end), x: win.x, y: win.y, w, h });
  };

  // Segmento inicial: hold del primer centro desde t=0.
  const first = windowAt(centers[0]);
  if (centers[0].t > 0) push(0, centers[0].t, first);

  for (let i = 0; i < centers.length; i++) {
    const a = centers[i];
    const winA = windowAt(a);
    const b = centers[i + 1];
    if (!b) {
      push(a.t, durSeg, winA); // hold final
      break;
    }
    const dist = Math.abs(winA.x - windowAt(b).x) / w;
    const dt = Math.max(b.t - a.t, 0.001);
    if (dist / dt <= maxPan) {
      push(a.t, b.t, winA);
    } else {
      // Pan muy rapido: interpolar para respetar maxPanPerSec.
      const n = Math.max(2, Math.ceil((dist / dt) / maxPan));
      const step = dt / n;
      for (let k = 0; k < n; k++) {
        const f = k / n;
        const c: ActionCenter = { t: a.t + k * step, x01: a.x01 + (b.x01 - a.x01) * f, y01: a.y01 + (b.y01 - a.y01) * f, w01: a.w01 };
        const winK = windowAt(c);
        const next = Math.min(a.t + (k + 1) * step, b.t);
        push(a.t + k * step, next, winK);
      }
    }
  }

  if (crops.length === 0) push(0, durSeg, first);
  // Solapar bordes de segmento (2 frames) para transiciones limpias.
  notes.push(`${crops.length} segmentos de crop; solapar 2 frames por frontera al concat`);
  notes.push(`crop sigue centros de accion con pan <= ${maxPan}/s del ancho de crop; pad ${Math.round(pad * 100)}%`);
  const ffmpegHint =
    'por segmento: ffmpeg -i in.mp4 -vf "crop=W:H:X:Y" -c:v libx264 -crf 18 -an seg_%02d.mp4 ; luego concat demuxer (lista de seg) + re-encode final (-c:v libx264, -movflags +faststart). El crop impide -c copy.';
  return { target: { width: w, height: h }, crops, notes, ffmpegHint };
}

// ------------------------------------------------------------------- upscale

const LADDER: Record<string, number> = { '1080p': 1080, '1440p': 1440, '4k': 2160, '8k': 4320 };

/** Ladder de resolucion (lanczos clasico <= 4x; > 4x requiere super-resolucion). */
export function planUpscale(input: UpscaleInput): UpscalePlan {
  const notes: string[] = [];
  const { width, height } = input;
  const target = input.target ?? '1080p';
  let toH: number;
  if (target === '2x' || target === '4x') {
    toH = height * (target === '2x' ? 2 : 4);
  } else {
    toH = LADDER[target];
  }
  if (toH <= height) {
    notes.push(`origen ya es >= ${target}: no se escala (${width}x${height})`);
    toH = height;
  }
  const toW = Math.round(toH * (width / height));
  const scaleFactor = toH / height;
  const kind = scaleFactor > 4 ? 'generative' : 'classic';
  if (kind === 'generative') notes.push('factor > 4x: lanczos degrada; usar modelo de super-resolucion (Gen-Engine/generative upscaler)');
  notes.push('lanczos + denoise ligero recomendado antes de escalar (hqdn3d) si el origen es ruidoso');
  const argv = ['-vf', `scale=${toW}:${toH}:flags=lanczos`, '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart'];
  return { from: { width, height }, to: { width: toW, height: toH }, scaleFactor: round2(scaleFactor), kind, argv, notes };
}

// ------------------------------------------------------------------- lut match

const LUT_PRESETS: Record<LutStyle, GradeHints> = {
  'warm-cinematic': { exposure: 0.06, contrast: 1.08, temperature: 0.18, tint: 0.02, saturation: 1.15 },
  'neutral-punch': { exposure: 0, contrast: 1.12, temperature: 0, tint: 0, saturation: 1.05 },
  'teal-orange': { exposure: -0.02, contrast: 1.15, temperature: 0.1, tint: 0.08, saturation: 1.2 },
  mono: { exposure: 0, contrast: 1.1, temperature: 0, tint: 0, saturation: 0 },
  custom: { exposure: 0, contrast: 1, temperature: 0, tint: 0, saturation: 1 },
};

/** Presets de grade (mismos nombres que video_edit) -> hints + argv ffmpeg. */
export function planLutMatch(input: LutMatchInput): LutMatchPlan {
  const notes: string[] = [];
  const base = LUT_PRESETS[input.style];
  const hints: GradeHints = { ...base, ...input.hints };
  // eq solo cubre exposure/contrast/saturation; temp/tint van por colorbalance.
  const eqArgs = ['-vf', `eq=exposure=${round2(hints.exposure)}:contrast=${round2(hints.contrast)}:saturation=${round2(hints.saturation)}`];
  const temperatureArgs =
    hints.temperature === 0 && hints.tint === 0
      ? []
      : ['-vf', `colorbalance=rs=${round2(Math.max(hints.temperature, 0) * 0.12)}:bs=${round2(Math.max(-hints.temperature, 0) * 0.12)}:ms=${round2(hints.tint * 0.08)}`];
  notes.push('presets deterministas; el match real desde UNA imagen de referencia requiere analisis de color (CV) — delegado');
  notes.push('para look de referencia: extraer median de RGB por zona (sombras/medios/altas) y derivar hints custom');
  const lutName = `${input.style}.3dl`;
  return { hints, eqArgs, temperatureArgs, lutName, notes };
}

// ------------------------------------------------------------------- rotoscope

/** Plan de remove-background: keyframes vs full + pases de limpieza. */
export function planRotoscope(input: RotoInput): RotoPlan {
  const notes: string[] = [];
  const { durSeg, fps } = input;
  const mode = input.mode ?? 'keyframe';
  const keyEvery = input.keyEveryFrames ?? 10;
  const frameCount = Math.max(1, Math.round(durSeg * fps));
  const keyframes = mode === 'keyframe' ? Math.max(1, Math.ceil(frameCount / keyEvery)) : frameCount;
  // Modelo de coste: 0.35s/frame en keyframe (recorte + interp) vs 0.08s/frame full (batch ML).
  const estMin = round2(((mode === 'keyframe' ? keyframes * 0.35 : frameCount * 0.08) / 60));
  notes.push(`modo ${mode}: ${keyframes} de ${frameCount} frames recortados; interpolacion entre keyframes`);
  notes.push('salida: PNG/RGB con canal alpha straight; premultiplied solo si el compositor lo exige');
  notes.push('bordes: despill + matte choker 1-2px + edge refine (blur 0.5px) para pelo/transparencias');
  const cleanupPasses = ['despill (fringe verde/magenta)', 'matte choker 1-2px', 'edge refine + blur 0.5px', 'spill suppression (tint de borde)'];
  return { frameCount, keyframes, estMin, alphaMode: 'straight', cleanupPasses, notes };
}

// ------------------------------------------------------------------- draw to edit

const DRAW_STYLE_MAP: Record<DrawStyle, string> = {
  lineart: 'clean line art of the subject, flat colors, bold outlines',
  scribble: 'rough scribble sketch of the subject, playful energy',
  'colored-sketch': 'colored pencil sketch of the subject, soft shading',
  painterly: 'painterly interpretation of the subject, brush strokes',
};

const QUALITY_SUFFIX = 'cinematic lighting, hyperrealistic detail, 4k, high quality';

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h % 1000;
}

/** Boceto -> prompt de generacion de video (estilo + motion + calidad). */
export function planDrawToEdit(input: DrawInput): DrawPlan {
  const notes: string[] = [];
  const motion = input.motion ?? 'slow push-in';
  const aspect = input.aspect ?? '9:16';
  const styleDesc = DRAW_STYLE_MAP[input.style];
  const prompt = `${input.subject}, ${styleDesc}, camera ${motion}, ${QUALITY_SUFFIX}, ${aspect}`;
  notes.push('el prompt convierte el boceto en clip: estilo del boceto + movimiento de camara (vocabulario MOTIONS de OMAG)');
  notes.push('seed determinista para reproducibilidad; cambiar motion o style cambia el resultado');
  return { prompt, seed: hashSeed(input.subject), negativeHint: 'blurry, deformed anatomy, watermark, text, lowres', notes };
}

// ------------------------------------------------------------------- broll

const FRAME_SHAPE_DESC: Record<BrollInput['frameShape'], string> = {
  '9:16': 'vertical 9:16 (Shorts/Reels/TikTok)',
  '1:1': 'cuadrado 1:1 (feed)',
  '16:9': 'horizontal 16:9 (youtube/web)',
};

/** Framework Dreamina: missing beat -> frame shape -> motion -> transition. */
export function planBroll(input: BrollInput): BrollPlan {
  const notes: string[] = [];
  const shapeDesc = FRAME_SHAPE_DESC[input.frameShape];
  const prompt = `${input.missingBeat}, ${shapeDesc}, camera ${input.motionNeed}, transition-ready ${input.transition}, ${input.style}, ${QUALITY_SUFFIX}`;
  notes.push('regla Dreamina: definir el job (beat/frame/motion/transition) ANTES de generar evita B-roll generico');
  notes.push('duracion objetivo ' + input.durationSeg + 's: pedir al provider un clip >= duracion para margen de corte');
  const providerHint = input.durationSeg <= 10 ? 'keyless: storyboard/pollinations fallback' : 'premium: Gen-Engine (Veo/Seedance) si GEN_ENGINE_URL disponible';
  return { request: { ...input, frameShape: input.frameShape }, prompt, providerHint, notes };
}

// ------------------------------------------------------------------- helpers

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function clamp01(v: number): number {
  return clamp(v, 0, 0.5);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ------------------------------------------------------------------- exports

export const vfx = { planReframe, planUpscale, planLutMatch, planRotoscope, planDrawToEdit, planBroll };