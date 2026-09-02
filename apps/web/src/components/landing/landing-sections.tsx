'use client';

import { LazySection } from './LazySection';

type LandingSectionsProps = {
  user: { name?: string | null; email: string } | null;
};

// Load sections on-demand when they enter viewport
const importFeatures = () => import('@/components/landing/landing-features').then((m) => ({ default: m.LandingFeatures }));
const importDashboard = () => import('@/components/landing/landing-dashboard').then((m) => ({ default: m.LandingDashboard }));
const importEcosystem = () => import('@/components/landing/landing-ecosystem').then((m) => ({ default: m.LandingEcosystem }));
const importPillars = () => import('@/components/landing/landing-pillars').then((m) => ({ default: m.LandingPillars }));
const importCta = (user: LandingSectionsProps['user']) => import('@/components/landing/landing-cta').then((m) => ({ default: (props: any) => <m.LandingCta user={user} {...props} /> }));

export function LandingSections({ user }: LandingSectionsProps) {
  return (
    <>
      <LazySection importFn={importFeatures} rootMargin="300px" />
      <LazySection importFn={importDashboard} rootMargin="300px" />
      <LazySection importFn={importEcosystem} rootMargin="300px" />
      <LazySection importFn={importPillars} rootMargin="300px" />
      <LazySection importFn={() => importCta(user)} rootMargin="300px" />
    </>
  );
}
