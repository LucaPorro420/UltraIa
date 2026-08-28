import Link from 'next/link';
import { redirect } from 'next/navigation';
import { optionalUser } from '@/lib/server/context';
import { MarketingHeader } from '@/components/marketing-header';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingFeatures } from '@/components/landing/landing-features';

export default async function LandingPage() {
  const user = await optionalUser();
  // Un usuario ya autenticado que vuelve a la raíz entra directo al app:
  // evita la sensación de "quedarse trabado en la landing".
  if (user) redirect('/dashboard');
  return (
    <main className="min-h-screen bg-canvas">
      <MarketingHeader user={user} />

      <LandingHero user={user} />
      <LandingFeatures />

      <footer className="mx-auto mt-28 max-w-5xl border-t border-border-subtle px-6 pb-10 pt-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-mono text-xs text-neutral-500">
            UltraIa · AI creates AI, humans approve.
          </p>
          <p className="font-mono text-[11px] text-neutral-600">
            v1.0 — agent generation · scoped API keys · eval-gated improvement pipeline
          </p>
          <nav className="mt-3 flex flex-wrap items-center justify-center gap-5 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
            <Link href="/explore" className="transition-colors duration-200 hover:text-neutral-200">
              Explore
            </Link>
            <Link href="/recursos" className="transition-colors duration-200 hover:text-neutral-200">
              Recursos
            </Link>
            <Link href="/register" className="transition-colors duration-200 hover:text-neutral-200">
              Get started
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}