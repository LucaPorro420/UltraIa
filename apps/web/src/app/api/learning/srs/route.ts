/**
 * LEARNING SRS — Sistema de Repetición Espaciada (REAL con Prisma + SM-2)
 * GET  /api/learning/srs?deckId=xxx — due cards + stats
 * POST /api/learning/srs { action, deckId, front, back, cardId, quality }
 */
import { prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';
import { calculateNextReview } from '@ultraia/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get('deckId');

  if (!deckId || deckId === 'overview') {
    const decks = await prisma.studyDeck.findMany({
      take: 20,
      include: { _count: { select: { cards: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    const dueCounts = await Promise.all(
      decks.map((d) => prisma.studyCard.count({ where: { deckId: d.id, nextReview: { lte: new Date() } } }))
    );
    return Response.json(
      {
        decks: decks.map((d, i) => ({ ...d, due: dueCounts[i] })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const deck = await prisma.studyDeck.findUnique({ where: { id: deckId } });
  if (!deck) return Response.json({ error: 'deck not found' }, { status: 404 });

  const total = await prisma.studyCard.count({ where: { deckId } });
  const due = await prisma.studyCard.count({ where: { deckId, nextReview: { lte: new Date() } } });
  const cards = await prisma.studyCard.findMany({
    where: { deckId, nextReview: { lte: new Date() } },
    orderBy: { nextReview: 'asc' },
    take: 20,
  });

  return Response.json({ deckId, totalCards: total, dueForReview: due, cards }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request as any).catch(() => null);
  // allow anon for now but prefer auth
  try {
    const body = await request.json();
    const { action, deckId, front, back, cardId, quality, easeFactor, intervalDays, repetitions } = body as any;

    if (action === 'addCard' && deckId && front && back) {
      const card = await prisma.studyCard.create({
        data: {
          deckId,
          front,
          back,
          frontLang: 'es',
          backLang: 'es',
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          nextReview: new Date(),
        },
      });
      return Response.json({ ok: true, card }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'reviewCard' && cardId && typeof quality === 'number') {
      const card = await prisma.studyCard.findUnique({ where: { id: cardId } });
      if (!card) return Response.json({ error: 'card not found' }, { status: 404 });

      const q = Math.max(0, Math.min(5, Math.round(quality)));
      const next = calculateNextReview(
        { easeFactor: card.easeFactor, intervalDays: card.intervalDays, repetitions: card.repetitions, nextReview: card.nextReview },
        { quality: q }
      );

      const updated = await prisma.studyCard.update({
        where: { id: cardId },
        data: {
          easeFactor: next.easeFactor,
          intervalDays: next.intervalDays,
          repetitions: next.repetitions,
          nextReview: next.nextReview,
          lastReviewed: new Date(),
        },
      });

      await prisma.studyReview.create({
        data: {
          cardId,
          quality: q,
          previousEase: card.easeFactor,
          previousInterval: card.intervalDays,
          previousRepetitions: card.repetitions,
        },
      });

      return Response.json({ ok: true, card: updated, next }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // legacy simple review (compat with old client)
    if (cardId && typeof quality === 'number' && !action) {
      const card = await prisma.studyCard.findUnique({ where: { id: cardId } });
      if (!card) return Response.json({ error: 'card not found' }, { status: 404 });
      const q = Math.max(0, Math.min(5, Math.round(quality)));
      const next = calculateNextReview(
        { easeFactor: easeFactor ?? card.easeFactor, intervalDays: intervalDays ?? card.intervalDays, repetitions: repetitions ?? card.repetitions, nextReview: new Date() },
        { quality: q }
      );
      const updated = await prisma.studyCard.update({
        where: { id: cardId },
        data: { easeFactor: next.easeFactor, intervalDays: next.intervalDays, repetitions: next.repetitions, nextReview: next.nextReview, lastReviewed: new Date() },
      });
      await prisma.studyReview.create({ data: { cardId, quality: q, previousEase: card.easeFactor, previousInterval: card.intervalDays, previousRepetitions: card.repetitions } });
      return Response.json({ ok: true, card: updated, next }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return Response.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: 'Error en SRS' }, { status: 500 });
  }
}
