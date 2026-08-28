import type { Metadata } from 'next';
import { optionalUser } from '@/lib/server/context';
import { MarketingHeader } from '@/components/marketing-header';
import { SiteFooter } from '@/components/site-footer';
import { GalleryClient } from '@/components/gallery/gallery-client';

export const metadata: Metadata = {
  title: 'Galería · UltraIa',
  description: 'Biblioteca de prompts estilo Meigen: genera imágenes en un clic.',
};

export default async function GalleryPage() {
  const user = await optionalUser();
  return (
    <>
      <MarketingHeader user={user} />
      <main className="min-h-screen bg-canvas">
        <section className="neo-aura mx-auto max-w-5xl px-6 py-20">
          <header>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Galería de prompts
            </h1>
            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
              biblioteca estilo meigen · genera imágenes en un clic
            </p>
          </header>
          <GalleryClient />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
