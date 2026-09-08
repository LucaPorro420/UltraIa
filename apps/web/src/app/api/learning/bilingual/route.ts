/**
 * LEARNING BILINGUAL — Documentos bilingües (REAL con Prisma)
 * GET  /api/learning/bilingual?docId=xxx — fetch document + versions + user pref
 * POST /api/learning/bilingual { action, docId, language, content, leftLanguage, ... }
 */
import { prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { bilingualHash } from '@ultraia/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('docId');
  const user = await getCurrentUser(request as any).catch(() => null);

  if (!docId) {
    const docs = await prisma.bilingualDocument.findMany({ take: 20, orderBy: { updatedAt: 'desc' }, include: { _count: { select: { versions: true } } } });
    return Response.json({ docs }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const doc = await prisma.bilingualDocument.findFirst({
    where: { OR: [{ id: docId }, { slug: docId }] },
    include: { versions: true },
  });
  if (!doc) return Response.json({ error: 'document not found' }, { status: 404 });

  let pref = null;
  if (user) {
    pref = await prisma.bilingualUserPref.findUnique({
      where: { userId_documentId: { userId: user.id, documentId: doc.id } },
    });
  }

  return Response.json({ doc, versions: doc.versions, pref }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request as any).catch(() => null);
  try {
    const body = await request.json();
    const { action, docId, language, content, leftLanguage, rightLanguage, preset, syncScroll } = body as any;

    if (action === 'updateLanguage' && docId && language && content) {
      const hash = bilingualHash(content);
      const v = await prisma.bilingualVersion.upsert({
        where: { documentId_language: { documentId: docId, language } },
        update: { content, contentHash: hash },
        create: { documentId: docId, language, content, contentHash: hash },
      });
      return Response.json({ ok: true, version: v }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'syncVersion' && docId) {
      const versions = await prisma.bilingualVersion.findMany({ where: { documentId: docId } });
      return Response.json({ ok: true, versions }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'savePref' && docId && user) {
      const pref = await prisma.bilingualUserPref.upsert({
        where: { userId_documentId: { userId: user.id, documentId: docId } },
        update: { leftLanguage, rightLanguage, preset, syncScroll },
        create: { userId: user.id, documentId: docId, leftLanguage: leftLanguage ?? 'es', rightLanguage: rightLanguage ?? 'ar', preset, syncScroll },
      });
      return Response.json({ ok: true, pref }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return Response.json({ error: 'Acción no reconocida o falta auth' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
