/**
 * LEARNING SYNC — Sincronización offline-first (REAL con Prisma)
 * GET  /api/learning/sync?type=status — queue status + device syncs
 * POST /api/learning/sync { operation: 'queue'|'commit'|'registerDevice', entityType, entityId, operation, payload, deviceId }
 */
import { prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'status';
  const user = await getCurrentUser(request as any).catch(() => null);

  if (!user) {
    return Response.json({ type, pending: 0, synced: 0, lastSync: null, offlineAvailable: true, reason: 'unauthenticated' }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const pending = await prisma.syncQueue.count({ where: { userId: user.id, status: 'pending' } });
  const synced = await prisma.syncQueue.count({ where: { userId: user.id, status: 'completed' } });
  const last = await prisma.syncQueue.findFirst({ where: { userId: user.id, status: 'completed' }, orderBy: { syncedAt: 'desc' }, select: { syncedAt: true } });
  const devices = await prisma.deviceSync.findMany({ where: { userId: user.id }, orderBy: { lastSyncAt: 'desc' } });

  return Response.json(
    { type, pending, synced, lastSync: last?.syncedAt ?? null, offlineAvailable: true, devices },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request as any).catch(() => null);
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { operation, entityType, entityId, payload, deviceId, deviceName, platform } = body as any;

    if (operation === 'queue' && entityType && entityId) {
      const item = await prisma.syncQueue.create({
        data: { userId: user.id, entityType, entityId, operation: operation ?? 'update', payload: payload ?? {}, status: 'pending' },
      });
      return Response.json({ ok: true, queued: true, item }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (operation === 'commit') {
      const res = await prisma.syncQueue.updateMany({
        where: { userId: user.id, status: 'pending' },
        data: { status: 'completed', syncedAt: new Date() },
      });
      // update device lastSync if provided
      if (deviceId) {
        await prisma.deviceSync.upsert({
          where: { userId_deviceId: { userId: user.id, deviceId } },
          update: { lastSyncAt: new Date(), pendingChanges: 0 },
          create: { userId: user.id, deviceId, deviceName, platform: platform ?? 'web', lastSyncAt: new Date() },
        });
      }
      return Response.json({ ok: true, committed: res.count }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (operation === 'registerDevice' && deviceId) {
      const dev = await prisma.deviceSync.upsert({
        where: { userId_deviceId: { userId: user.id, deviceId } },
        update: { deviceName, platform, isActive: true },
        create: { userId: user.id, deviceId, deviceName, platform: platform ?? 'web' },
      });
      return Response.json({ ok: true, device: dev }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return Response.json({ error: 'Operación no reconocida' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: 'Error en sincronización' }, { status: 500 });
  }
}
