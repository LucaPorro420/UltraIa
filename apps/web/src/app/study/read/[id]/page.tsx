import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@ultraia/core';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lectura - UltraIa',
  description: 'Visualizador de lectura bilingüe',
};

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // try bilingual document first, then lesson fallback
  let doc = await prisma.bilingualDocument.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { versions: true },
  });

  let lessonFallback: any = null;
  if (!doc) {
    lessonFallback = await prisma.learningLesson.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, title: true, content: true, bilingualContent: true, module: { select: { course: { select: { title: true, id: true } } } } },
    });
    if (!lessonFallback) notFound();
  }

  const versions = doc?.versions ?? [];
  const esVersion = versions.find((v) => v.language === 'es') ?? versions.find((v) => v.isPrimary) ?? versions[0];
  const arVersion = versions.find((v) => v.language === 'ar');
  const enVersion = versions.find((v) => v.language === 'en');

  const title = doc?.title ?? lessonFallback?.title ?? 'Lectura';
  const fallbackContent = lessonFallback
    ? { es: lessonFallback.content, ar: (lessonFallback.bilingualContent as any)?.ar ?? '', en: (lessonFallback.bilingualContent as any)?.en ?? '' }
    : null;

  const leftContent = esVersion?.content ?? fallbackContent?.es ?? '<p>Sin contenido</p>';
  const rightContent = arVersion?.content ?? enVersion?.content ?? fallbackContent?.ar ?? fallbackContent?.en ?? '<p>—</p>';
  const leftLang = esVersion?.language ?? 'es';
  const rightLang = arVersion ? 'ar' : enVersion ? 'en' : 'ar';

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href={lessonFallback ? `/study/lesson/${lessonFallback.id}` : '/study'} className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> {lessonFallback ? 'Volver a lección' : 'Volver a estudio'}
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
        {doc && <p className="mt-1 font-mono text-xs text-neutral-500">{doc.sourceType} · {doc.slug}</p>}
      </div>

      {/* Bilingual reader using globals-study.css */}
      <div className="bilingual-reader mt-6" style={{ height: '70vh' }}>
        <div className="bilingual-toolbar">
          <div className="toolbar-group">
            <span className="font-mono text-xs text-neutral-500">Panel izquierdo</span>
            <span className="lang-badge">{leftLang}</span>
            {esVersion?.translationSource && <span className="translation-badge">{esVersion.translationSource}</span>}
          </div>
          <div className="toolbar-group presets">
            <button className="preset-btn active" aria-label="50-50"><span className="preset-visual" /></button>
            <button className="preset-btn" aria-label="60-40"><span className="preset-visual" style={{ ['--left' as any]: '60%', ['--right' as any]: '40%' }} /></button>
          </div>
          <div className="toolbar-group">
            <span className="font-mono text-xs text-neutral-500">Panel derecho</span>
            <span className="lang-badge">{rightLang}</span>
            {arVersion?.translationSource && <span className="translation-badge">{arVersion.translationSource}</span>}
          </div>
        </div>

        <div className="bilingual-panels">
          <div className="bilingual-panel left" style={{ flex: 1 }}>
            <div className="panel-header">
              <span className="lang-badge">{leftLang}</span>
              <span className="text-xs text-neutral-500">{leftLang === 'es' ? 'Español' : leftLang}</span>
            </div>
            <div className="panel-content" dangerouslySetInnerHTML={{ __html: leftContent }} />
          </div>

          <div className="bilingual-divider">
            <div className="divider-handle" />
          </div>

          <div className="bilingual-panel right" style={{ flex: 1 }}>
            <div className="panel-header">
              <span className="lang-badge">{rightLang}</span>
              <span className="text-xs text-neutral-500" dir={rightLang === 'ar' ? 'rtl' : 'ltr'}>
                {rightLang === 'ar' ? 'العربية' : rightLang}
              </span>
            </div>
            <div className="panel-content" dir={rightLang === 'ar' ? 'rtl' : 'ltr'} dangerouslySetInnerHTML={{ __html: rightContent }} />
          </div>
        </div>
      </div>

      {doc && versions.length > 1 && (
        <details className="bilingual-diff mt-4">
          <summary>Ver diferencias ({versions.length} versiones)</summary>
          <div className="diff-grid">
            {versions.slice(0, 2).map((v) => (
              <div key={v.id} className="diff-col">
                <h4>{v.language} {v.isPrimary ? '(principal)' : ''}</h4>
                <pre>{v.content.slice(0, 800)}</pre>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
