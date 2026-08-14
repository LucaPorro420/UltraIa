import { requireUser } from '@/lib/server/context';
import { GalleryClient } from '@/components/gallery/gallery-client';

export default async function GalleryPage() {
  await requireUser();
  return (
    <div>
      <header>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-white">
          Galería de prompts
        </h1>
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          biblioteca estilo meigen · genera imágenes en un clic
        </p>
      </header>
      <GalleryClient />
    </div>
  );
}