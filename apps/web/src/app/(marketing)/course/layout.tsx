'use client';

import type { ReactNode } from 'react';
import { CourseProgressProvider } from '@/components/course/progress-provider';

// Provee el contexto de progreso (localStorage) a todas las páginas del curso.
export default function CourseLayout({ children }: { children: ReactNode }) {
  return <CourseProgressProvider>{children}</CourseProgressProvider>;
}
