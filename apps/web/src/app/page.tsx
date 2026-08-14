import { optionalUser } from '@/lib/server/context';
import { MarketingHeader } from '@/components/marketing-header';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingFeatures } from '@/components/landing/landing-features';

export default async function LandingPage() {
  const user = await optionalUser();
  return (
    <main className="min-h-screen bg-canvas">
      <MarketingHeader user={user} />

      <LandingHero user={user} />
      <LandingFeatures />

      <footer className="mx-auto mt-28 max-w-5xl border-t border-neutral-800 px-6 pb-10 pt-8 text-center">
        <p className="font-mono text-xs text-neutral-600">
          UltraIa · AI creates AI, humans approve.
        </p>
        <p className="mt-2 font-mono text-[11px] text-neutral-700">
          v0.1 — agent generation · scoped API keys · eval-gated improvement pipeline
        </p>
      </footer>
    </main>
  );
}