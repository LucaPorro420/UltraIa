import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { frameworks, getFramework, findLesson } from '@/course';
import { LessonView } from '@/components/course/lesson-view';

export function generateStaticParams() {
  return frameworks.flatMap((f) =>
    f.modules.flatMap((m) => m.lessons.map((l) => ({ framework: f.id, lesson: l.id }))),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ framework: string; lesson: string }>;
}): Promise<Metadata> {
  const { framework, lesson } = await params;
  const fw = getFramework(framework);
  const loc = fw ? findLesson(fw, lesson) : undefined;
  return {
    title: loc ? `${loc.lesson.title} · ${fw?.name}` : 'Lección',
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ framework: string; lesson: string }>;
}) {
  const { framework, lesson } = await params;
  const fw = getFramework(framework);
  if (!fw) notFound();

  const loc = findLesson(fw, lesson);
  if (!loc) notFound();

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <LessonView
          frameworkId={fw.id}
          frameworkName={fw.name}
          moduleTitle={loc.moduleTitle}
          lesson={loc.lesson}
          prev={loc.prev ? { id: loc.prev.id, title: loc.prev.title } : undefined}
          next={loc.next ? { id: loc.next.id, title: loc.next.title } : undefined}
        />
      </main>
    </div>
  );
}
