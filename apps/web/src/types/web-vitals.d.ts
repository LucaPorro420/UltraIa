//! Type declarations for web-vitals package (CLS, FID, FCP, LCP, TTFB).
declare module 'web-vitals' {
  type Metric = {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    delta: number;
    id: string;
  };

  type MetricCallback = (metric: Metric) => void;

  export function onLCP(callback: MetricCallback): void;
  export function onINP(callback: MetricCallback): void;
  export function onCLS(callback: MetricCallback): void;
  export function onFCP(callback: MetricCallback): void;
  export function onTTFB(callback: MetricCallback): void;
}
