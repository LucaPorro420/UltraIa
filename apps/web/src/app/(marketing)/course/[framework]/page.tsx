import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { frameworks, getFramework } from '@/course';
import { FrameworkView } from '@/components/course/framework-view';

export function generateStaticParams() {
  return frameworks.map((f) => ({ framework: f.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ framework: string }>;
}): Promise<Metadata> {
  const { framework } = await params;
  const fw = getFramework(framework);
  return {
    title: fw ? `${fw.name} · Curso` : 'Curso',
    description: fw?.tagline,
  };
}

export default async function FrameworkPage({
  params,
}: {
  params: Promise<{ framework: string }>;
}) {
  const { framework } = await params;
  const fw = getFramework(framework);
  if (!fw) notFound();

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <FrameworkView framework={fw} />
      </main>
    </div>
  );
}
