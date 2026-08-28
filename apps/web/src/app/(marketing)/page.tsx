import type { Metadata } from 'next';
import { optionalUser } from '@/lib/server/context';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingDashboard } from '@/components/landing/landing-dashboard';
import { LandingEcosystem } from '@/components/landing/landing-ecosystem';
import { LandingPillars } from '@/components/landing/landing-pillars';
import { LandingCta } from '@/components/landing/landing-cta';

export const metadata: Metadata = {
  title: 'UltraIa — Agentes de IA que se construyen solos',
  description:
    'Diseña, ejecuta y publica agentes autónomos con herramientas, memoria y bucles de mejora. Auto-publicación multicanal, OMAG audiovisual y cloud sin costo.',
  openGraph: {
    title: 'UltraIa — Agentes de IA que se construyen solos',
    description:
      'Describe tu idea y UltraIa la convierte en un equipo de agentes que construye, ejecuta y publica en todos lados.',
    type: 'website',
  },
};

export default async function LandingPage() {
  const user = await optionalUser();

  return (
    <>
      <main>
        <LandingHero user={user} />
        <LandingFeatures />
        <LandingDashboard />
        <LandingEcosystem />
        <LandingPillars />
        <LandingCta user={user} />
      </main>
    </>
  );
}
