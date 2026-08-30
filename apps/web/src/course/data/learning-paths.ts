import type { Level } from '../types';

// Recursos gratuitos verificados para conseguir empleo como programador
// Fuente: post de volkan.js (Instagram, 29/08/2026) - '5 recursos gratis para
// conseguir trabajo en lugar de pagar un bootcamp'. Solo 2 de 5 accesibles
// verificablemente por el muro de sesion de Instagram; el resto pendiente.
export interface LearningPath {
  id: string;
  title: string;
  description: string;
  provider: string;
  url: string;
  level: Level;
  duration: string;
  skills: string[];
  verified: boolean;
}

export const learningPaths: LearningPath[] = [
  {
    id: '30-days-of-python',
    title: '30 Days of Python',
    description:
      '30 dias de lecciones y ejercicios que terminan en web scraping, APIs y bases de datos.',
    provider: 'freeCodeCamp',
    url: 'https://www.freecodecamp.org/learn/scientific-computing-with-python/',
    level: 'basico',
    duration: '30 dias',
    skills: ['Python', 'web scraping', 'APIs', 'bases de datos'],
    verified: true,
  },
  {
    id: 'cs50-ai',
    title: 'CS50 AI',
    description:
      'Curso gratuito de Harvard donde construyes search algorithms y redes neuronales en Python.',
    provider: 'Harvard',
    url: 'https://cs50.harvard.edu/ai/',
    level: 'intermedio',
    duration: '12 semanas',
    skills: ['Python', 'algoritmos de busqueda', 'redes neuronales', 'IA'],
    verified: true,
  },
];

export function getLearningPath(id: string): LearningPath | undefined {
  return learningPaths.find((p) => p.id === id);
}

export function verifiedLearningPaths(): LearningPath[] {
  return learningPaths.filter((p) => p.verified);
}
