import type { Metadata } from 'next';
import { optionalUser } from '@/lib/server/context';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingSections } from '@/components/landing/landing-sections';

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
        <LandingSections user={user} />
      </main>
    </>
  );
}
