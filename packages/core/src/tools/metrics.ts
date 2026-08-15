/**
 * AutoPub F5 — KPIs por canal de la cola de publicaciones (F4 tarea 2 + F5 tarea 1).
 * Agrega sobre `Publication` (Prisma) con db inyectable: publicadas, fallidas,
 * pendientes, tasa de éxito, y media del mediaScore pre-publicación (F5).
 */

import type { Db } from '../db/client';
import type { PublicationEstado } from '../domain/publications';

export interface CanalKpis {
  canal: string;
  total: number;
  publicadas: number;
  fallidas: number;
  pendientes: number; // DRAFT + APPROVED
  tasaExito: number | null; // publicadas / (publicadas + fallidas), null si no hay
  scorePromedio: number | null; // media mediaScore
}

export interface PublicationKpis {
  porCanal: CanalKpis[];
  totales: {
    total: number;
    publicadas: number;
    fallidas: number;
    pendientes: number;
    tasaExito: number | null;
    scorePromedio: number | null;
  };
}

export async function computeChannelKpis(db: Db): Promise<PublicationKpis> {
  const rows = await db.publication.findMany({ select: { canal: true, estado: true, mediaScore: true } });
  const porCanal = new Map<string, CanalKpis>();

  const acumula = (canal: string) => {
    let c = porCanal.get(canal);
    if (!c) {
      c = { canal, total: 0, publicadas: 0, fallidas: 0, pendientes: 0, tasaExito: null, scorePromedio: null };
      porCanal.set(canal, c);
    }
    return c;
  };

  const scoresPorCanal = new Map<string, number[]>();
  for (const r of rows) {
    const c = acumula(r.canal);
    c.total++;
    const estado = r.estado as PublicationEstado;
    if (estado === 'PUBLISHED') c.publicadas++;
    else if (estado === 'FAILED') c.fallidas++;
    else if (estado === 'DRAFT' || estado === 'APPROVED') c.pendientes++;
    if (typeof r.mediaScore === 'number') {
      const arr = scoresPorCanal.get(r.canal) ?? [];
      arr.push(r.mediaScore);
      scoresPorCanal.set(r.canal, arr);
    }
  }

  const canales = [...porCanal.values()].map((c) => {
    const cerradas = c.publicadas + c.fallidas;
    const scores = scoresPorCanal.get(c.canal) ?? [];
    return {
      ...c,
      tasaExito: cerradas > 0 ? Math.round((c.publicadas / cerradas) * 100) / 100 : null,
      scorePromedio: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    };
  });

  const sum = (fn: (c: CanalKpis) => number) => canales.reduce((acc, c) => acc + fn(c), 0);
  const totalPublicadas = sum((c) => c.publicadas);
  const totalFallidas = sum((c) => c.fallidas);
  const cerradas = totalPublicadas + totalFallidas;
  const todosScores = [...scoresPorCanal.values()].flat();

  return {
    porCanal: canales.sort((a, b) => b.total - a.total),
    totales: {
      total: sum((c) => c.total),
      publicadas: totalPublicadas,
      fallidas: totalFallidas,
      pendientes: sum((c) => c.pendientes),
      tasaExito: cerradas > 0 ? Math.round((totalPublicadas / cerradas) * 100) / 100 : null,
      scorePromedio: todosScores.length > 0 ? Math.round(todosScores.reduce((a, b) => a + b, 0) / todosScores.length) : null,
    },
  };
}

export const metrics = { computeChannelKpis };