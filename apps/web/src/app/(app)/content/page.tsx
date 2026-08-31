import type { Metadata } from 'next';
import { ALL_CONTENT_SOURCES } from '@ultraia/core';
import { ContentClient } from '@/components/content/content-client';

export const metadata: Metadata = {
  title: 'Generador de Contenido · UltraIa',
  description:
    'Genera contenido derivado (blog, guiones, captions, hilos) desde ebooks y cursos. Determinista, keyless, bilingüe es/ar.',
};

export default function ContentPage() {
  const sources = ALL_CONTENT_SOURCES.map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category || '',
    level: s.level || '',
    topics: s.topics,
    chapters: s.chapters?.length || 0,
    lessons: s.lessons?.length || 0,
  }));

  return <ContentClient sources={sources} />;
}
