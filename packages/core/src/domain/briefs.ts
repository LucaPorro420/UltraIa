/**
 * AutoPub F1 (tarea 4) — Cola de briefs persistente.
 *
 * Dominio sobre Prisma (`TopicBrief`) con db inyectable (patrón domain/publications.ts):
 *   - guardarBriefs: persiste briefs nuevos del motor de ideas (tools/topics) con dedupe
 *     por tema+canal (los ya existentes se ignoran).
 *   - listarBriefs: cola priorizada por score desc, filtros por estado/canal.
 *   - marcarBriefProcesado/Descartado: transiciones NUEVO → PROCESADO/DESCARTADO.
 */

import type { Db } from '../db/client';
import type { TopicBrief } from '../tools/topics';

export type BriefEstado = 'NUEVO' | 'PROCESADO' | 'DESCARTADO';

export interface GuardarBriefsResult {
  creados: number;
  yaExistentes: number;
}

/** Persiste briefs nuevos (dedupe por tema+canal). */
export async function guardarBriefs(db: Db, briefs: TopicBrief[]): Promise<GuardarBriefsResult> {
  let creados = 0;
  let yaExistentes = 0;
  for (const b of briefs) {
    const existente = await db.topicBrief.findFirst({ where: { tema: b.tema, canal: b.canal } });
    if (existente) {
      yaExistentes++;
      continue;
    }
    await db.topicBrief.create({
      data: {
        tema: b.tema,
        canal: b.canal,
        formato: b.formato,
        tono: b.tono,
        angulo: b.angulo,
        fuentesJson: JSON.stringify(b.fuentes),
        score: b.score,
        pubDate: b.pubDate,
      },
    });
    creados++;
  }
  return { creados, yaExistentes };
}

export interface ListBriefsOptions {
  estado?: BriefEstado | 'ALL';
  canal?: string;
  take?: number;
  cursor?: string;
}

export interface BriefRow {
  id: string;
  tema: string;
  canal: string;
  formato: string;
  tono: string;
  angulo: string;
  fuentes: string[];
  score: number;
  pubDate: string | null;
  estado: BriefEstado;
  creadoEn: Date;
  procesadoEn: Date | null;
}

/** Cola de briefs ordenada por score desc. */
export async function listarBriefs(db: Db, opts: ListBriefsOptions = {}): Promise<{ items: BriefRow[]; nextCursor: string | null }> {
  const take = Math.min(Math.max(opts.take ?? 20, 1), 100);
  const items = await db.topicBrief.findMany({
    where: {
      ...(opts.estado && opts.estado !== 'ALL' ? { estado: opts.estado } : {}),
      ...(opts.canal ? { canal: opts.canal } : {}),
    },
    orderBy: [{ score: 'desc' }, { creadoEn: 'desc' }],
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length > take;
  const page = hasMore ? items.slice(0, take) : items;
  return {
    items: page.map((r) => ({
      id: r.id,
      tema: r.tema,
      canal: r.canal,
      formato: r.formato,
      tono: r.tono,
      angulo: r.angulo,
      fuentes: JSON.parse(r.fuentesJson) as string[],
      score: r.score,
      pubDate: r.pubDate,
      estado: r.estado as BriefEstado,
      creadoEn: r.creadoEn,
      procesadoEn: r.procesadoEn,
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/** Marca un brief como procesado (ya enrutado por F2). */
export async function marcarBriefProcesado(db: Db, id: string): Promise<BriefEstado> {
  const updated = await db.topicBrief.update({
    where: { id },
    data: { estado: 'PROCESADO', procesadoEn: new Date() },
  });
  return updated.estado as BriefEstado;
}

/** Marca un brief como descartado (sin valor para la fábrica). */
export async function marcarBriefDescartado(db: Db, id: string): Promise<BriefEstado> {
  const updated = await db.topicBrief.update({
    where: { id },
    data: { estado: 'DESCARTADO', procesadoEn: new Date() },
  });
  return updated.estado as BriefEstado;
}

export const briefs = { guardarBriefs, listarBriefs, marcarBriefProcesado, marcarBriefDescartado };