'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface LazySectionProps {
  /** Dynamic import function that returns the component */
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  /** Fallback to show while loading */
  fallback?: ReactNode;
  /** Root margin for intersection observer (e.g., '100px') */
  rootMargin?: string;
  /** Threshold for intersection (0-1) */
  threshold?: number;
  /** Additional className for the wrapper */
  className?: string;
  /** Props to pass to the loaded component */
  componentProps?: Record<string, any>;
}

/**
 * LazySection - Loads a component only when it enters the viewport.
 * Uses IntersectionObserver to trigger dynamic import on scroll.
 */
export function LazySection({
  importFn,
  fallback = <div className="h-32 w-full animate-pulse bg-panel rounded-xl border border-border-subtle" />,
  rootMargin = '200px',
  threshold = 0.1,
  className = '',
  componentProps = {},
}: LazySectionProps) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasLoaded) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Trigger dynamic import when element enters viewport
            importFn().then((module) => {
              setComponent(() => module.default);
              setHasLoaded(true);
            });
            observerRef.current?.disconnect();
          }
        });
      },
      { rootMargin, threshold }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [importFn, hasLoaded, rootMargin, threshold]);

  return (
    <div ref={elementRef} className={className}>
      {Component ? <Component {...componentProps} /> : fallback}
    </div>
  );
}