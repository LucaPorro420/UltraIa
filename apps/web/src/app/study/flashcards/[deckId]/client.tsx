'use client';

import { useState } from 'react';

type Card = {
  id: string;
  front: string;
  back: string;
  tags: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export function FlashcardsClient({ cards: initialCards, deckId }: { cards: Card[]; deckId: string }) {
  const [cards, setCards] = useState(initialCards);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);

  const current = cards[idx];

  async function review(quality: number) {
    if (!current || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/learning/srs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reviewCard', cardId: current.id, quality }),
      });
      const j = await res.json().catch(() => null);
      // optimistic: remove card from queue if quality >=3, else keep
      if (quality >= 3) {
        setCards((prev) => prev.filter((c) => c.id !== current.id));
        setIdx(0);
      } else {
        // move to end
        setCards((prev) => [...prev.slice(1), prev[0]]);
      }
      setFlipped(false);
    } finally {
      setBusy(false);
    }
  }

  if (!current) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-10 text-center">
        <p className="font-display text-lg font-semibold text-emerald-300">¡Al día!</p>
        <p className="mt-1 text-sm text-neutral-400">No hay cartas pendientes para este mazo.</p>
        <p className="mt-2 font-mono text-xs text-neutral-500">{cards.length} cartas restantes · deck {deckId.slice(0, 8)}</p>
      </div>
    );
  }

  return (
    <div className="srs-review">
      <div className="srs-card">
        <div className="srs-card-header">
          <span className="srs-card-title">Carta {idx + 1} / {cards.length}</span>
          <span className="srs-card-stats">
            <span>EF {current.easeFactor.toFixed(2)}</span>
            <span>{current.intervalDays}d</span>
            <span>{current.repetitions} rep</span>
          </span>
        </div>

        <div className="flashcard mx-auto mt-4 cursor-pointer" onClick={() => setFlipped((v) => !v)}>
          <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
            <div className="flashcard-face flashcard-front">
              <div>
                <p className="flashcard-content">{current.front}</p>
                <p className="flashcard-hint">clic para ver respuesta</p>
              </div>
            </div>
            <div className="flashcard-face flashcard-back">
              <p className="flashcard-content">{current.back}</p>
            </div>
          </div>
        </div>

        <div className="srs-quality-buttons">
          {[
            { q: 0, label: 'Olvidada' },
            { q: 3, label: 'Difícil' },
            { q: 5, label: 'Fácil' },
          ].map((b) => (
            <button key={b.q} className="srs-quality-btn" disabled={busy || !flipped} onClick={() => review(b.q)}>
              <span className="srs-quality-number">{b.q}</span>
              <span className="srs-quality-label">{b.label}</span>
            </button>
          ))}
        </div>
        {!flipped && <p className="px-4 pb-3 text-center font-mono text-xs text-neutral-500">Voltea la carta para calificar (SM-2)</p>}
      </div>
    </div>
  );
}
