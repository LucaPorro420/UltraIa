import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@ultraia/core';
import { ArrowLeft } from 'lucide-react';
import { FlashcardsClient } from './client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Flashcards - UltraIa',
  description: 'Sistema de tarjetas de estudio con repetición espaciada SM-2',
};

export default async function FlashcardsPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;

  if (deckId === 'overview') {
    const decks = await prisma.studyDeck.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: { _count: { select: { cards: true } } },
    });
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/study" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Volver a estudio
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Mazos de estudio (SRS)</h1>
        <p className="mt-1 text-sm text-neutral-500">SM-2 determinista · easeFactor 1.3-2.5 · deck overview</p>
        {decks.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border-muted bg-panel/50 p-8 text-center text-sm text-neutral-500">
            No hay mazos. Crea uno vía Prisma: <code className="font-mono">StudyDeck + StudyCard</code>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((d) => (
              <Link key={d.id} href={`/study/flashcards/${d.id}`} className="glass-panel card-glow-hover rounded-xl p-5">
                <h3 className="font-display text-sm font-semibold text-white">{d.name}</h3>
                <p className="mt-1 text-xs text-neutral-500">{d.description ?? d.sourceType} · {(d as any)._count.cards} cartas</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const deck = await prisma.studyDeck.findUnique({
    where: { id: deckId },
    include: {
      cards: {
        where: { nextReview: { lte: new Date() } },
        orderBy: { nextReview: 'asc' },
        take: 20,
      },
    },
  });

  if (!deck) notFound();

  const total = await prisma.studyCard.count({ where: { deckId } });
  const due = deck.cards.length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/study" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Volver a estudio
      </Link>

      <div className="mt-6 glass-panel rounded-xl p-5">
        <h1 className="font-display text-xl font-bold text-white">{deck.name}</h1>
        <p className="mt-1 text-sm text-neutral-400">{deck.description ?? `Mazo ${deck.sourceType}`}</p>
        <p className="mt-2 font-mono text-xs text-neutral-500">
          {due} pendientes · {total} totales · SM-2
        </p>
      </div>

      <div className="mt-6">
        <FlashcardsClient
          deckId={deck.id}
          cards={deck.cards.map((c) => ({
            id: c.id,
            front: c.front,
            back: c.back,
            tags: c.tags,
            easeFactor: c.easeFactor,
            intervalDays: c.intervalDays,
            repetitions: c.repetitions,
          }))}
        />
      </div>
    </div>
  );
}
