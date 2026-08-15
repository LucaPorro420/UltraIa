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
}

export interface CreatePublicationResult {
  id: string;
  estado: PublicationEstado;
  requiereAprobacion: boolean;
}

/** Crea una publicación DRAFT (o APPROVED si texto/blog) en la cola. */
export async function createPublication(db: Db, input: CreatePublicationInput): Promise<CreatePublicationResult> {
  const requiereAprobacion = canalRequiereAprobacion(input.canal);
  const caption = input.paquete.captionsByChannel[input.canal]?.caption ?? input.paquete.contenido.slice(0, 300);
  const hashtags = input.paquete.captionsByChannel[input.canal]?.hashtags ?? [];
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
    },
  });
  return { id: created.id, estado: created.estado as PublicationEstado, requiereAprobacion };
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
        resultado = await publishToAll(createDefaultPublishers(), { metadata });
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

export const publications = { createPublication, listPublications, listBlogPosts, approvePublication, rejectPublication, markPublished, markFailed, publishDue, canalRequiereAprobacion };