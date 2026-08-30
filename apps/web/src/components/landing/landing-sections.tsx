'use client';

import dynamic from 'next/dynamic';

type LandingSectionsProps = {
  user: { name?: string | null; email: string } | null;
};

// Lazy load below-the-fold sections to reduce initial JS bundle
const LandingFeatures = dynamic(
  () => import('@/components/landing/landing-features').then((m) => ({ default: m.LandingFeatures })),
  { ssr: false },
);
const LandingDashboard = dynamic(
  () => import('@/components/landing/landing-dashboard').then((m) => ({ default: m.LandingDashboard })),
  { ssr: false },
);
const LandingEcosystem = dynamic(
  () => import('@/components/landing/landing-ecosystem').then((m) => ({ default: m.LandingEcosystem })),
  { ssr: false },
);
const LandingPillars = dynamic(
  () => import('@/components/landing/landing-pillars').then((m) => ({ default: m.LandingPillars })),
  { ssr: false },
);
const LandingCta = dynamic(
  () => import('@/components/landing/landing-cta').then((m) => ({ default: m.LandingCta })),
  { ssr: false },
);

export function LandingSections({ user }: LandingSectionsProps) {
  return (
    <>
      <LandingFeatures />
      <LandingDashboard />
      <LandingEcosystem />
      <LandingPillars />
      <LandingCta user={user} />
    </>
  );
}
