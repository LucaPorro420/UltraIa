// Learning Package - Main Entry Point
// 
// Core services for learning management, AI tutoring, and gamification

export { LearningDatabase, createLearningServices } from './learning';
export { AITutoringService } from './learning';
export { CourseImportService } from './learning';
export { LearningPathService, LEARNING_PATHS } from './learning';
export { GamificationService, ACHIEVEMENTS } from './learning';

// Re-export types
export type {
  Course,
  Lesson,
  Quiz,
  QuizQuestion,
  Project,
  UserProgress,
  UserLevel,
  Certificate,
  TutoringContext,
  TutoringResponse,
  LearningPath,
  Achievement,
} from '../core/types';