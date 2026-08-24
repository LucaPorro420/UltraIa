// -----------------------------------------------------------------------------
// procedural-pub.ts - puente procvid -> cola de Publicación (AutoPub)
// -----------------------------------------------------------------------------
// Builder PURO que convierte un render procedural (loop-93..95) en el payload
// que la cola de publicaciones espera (contrato de createPublication /
// puntuarPaquete): tema, canal blog, caption bilingüe es/ar, hashtags y rutas
// de media (GIF nativo / MP4 ffmpeg). Sin efectos secundarios ni reloj ->
// determinista y testeable. NO toca domain/publications.ts.
// -----------------------------------------------------------------------------

import type { NormalizedProcVidSpec, ProcVidPlan } from './procvid';

/** Rutas de los artefactos renderizados por procvid. */
export interface ProceduralOutputs {
  /** GIF animado nativo (.ultraia/procedural/<outName>.gif). */
  gifPath?: string;
  /** MP4 ensamblado con el argv del plan (.ultraia/procedural/<outName>.mp4). */
  mp4Path?: string;
}

export interface PublicationPayloadOptions {
  /** Idioma del caption principal ('es' default | 'ar'). */
  idioma?: 'es' | 'ar';
}

/**
 * Payload compatible con createPublication({ paquete }) — canal 'blog'
 * (auto-APPROVED según la regla híbrida; video/imagen en otros canales
 * pedirían aprobación humana).
 */
export function buildPublicationPayload(
  spec: NormalizedProcVidSpec,
  plan: Pick<ProcVidPlan, 'outputPath' | 'framesDir'>,
  outputs: ProceduralOutputs = {},
  opts: PublicationPayloadOptions = {},
): Record<string, unknown> {
  const idioma = opts.idioma ?? 'es';
  const animLabel = spec.animation.replace(/-/g, ' ');
  const titulo =
    idioma === 'ar'
      ? `فيديو إجرائي: ${animLabel} (${spec.width}x${spec.height})`
      : `Video procedural: ${animLabel} (${spec.width}x${spec.height})`;

  const caption =
    idioma === 'ar'
      ? `${titulo} — حلقة ${spec.frameCount} إطارًا بـ${spec.fps}fps، مولّدة 100% بالكود الرياضي بدون AI توليدي.`
      : `${titulo} — loop de ${spec.frameCount} frames a ${spec.fps}fps, generado 100% con código matemático determinista (sin IA generativa, sin red).`;

  const hashtags = [
    '#UltraIa',
    '#procedural',
    '#generative',
    `#${spec.animation.replace(/-/g, '')}`,
    idioma === 'ar' ? '#برمجة_فنية' : '#creativeCoding',
  ];

  const contenido =
    idioma === 'ar'
      ? `${caption}\n\nالمواصفات: ${spec.animation}, ${spec.width}x${spec.height}@${spec.fps}fps, ${spec.durationSec}s, seed ${spec.seed}, palette ${spec.palette}. الإطارات: ${plan.framesDir}.`
      : `${caption}\n\nEspecificaciones: animación "${spec.animation}" de ${spec.width}x${spec.height} @ ${spec.fps}fps durante ${spec.durationSec}s (seed ${spec.seed}, paleta ${spec.palette}). Frames renderizados en ${plan.framesDir}; ensamblado reproducible con el argv ffmpeg planificado.`;

  return {
    briefId: null,
    tema: titulo,
    contenido,
    canales: ['blog'],
    captionsByChannel: {
      blog: { caption, hashtags },
    },
    visualByChannel: {
      blog: {
        formato: spec.height > spec.width ? '9:16' : '16:9',
        fuente: 'procedural',
      },
    },
    horarioSugerido: null,
    media: {
      gifPath: outputs.gifPath ?? null,
      mp4Path: outputs.mp4Path ?? plan.outputPath,
    },
    procedural: {
      animation: spec.animation,
      width: spec.width,
      height: spec.height,
      fps: spec.fps,
      durationSec: spec.durationSec,
      frameCount: spec.frameCount,
      seed: spec.seed,
      palette: spec.palette,
      outName: spec.outName,
    },
    generadoCon: 'ultraia-procvid',
  };
}
