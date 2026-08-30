'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type Metric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
};

/**
 * Reports Core Web Vitals to /api/vitals endpoint.
 * 
 * Metrics tracked:
 * - LCP (Largest Contentful Paint) - loading
 * - INP (Interaction to Next Paint) - interactivity  
 * - CLS (Cumulative Layout Shift) - visual stability
 * - FCP (First Contentful Paint) - loading
 * - TTFB (Time to First Byte) - server response
 * - bfcache (Back/Forward Cache) - navigation
 */
export function WebVitalsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    const reportMetric = async (metric: Metric) => {
      try {
        // Add page context
        const body = JSON.stringify({
          ...metric,
          page: pathname,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        });

        // Use sendBeacon for non-blocking report
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/vitals', body);
        } else {
          // Fallback to fetch
          fetch('/api/vitals', {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
          }).catch(() => {
            // Silent fail - vitals reporting should never break the app
          });
        }
      } catch {
        // Silent fail
      }
    };

    // Import web-vitals dynamically (only in browser)
    import('web-vitals').then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
      onLCP(reportMetric);
      onINP(reportMetric);
      onCLS(reportMetric);
      onFCP(reportMetric);
      onTTFB(reportMetric);
    }).catch(() => {
      // web-vitals not available, skip
    });
  }, [pathname]);

  return null;
}
