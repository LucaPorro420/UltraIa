import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '@ultraia/core';

/**
 * GET /api/health — latido publico del servidor (iter-82).
 *
 * Sin auth y sin secretos: es la sonda que consumen los monitores gratuitos
 * (UptimeRobot / Better Stack) y el badge del README para saber si la instancia
 * esta viva y como esta de salud.
 *
 * `vitals` sale del ultimo pulso commiteado por el cron
 * (`resultTask/heartbeat/vitals.json`, ver .github/workflows/heartbeat.yml).
 * Si no existe (deploy limpio o filesystem serverless sin ese archivo), el
 * endpoint sigue respondiendo `ok` con `vitals: null`: la liveness NUNCA depende
 * de la telemetria.
 *
 * DB check (2026): prueba la conexion a Prisma de forma fail-soft.
 * Si la DB no responde, `db` = "unreachable" pero el endpoint sigue 200
 * (un monitor de uptime no debe alarmarse por un DB timeout momentaneo).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PulsoResumen = {
  fecha: string;
  entorno: string;
  estado: string;
  puntuacion: number;
  accion: { modo: string; objetivo: string; prioridad: string } | null;
  regresiones: string[];
};

function ultimoPulso(): PulsoResumen | null {
  const candidatos = [
    join(process.cwd(), 'resultTask', 'heartbeat', 'vitals.json'),
    join(process.cwd(), '..', '..', 'resultTask', 'heartbeat', 'vitals.json'),
  ];
  for (const ruta of candidatos) {
    try {
      const raw = JSON.parse(readFileSync(ruta, 'utf8')) as {
        fecha?: string;
        entorno?: string;
        vitals?: { estado?: string; puntuacion?: number };
        accion?: { modo?: string; objetivo?: string; prioridad?: string };
        regresiones?: string[];
      };
      return {
        fecha: raw.fecha ?? '',
        entorno: raw.entorno ?? '',
        estado: raw.vitals?.estado ?? 'DESCONOCIDO',
        puntuacion: raw.vitals?.puntuacion ?? 0,
        accion: raw.accion
          ? { modo: raw.accion.modo ?? '', objetivo: raw.accion.objetivo ?? '', prioridad: raw.accion.prioridad ?? '' }
          : null,
        regresiones: Array.isArray(raw.regresiones) ? raw.regresiones : [],
      };
    } catch {
      // fail-soft: se prueba el siguiente candidato
    }
  }
  return null;
}

async function checkDatabase(): Promise<{ status: string; latencyMs?: number }> {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Math.round(performance.now() - start) };
  } catch {
    return { status: 'unreachable', latencyMs: Math.round(performance.now() - start) };
  }
}

export async function GET() {
  const [pulso, db] = await Promise.all([Promise.resolve(ultimoPulso()), checkDatabase()]);
  const cuerpo = {
    ok: true,
    servicio: 'ultraia-web',
    version: process.env.npm_package_version ?? '0.1.0',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    entorno: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    uptimeSegundos: Math.round(process.uptime()),
    db,
    vitals: pulso,
  };
  // 200 siempre que el proceso responda; el estado del organismo va en el cuerpo
  // (un monitor de uptime no debe alarmarse porque el backlog tenga deuda).
  return Response.json(cuerpo, { headers: { 'cache-control': 'no-store' } });
}
