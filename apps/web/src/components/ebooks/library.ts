'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ultraia_ebook_library';

function readOwned(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeOwned(ids: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/**
 * Biblioteca local del usuario (sin backend/Stripe por ahora).
 * Persiste en localStorage para una experiencia de "compra" funcional y demo.
 * El pago real con Stripe + tabla Purchase queda como seguimiento (requiere migración + claves).
 */
export function useEbookLibrary() {
  const [owned, setOwned] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOwned(readOwned());
    setReady(true);
  }, []);

  const add = useCallback((id: string) => {
    setOwned((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeOwned(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setOwned((prev) => {
      const next = prev.filter((x) => x !== id);
      writeOwned(next);
      return next;
    });
  }, []);

  const isOwned = useCallback((id: string) => owned.includes(id), [owned]);

  return { owned, isOwned, add, remove, ready };
}
