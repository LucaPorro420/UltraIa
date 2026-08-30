// Esquema de datos del curso de programación (roadmapProgrammingTotally).
// Contenido data-driven: cada framework es un módulo reutilizable importado por la UI
// y potencialmente por el sistema de publicación. Sin dependencias de servidor.

export type Level = 'basico' | 'intermedio' | 'avanzado';

export interface CodeExample {
  lang: string;
  code: string;
  caption?: string;
}

export interface Lesson {
  id: string;
  title: string;
  level: Level;
  durationMin: number;
  summary: string;
  topics: string[];
  // Texto plano: párrafos separados por \n\n. Sin markdown para evitar deps.
  content: string;
  examples?: CodeExample[];
  prerequisites?: string[];
}

export interface Module {
  id: string;
  title: string;
  level: Level;
  summary: string;
  lessons: Lesson[];
}

export type FrameworkCategory = 'frontend' | 'backend' | 'fullstack' | 'language';

export interface Framework {
  id: string;
  name: string;
  category: FrameworkCategory;
  icon: string;
  color: string;
  tagline: string;
  description: string;
  modules: Module[];
}

export const LEVEL_LABELS: Record<Level, string> = {
  basico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export const LEVEL_ORDER: Level[] = ['basico', 'intermedio', 'avanzado'];

export const CATEGORY_LABELS: Record<FrameworkCategory, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Fullstack',
  language: 'Lenguaje',
};
