/**
 * AutoPub F4 (tarea 2) — Cola de publicaciones persistente.
 *
 * Dominio sobre Prisma (`Publication`) con db inyectable (patrón de domain/versions.ts):
 *   - createPublication: crea DRAFT desde un PublicationPackage (F3 present). La regla de
 *     aprobación híbrida del usuario (15/08/2026): texto/blog se auto-aprueba; canales con
 *     video/imagen (youtube_shorts/tiktok/instagram) requieren aprobación humana.
 *   - listPublications: cola con filtros por estado/canal.
 *   - approve/reject: transiciones de DRAFT (solo el creador o ADMIN).
 *   - markPublished/markFailed: resultado del adaptador de publicación (F4 tarea 1).
 *   - publishDue: helper para el calendario (tarea 4): publica los APPROVED programados
 *     que ya vencen, usando publishToAll de tools/publish (fail-soft sin tokens).
 */

import type { Db } from '../db/client';
import type { PublicationPackage, PresentChannel } from '../tools/present';
import { publishToAll, createDefaultPublishers } from '../tools/publish';
import type { PublishResult } from '../tools/publish';
import { puntuarPaquete } from '../tools/media-score';
import type { CloudService } from '../tools/cloud'; // QUÉ ES: solo el TIPO del orquestador cloud (sin acoplar runtime).
// PARA QUÉ: createPublication recibe el cloud inyectado (opcional) — mismo patrón que `Db`.
// POR QUÉ: el dominio no construye adapters; el caller (ruta API/agente) resuelve Local o R2.

export type PublicationEstado = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'FAILED';

/** Canales con media que requieren aprobación humana (video/imagen). */
export const CANALES_CON_APROBACION: PresentChannel[] = ['youtube_shorts', 'tiktok', 'instagram'];

/** Un canal requiere aprobación si produce video/imagen (no blog/texto). */
export function canalRequiereAprobacion(canal: PresentChannel): boolean {
  return CANALES_CON_APROBACION.includes(canal);
}

export interface CreatePublicationInput {
  paquete: PublicationPackage;
  canal: PresentChannel;
  scheduledAt?: Date | null;
  creadoPorId?: string | null;
  cloud?: CloudService; // QUÉ ES: opcional — si se inyecta, el paquete se respalda en la nube.
  // PARA QUÉ: el caller decide (rutas API/agentes con cloud; tests sin cloud).
  // POR QUÉ: aditivo — no rompe llamadas existentes (los 15 tests actuales siguen pasando sin cambio).
}

export interface CreatePublicationResult {
  id: string;
  estado: PublicationEstado;
  requiereAprobacion: boolean;
  cloudGuardado?: CloudSaveResult | null; // QUÉ ES: resultado del respaldo (null si no se pidió).
  // PARA QUÉ: el caller puede avisar al usuario si algún media no se pudo respaldar.
}

export interface CloudSaveResult {
  ok: boolean; // QUÉ ES: true si al menos 1 media se subió y el paquete JSON se guardó.
  savedMedia: string[]; // QUÉ ES: paths canónicos en el cloud de los media subidos (p.ej. media/videos/final.mp4).
  savedPackage: string | null; // QUÉ ES: path del paquete JSON (exports/publications/<id>.json) o null si falló.
  errors: string[]; // QUÉ ES: mensajes de error acumulados (fail-soft, no lanzan).
}

/** QUÉ ES: carpeta canónica del cloud según la extensión del media (layout CLOUD_LAYOUT de cloud.ts). */
const CLOUD_DIR_BY_EXT: Record<string, string> = {
  mp4: 'media/videos', mov: 'media/videos', webm: 'media/videos', mkv: 'media/videos', avi: 'media/videos', m4v: 'media/videos',
  mp3: 'media/audio', wav: 'media/audio', ogg: 'media/audio', m4a: 'media/audio', flac: 'media/audio', aac: 'media/audio',
  png: 'media/images', jpg: 'media/images', jpeg: 'media/images', webp: 'media/images', gif: 'media/images', svg: 'media/images', avif: 'media/images',
};

/** Sube los media de un paquete + el paquete JSON al cloud. Fail-soft: nunca lanza. */
export async function guardarPaqueteEnCloud(
  cloud: CloudService, // QUÉ ES: instancia ya resuelta (Local o R2). PARA QUÉ: el dominio no construye adapters.
  paquete: PublicationPackage, // QUÉ ES: el paquete completo (media + captions + visuales).
  id: string, // QUÉ ES: id de la Publication ya creada. PARA QUÉ: nombre del JSON auditable y trazable.
): Promise<CloudSaveResult> {
  const savedMedia: string[] = [];
  const errors: string[] = [];
  // QUÉ ES: subir cada URL de media al cloud, en paralelo (Promise.allSettled para fail-soft).
  // PARA QUÉ: una URL caída no tumba el resto del lote.
  // POR QUÉ: allSettled (no all) — queremos tolerar fallos parciales y reportarlos.
  await Promise.allSettled(
    (paquete.media ?? []).map(async (url) => {
      try {
        const res = await fetch(url); // QUÉ ES: descargar la URL pública del media (pollinations/local/meigen…).
        // PARA QUÉ: el cloud guarda BYTES, no URLs — CloudService.upload exige Uint8Array.
        if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        // QUÉ ES: nombre del archivo derivado de la URL (último segmento, sin query).
        // PARA QUÉ: nombres estables y legibles en el cloud.
        const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'media.bin');
        // QUÉ ES: subir a la carpeta que clasifica su tipo (video→media/videos, imagen→media/images…).
        // POR QUÉ: CloudService.upload sin targetPath usa 'drafts'; nosotros queremos el layout canónico.
        const ext = name.split('.').pop()?.toLowerCase() ?? '';
        const dir = CLOUD_DIR_BY_EXT[ext] ?? 'drafts';
        const saved = await cloud.upload(name, bytes, dir);
        savedMedia.push(saved.path); // QUÉ ES: path canónico devuelto por el adapter.
      } catch (err) {
        errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );
  // QUÉ ES: guardar el paquete JSON como traza auditable en exports/publications/.
  // PARA QUÉ: reproducir la decisión de publicación sin depender de Prisma (backup offline).
  // POR QUÉ: la carpeta exports existe en CLOUD_LAYOUT y es el lugar natural para entregables.
  let savedPackage: string | null = null;
  try {
    const jsonBytes = new TextEncoder().encode(JSON.stringify(paquete, null, 2));
    // QUÉ ES: upload con targetPath explícito (la ruta completa la arma CloudService + sanitize).
    const saved = await cloud.upload(`${id}.json`, jsonBytes, 'exports/publications');
    savedPackage = saved.path;
  } catch (err) {
    errors.push(`paquete JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  // QUÉ ES: ok = al menos un media subido O el JSON guardado (o ambos).
  return { ok: savedMedia.length > 0 || savedPackage !== null, savedMedia, savedPackage, errors };
}

/** Crea una publicación DRAFT (o APPROVED si texto/blog) en la cola. */
export async function createPublication(db: Db, input: CreatePublicationInput): Promise<CreatePublicationResult> {
  const requiereAprobacion = canalRequiereAprobacion(input.canal);
  const caption = input.paquete.captionsByChannel[input.canal]?.caption ?? input.paquete.contenido.slice(0, 300);
  const hashtags = input.paquete.captionsByChannel[input.canal]?.hashtags ?? [];
  const mediaScore = puntuarPaquete(input.paquete).score;
  const created = await db.publication.create({
    data: {
      briefId: input.paquete.briefId ?? null,
      tema: input.paquete.tema,
      canal: input.canal,
      paqueteJson: JSON.stringify(input.paquete),
      caption,
      hashtags: JSON.stringify(hashtags),
      estado: requiereAprobacion ? 'DRAFT' : 'APPROVED',
      requiereAprobacion,
      scheduledAt: input.scheduledAt ?? null,
      creadoPorId: input.creadoPorId ?? null,
      mediaScore,
    },
  });
  // QUÉ ES: respaldo en cloud SOLO si el caller lo pidió (opcional).
  // PARA QUÉ: la cola funciona sin cloud (tests, instalaciones sin cloud); con cloud, respaldo automático.
  // POR QUÉ: fail-soft — si el cloud falla, la publicación YA está creada y no se revierte.
  const cloudGuardado = input.cloud
    ? await guardarPaqueteEnCloud(input.cloud, input.paquete, created.id)
    : null;
  return { id: created.id, estado: created.estado as PublicationEstado, requiereAprobacion, cloudGuardado };
}

export interface FeedbackSenal {
  rating: 'GOOD' | 'BAD';
  critique: string;
  ts: string;
}

/** Registra una señal de feedback post-publicación (F5 tarea 3). */
export async function registrarFeedback(db: Db, id: string, senal: Omit<FeedbackSenal, 'ts'>): Promise<FeedbackSenal[]> {
  const pub = await db.publication.findUnique({ where: { id } });
  if (!pub) throw new Error(`Publication ${id} no encontrada`);
  const previas = (pub.feedbackJson ? JSON.parse(pub.feedbackJson) : []) as FeedbackSenal[];
  const nuevas = [...previas, { ...senal, ts: new Date().toISOString() }];
  await db.publication.update({ where: { id }, data: { feedbackJson: JSON.stringify(nuevas) } });
  return nuevas;
}

/** Señales BAD → ImprovementSignal compatible con el pipeline de mejora (improve.ts). */
export async function publicationSignals(db: Db, limit = 20): Promise<{ critiques: string[]; total: number }> {
  const pubs = await db.publication.findMany({
    where: { feedbackJson: { not: null } },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  const critiques = pubs
    .flatMap((p) => (p.feedbackJson ? (JSON.parse(p.feedbackJson) as FeedbackSenal[]) : []))
    .filter((s) => s.rating === 'BAD' && s.critique.trim().length > 0)
    .map((s) => s.critique.trim());
  return { critiques, total: critiques.length };
}

export interface ListPublicationsOptions {
  estado?: PublicationEstado | 'ALL';
  canal?: string;
  take?: number;
  cursor?: string;
}

/** Lista la cola ordenada por programación descendente (nulls last). */
export async function listPublications(db: Db, opts: ListPublicationsOptions = {}) {
  const take = Math.min(Math.max(opts.take ?? 20, 1), 100);
  const items = await db.publication.findMany({
    where: {
      ...(opts.estado && opts.estado !== 'ALL' ? { estado: opts.estado } : {}),
      ...(opts.canal ? { canal: opts.canal } : {}),
    },
    orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length > take;
  const page = hasMore ? items.slice(0, take) : items;
  return {
    items: page.map((p) => ({ ...p, estado: p.estado as PublicationEstado })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export interface BlogPost {
  id: string;
  tema: string;
  caption: string;
  contenido: string;
  media: string[];
  publishedAt: Date;
}

/** Posts publicados del blog propio (canal blog, estado PUBLISHED). */
export async function listBlogPosts(db: Db, take: number = 10): Promise<BlogPost[]> {
  const items = await db.publication.findMany({
    where: { estado: 'PUBLISHED', canal: 'blog' },
    orderBy: { publishedAt: 'desc' },
    take: Math.min(Math.max(take, 1), 50),
  });
  return items
    .filter((p) => p.publishedAt)
    .map((p) => {
      const paquete = JSON.parse(p.paqueteJson) as { contenido?: string; media?: string[] };
      return {
        id: p.id,
        tema: p.tema,
        caption: p.caption,
        contenido: paquete.contenido ?? '',
        media: paquete.media ?? [],
        publishedAt: p.publishedAt!,
      };
    });
}

/** Transición DRAFT → APPROVED (aprobación humana del paquete). */
export async function approvePublication(db: Db, id: string): Promise<PublicationEstado> {
  const pub = await db.publication.findUnique({ where: { id } });
  if (!pub) throw new Error('Publication no encontrada');
  if (pub.estado !== 'DRAFT') throw new Error(`No se puede aprobar una publicación en estado ${pub.estado}`);
  await db.publication.update({ where: { id }, data: { estado: 'APPROVED' } });
  return 'APPROVED';
}

/** Transición DRAFT → REJECTED (rechazo humano del paquete). */
export async function rejectPublication(db: Db, id: string): Promise<PublicationEstado> {
  const pub = await db.publication.findUnique({ where: { id } });
  if (!pub) throw new Error('Publication no encontrada');
  if (pub.estado !== 'DRAFT') throw new Error(`No se puede rechazar una publicación en estado ${pub.estado}`);
  await db.publication.update({ where: { id }, data: { estado: 'REJECTED' } });
  return 'REJECTED';
}

/** Marca como publicada (APPROVED → PUBLISHED) con el resultado de los adaptadores. */
export async function markPublished(db: Db, id: string, resultado: PublishResult[]): Promise<void> {
  const pub = await db.publication.findUnique({ where: { id } });
  if (!pub) throw new Error('Publication no encontrada');
  if (pub.estado !== 'APPROVED') throw new Error(`No se puede publicar una publicación en estado ${pub.estado}`);
  await db.publication.update({
    where: { id },
    data: { estado: 'PUBLISHED', publishedAt: new Date(), resultadoJson: JSON.stringify(resultado), error: null },
  });
}

/** Marca como fallida (APPROVED → FAILED) con el error. */
export async function markFailed(db: Db, id: string, error: string): Promise<void> {
  const pub = await db.publication.findUnique({ where: { id } });
  if (!pub) throw new Error('Publication no encontrada');
  if (pub.estado !== 'APPROVED') throw new Error(`No se puede marcar fallida una publicación en estado ${pub.estado}`);
  await db.publication.update({ where: { id }, data: { estado: 'FAILED', error } });
}

export interface PublishDueOptions {
  /** Función de publicación inyectable (tests). Default: publishToAll con adapters default. */
  publishFn?: (input: { videoPath?: string; videoBuffer?: Buffer; metadata?: unknown }) => Promise<PublishResult[]>;
}

/** Publica los APPROVED programados que ya vencen (calendario F4 tarea 4). Fail-soft. */
export async function publishDue(db: Db, opts: PublishDueOptions = {}): Promise<{ publicadas: number; fallidas: number }> {
  const now = new Date();
  const due = await db.publication.findMany({
    where: { estado: 'APPROVED', scheduledAt: { lte: now } },
    orderBy: { scheduledAt: 'asc' },
    take: 50,
  });
  let publicadas = 0;
  let fallidas = 0;
  for (const pub of due) {
    const paquete = JSON.parse(pub.paqueteJson) as PublicationPackage;
    const metadata = { title: pub.tema, plainScript: pub.caption };
    let resultado: PublishResult[];
    try {
      if (opts.publishFn) {
        resultado = await opts.publishFn({ metadata });
      } else {
        resultado = await publishToAll(createDefaultPublishers({ includeX: true, includeMeta: true }), { metadata });
      }
      if (resultado.some((r) => r.ok)) {
        await markPublished(db, pub.id, resultado);
        publicadas++;
      } else {
        const razon = resultado.map((r) => r.error).filter(Boolean).join(' | ') || 'sin token o sin video';
        await markFailed(db, pub.id, razon);
        fallidas++;
      }
    } catch (err) {
      await markFailed(db, pub.id, (err as Error).message);
      fallidas++;
    }
  }
  return { publicadas, fallidas };
}

export const publications = { createPublication, listPublications, listBlogPosts, approvePublication, rejectPublication, markPublished, markFailed, publishDue, canalRequiereAprobacion, guardarPaqueteEnCloud };