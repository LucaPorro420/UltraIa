import type { Framework, Lesson, Level } from './types';
import { react } from './data/react';
import { next } from './data/next';
import { vue } from './data/vue';
import { angular } from './data/angular';
import { fastapi } from './data/fastapi';
import { django } from './data/django';
import { flask } from './data/flask';
import { springboot } from './data/springboot';
import { laravel } from './data/laravel';
import { svelte } from './data/svelte';
import { node } from './data/node';
import { typescript } from './data/typescript';
import { learningPaths } from './data/learning-paths';

// Orden canónico del roadmap (frontend → fullstack → backend → lenguaje).
export const frameworks: Framework[] = [
  react,
  next,
  vue,
  angular,
  svelte,
  node,
  typescript,
  fastapi,
  django,
  flask,
  springboot,
  laravel,
];

export function getFramework(id: string): Framework | undefined {
  return frameworks.find((f) => f.id === id);
}

export function getAllLessons(fw: Framework): Lesson[] {
  return fw.modules.flatMap((m) => m.lessons);
}

export interface LessonLocator {
  lesson: Lesson;
  moduleId: string;
  moduleTitle: string;
  index: number;
  total: number;
  prev?: Lesson;
  next?: Lesson;
}

export function findLesson(
  fw: Framework,
  lessonId: string,
): LessonLocator | undefined {
  const all = getAllLessons(fw);
  const idx = all.findIndex((l) => l.id === lessonId);
  if (idx === -1) return undefined;
  const mod = fw.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
  return {
    lesson: all[idx],
    moduleId: mod?.id ?? '',
    moduleTitle: mod?.title ?? '',
    index: idx,
    total: all.length,
    prev: idx > 0 ? all[idx - 1] : undefined,
    next: idx < all.length - 1 ? all[idx + 1] : undefined,
  };
}

export interface CourseStats {
  frameworks: number;
  lessons: number;
  byLevel: Record<Level, number>;
}

export function courseStats(): CourseStats {
  const all = frameworks.flatMap(getAllLessons);
  const byLevel: Record<Level, number> = { basico: 0, intermedio: 0, avanzado: 0 };
  for (const l of all) byLevel[l.level] += 1;
  return { frameworks: frameworks.length, lessons: all.length, byLevel };
}

// Slug estable para progress storage y URLs. Un lesson es único dentro de su framework.
export function lessonKey(frameworkId: string, lessonId: string): string {
  return `${frameworkId}/${lessonId}`;
}

export { learningPaths };
export type { LearningPath } from './data/learning-paths';
