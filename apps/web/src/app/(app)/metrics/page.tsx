import { prisma } from '@ultraia/core';
import { requireUser } from '@/lib/server/context';
import { MetricsClient } from '@/components/metrics-client';

export const metadata = { title: 'Métricas — UltraIa' };

export default async function MetricsPage() {
  const user = await requireUser();

  // Server-side prefetch — eliminates client-side waterfall
  let initialKpis = null;
  try {
    const publications = await prisma.publication.findMany({
      where: { creadoPorId: user.id },
      select: {
        canal: true,
        estado: true,
        mediaScore: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const canalMap = new Map<string, { total: number; publicadas: number; fallidas: number; pendientes: number; scores: number[] }>();
    for (const p of publications) {
      const canal = p.canal ?? 'desconocido';
      if (!canalMap.has(canal)) canalMap.set(canal, { total: 0, publicadas: 0, fallidas: 0, pendientes: 0, scores: [] });
      const c = canalMap.get(canal)!;
      c.total++;
      if (p.estado === 'PUBLISHED') c.publicadas++;
      else if (p.estado === 'FAILED') c.fallidas++;
      else if (p.estado === 'DRAFT' || p.estado === 'APPROVED') c.pendientes++;
      if (p.mediaScore != null) c.scores.push(p.mediaScore);
    }

    const porCanal = Array.from(canalMap.entries()).map(([canal, c]) => ({
      canal,
      total: c.total,
      publicadas: c.publicadas,
      fallidas: c.fallidas,
      pendientes: c.pendientes,
      tasaExito: c.total > 0 ? c.publicadas / c.total : null,
      scorePromedio: c.scores.length > 0 ? c.scores.reduce((a, b) => a + b, 0) / c.scores.length : null,
    }));

    const total = publications.length;
    const publicadas = publications.filter(p => p.estado === 'PUBLISHED').length;
    const fallidas = publications.filter(p => p.estado === 'FAILED').length;
    const pendientes = publications.filter(p => p.estado === 'DRAFT' || p.estado === 'APPROVED').length;
    const allScores = publications.filter(p => p.mediaScore != null).map(p => p.mediaScore!);

    initialKpis = {
      ok: true,
      porCanal,
      totales: {
        total,
        publicadas,
        fallidas,
        pendientes,
        tasaExito: total > 0 ? publicadas / total : null,
        scorePromedio: allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null,
      },
    };
  } catch {
    // Fail-soft: client will refetch
  }

  return <MetricsClient initialKpis={initialKpis} />;
}