import type { Db } from '../db/client';
import { createHash } from 'node:crypto';

export type LearningSignalStatus = 'APPROVED' | 'PENDING' | 'REJECTED';
export type LearningSignalKind = 'positive' | 'negative' | 'ambiguous';

export interface NormalizedFeedback {
  rating: 'GOOD' | 'BAD';
  signal: string;
  kind: LearningSignalKind;
  status: LearningSignalStatus;
  fingerprint: string;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/**
 * Converts user feedback into a safe, reviewable learning signal.
 * Empty or generic BAD feedback stays pending rather than driving an automatic change.
 */
export function normalizeFeedback(input: { rating: 'GOOD' | 'BAD'; critique?: string }): NormalizedFeedback {
  const signal = normalizeText(input.critique ?? '');
  const ambiguous = input.rating === 'BAD' && (signal.length < 8 || /^(bad|wrong|no|n\/a|ok|meh)[.! ]*$/i.test(signal));
  const kind: LearningSignalKind = ambiguous ? 'ambiguous' : input.rating === 'GOOD' ? 'positive' : 'negative';
  const status: LearningSignalStatus = ambiguous ? 'PENDING' : 'APPROVED';
  const fingerprint = createHash('sha256').update(`${input.rating}:${signal}`, 'utf8').digest('hex');
  return { rating: input.rating, signal, kind, status, fingerprint };
}

export function deduplicateFeedback(
  feedback: Array<{ rating: 'GOOD' | 'BAD'; critique?: string; source?: string }>,
): Array<NormalizedFeedback & { occurrenceCount: number; sources: string[] }> {
  const grouped = new Map<string, NormalizedFeedback & { occurrenceCount: number; sources: string[] }>();
  for (const item of feedback) {
    const normalized = normalizeFeedback(item);
    const existing = grouped.get(normalized.fingerprint);
    if (existing) {
      existing.occurrenceCount++;
      if (item.source && !existing.sources.includes(item.source)) existing.sources.push(item.source);
    } else {
      grouped.set(normalized.fingerprint, {
        ...normalized,
        occurrenceCount: 1,
        sources: item.source ? [item.source] : [],
      });
    }
  }
  return [...grouped.values()];
}

/** Curates persisted feedback without making a model call. */
export async function curateFeedback(db: Db, blueprintId: string): Promise<{
  approved: number;
  pending: number;
  rejected: number;
  deduplicated: number;
}> {
  const rows = await db.feedback.findMany({
    where: { conversation: { blueprintId } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, rating: true, critique: true },
  });
  const signals = deduplicateFeedback(rows.map((row) => ({
    rating: row.rating as 'GOOD' | 'BAD',
    critique: row.critique ?? undefined,
    source: row.id,
  })));
  for (const signal of signals) {
    await db.learningSignal.upsert({
      where: { blueprintId_fingerprint: { blueprintId, fingerprint: signal.fingerprint } },
      create: {
        blueprintId,
        fingerprint: signal.fingerprint,
        sourceFeedbackId: rows.find((row) => normalizeFeedback({ rating: row.rating as 'GOOD' | 'BAD', critique: row.critique ?? undefined }).fingerprint === signal.fingerprint)?.id,
        source: 'feedback',
        kind: signal.kind,
        status: signal.status,
        signal: signal.signal,
        occurrenceCount: signal.occurrenceCount,
        originalSource: signal.sources.join(','),
      },
      update: {
        kind: signal.kind,
        status: signal.status,
        signal: signal.signal,
        occurrenceCount: signal.occurrenceCount,
        originalSource: signal.sources.join(','),
      },
    });
  }
  return {
    approved: signals.filter((signal) => signal.status === 'APPROVED').length,
    pending: signals.filter((signal) => signal.status === 'PENDING').length,
    rejected: signals.filter((signal) => signal.status === 'REJECTED').length,
    deduplicated: rows.length - signals.length,
  };
}

export async function recordFeedback(
  db: Db,
  input: { conversationId: string; messageSeq: number; rating: 'GOOD' | 'BAD'; critique?: string },
): Promise<void> {
  if (input.rating !== 'GOOD' && input.rating !== 'BAD') throw new Error('Invalid rating');
  const message = await db.message.findUnique({
    where: { conversationId_sequence: { conversationId: input.conversationId, sequence: input.messageSeq } },
  });
  if (!message) throw new Error('Message not found');
  if (message.role !== 'assistant') throw new Error('Feedback is only allowed on assistant messages');

  await db.feedback.upsert({
    where: { conversationId_messageSeq: { conversationId: input.conversationId, messageSeq: input.messageSeq } },
    create: {
      conversationId: input.conversationId,
      messageSeq: input.messageSeq,
      rating: input.rating,
      critique: input.critique?.trim() || null,
    },
    update: { rating: input.rating, critique: input.critique?.trim() || null },
  });
}

export async function getFeedbackStats(db: Db, blueprintId: string): Promise<{ good: number; bad: number }> {
  const rows = await db.feedback.groupBy({
    by: ['rating'],
    where: { conversation: { blueprintId } },
    _count: { _all: true },
  });
  const good = rows.find((r) => r.rating === 'GOOD')?._count._all ?? 0;
  const bad = rows.find((r) => r.rating === 'BAD')?._count._all ?? 0;
  return { good, bad };
}
