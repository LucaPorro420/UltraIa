import { describe, expect, it } from 'vitest';
import { getFeedbackStats, recordFeedback } from './feedback';
import type { Db } from '../db/client';

function fakeDb() {
  const messages = [{ conversationId: 'c1', sequence: 1, role: 'assistant' }];
  const conversations = [{ id: 'c1', blueprintId: 'bp1' }];
  const feedbacks: any[] = [];

  const db = {
    message: {
      findUnique: async ({ where }: any) =>
        messages.find(
          (m) =>
            m.conversationId === where.conversationId_sequence.conversationId &&
            m.sequence === where.conversationId_sequence.sequence,
        ) ?? null,
    },
    feedback: {
      upsert: async ({ where, create, update }: any) => {
        let f = feedbacks.find(
          (x) =>
            x.conversationId === where.conversationId_messageSeq.conversationId &&
            x.messageSeq === where.conversationId_messageSeq.messageSeq,
        );
        if (f) {
          Object.assign(f, update);
        } else {
          f = {
            id: `f${feedbacks.length + 1}`,
            ...create,
            conversation: conversations.find((c) => c.id === create.conversationId),
          };
          feedbacks.push(f);
        }
        return f;
      },
      groupBy: async ({ where }: any) => {
        const counts: Record<string, number> = {};
        for (const f of feedbacks) {
          if (where?.conversation?.blueprintId && f.conversation?.blueprintId !== where.conversation.blueprintId) {
            continue;
          }
          counts[f.rating] = (counts[f.rating] ?? 0) + 1;
        }
        return Object.entries(counts).map(([rating, _all]) => ({ rating, _count: { _all } }));
      },
    },
  };
  return db as unknown as Db;
}

describe('feedback', () => {
  it('records GOOD feedback on an assistant message', async () => {
    const db = fakeDb();
    await recordFeedback(db, { conversationId: 'c1', messageSeq: 1, rating: 'GOOD', critique: '  nice  ' });
    const stats = await getFeedbackStats(db, 'bp1');
    expect(stats).toEqual({ good: 1, bad: 0 });
  });

  it('rejects invalid ratings', async () => {
    const db = fakeDb();
    await expect(
      recordFeedback(db, { conversationId: 'c1', messageSeq: 1, rating: 'MEH' as any }),
    ).rejects.toThrow();
  });

  it('rejects feedback on missing messages', async () => {
    const db = fakeDb();
    await expect(
      recordFeedback(db, { conversationId: 'missing', messageSeq: 1, rating: 'GOOD' }),
    ).rejects.toThrow();
  });

  it('rejects feedback on non-assistant messages', async () => {
    const db = fakeDb();
    await expect(
      recordFeedback(db, { conversationId: 'c1', messageSeq: 5, rating: 'GOOD' }),
    ).rejects.toThrow();
  });

  it('counts good and bad separately', async () => {
    const db = fakeDb();
    await recordFeedback(db, { conversationId: 'c1', messageSeq: 1, rating: 'GOOD' });
    await recordFeedback(db, { conversationId: 'c1', messageSeq: 1, rating: 'BAD', critique: 'wrong' });
    const stats = await getFeedbackStats(db, 'bp1');
    expect(stats).toEqual({ good: 0, bad: 1 });
  });

  it('ignores feedback from other blueprints', async () => {
    const db = fakeDb();
    await recordFeedback(db, { conversationId: 'c1', messageSeq: 1, rating: 'GOOD' });
    const stats = await getFeedbackStats(db, 'other');
    expect(stats).toEqual({ good: 0, bad: 0 });
  });
});
