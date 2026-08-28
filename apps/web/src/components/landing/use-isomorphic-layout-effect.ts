import { useEffect, useLayoutEffect } from 'react';

// useLayoutEffect emite un warning durante SSR; en el servidor caemos a useEffect.
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
