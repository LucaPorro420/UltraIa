'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook to measure component render time.
 * Only logs in development.
 */
export function useRenderTime(componentName: string) {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    const duration = endTime - startTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      renderCount.current++;
      if (duration > 16) { // Only log slow renders (>16ms = below 60fps)
        console.log(
          `[Render] ${componentName}: ${duration.toFixed(2)}ms (render #${renderCount.current})`
        );
      }
    }
    
    startTime.current = performance.now();
  });
}

/**
 * Hook to measure async operation time.
 */
export function useAsyncTimer(operationName: string) {
  const startRef = useRef<number>(0);

  const start = () => {
    startRef.current = performance.now();
  };

  const end = () => {
    if (process.env.NODE_ENV === 'development' && startRef.current > 0) {
      const duration = performance.now() - startRef.current;
      console.log(`[Async] ${operationName}: ${duration.toFixed(2)}ms`);
    }
  };

  return { start, end };
}
