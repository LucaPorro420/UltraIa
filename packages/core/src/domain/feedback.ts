import type { Db } from '../db/client';

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
