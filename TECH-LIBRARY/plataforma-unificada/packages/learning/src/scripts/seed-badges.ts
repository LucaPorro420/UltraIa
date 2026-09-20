#!/usr/bin/env tsx
/**
 * Pobla la base de datos con badges/logros predefinidos
 */

import { LearningDatabase } from '../learning';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'learning.db');

async function seedBadges() {
  console.log('🏅 Poblando badges/logros...');
  
  const db = LearningDatabase.getInstance(DB_PATH);
  const sqlite = db.getDb();
  
  // Tabla de badges
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL,
      xp_reward INTEGER DEFAULT 0,
      condition_type TEXT NOT NULL,
      condition_value INTEGER,
      condition_field TEXT,
      rarity TEXT DEFAULT 'common',
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS user_badges (
      user_id TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, badge_id),
      FOREIGN KEY (badge_id) REFERENCES badges(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
  `);
  
  const badges = [
    // === INICIO / PROGRESO ===
    {
      id: 'first_lesson',
      name: 'Primer Paso',
      description: 'Completa tu primera lección',
      icon: '🌱',
      category: 'progress',
      xp_reward: 50,
      condition_type: 'lessons_completed',
      condition_value: 1,
      condition_field: 'lessons_completed',
      rarity: 'common',
    },
    {
      id: 'lessons_10',
      name: 'Estudiante Dedicado',
      description: 'Completa 10 lecciones',
      icon: '📚',
      category: 'progress',
      xp_reward: 100,
      condition_type: 'lessons_completed',
      condition_value: 10,
      condition_field: 'lessons_completed',
      rarity: 'common',
    },
    {
      id: 'lessons_50',
      name: 'Erudito',
      description: 'Completa 50 lecciones',
      icon: '🎓',
      category: 'progress',
      xp_reward: 500,
      condition_type: 'lessons_completed',
      condition_value: 50,
      condition_field: 'lessons_completed',
      rarity: 'rare',
    },
    {
      id: 'lessons_100',
      name: 'Polímata',
      description: 'Completa 100 lecciones',
      icon: '🧠',
      category: 'progress',
      xp_reward: 1000,
      condition_type: 'lessons_completed',
      condition_value: 100,
      condition_field: 'lessons_completed',
      rarity: 'epic',
    },
    
    // === QUIZZES ===
    {
      id: 'first_quiz',
      name: 'Quiz Master',
      description: 'Aprueba tu primer quiz al 100%',
      icon: '🏆',
      category: 'quiz',
      xp_reward: 100,
      condition_type: 'perfect_quiz',
      condition_value: 1,
      condition_field: 'perfect_quizzes',
      rarity: 'common',
    },
    {
      id: 'quiz_streak_5',
      name: 'Racha Perfecta',
      description: '5 quizzes perfectos seguidos',
      icon: '🔥',
      category: 'quiz',
      xp_reward: 250,
      condition_type: 'perfect_quiz_streak',
      condition_value: 5,
      condition_field: 'perfect_quiz_streak',
      rarity: 'rare',
    },
    {
      id: 'quizzes_25',
      name: 'Examinador',
      description: 'Completa 25 quizzes',
      icon: '📝',
      category: 'quiz',
      xp_reward: 250,
      condition_type: 'quizzes_completed',
      condition_value: 25,
      condition_field: 'quizzes_completed',
      rarity: 'common',
    },
    
    // === RACHAS ===
    {
      id: 'streak_3',
      name: 'Constancia',
      description: 'Mantén una racha de 3 días',
      icon: '🔥',
      category: 'streak',
      xp_reward: 50,
      condition_type: 'streak_days',
      condition_value: 3,
      condition_field: 'streak',
      rarity: 'common',
    },
    {
      id: 'streak_7',
      name: 'Una Semana',
      description: 'Mantén una racha de 7 días',
      icon: '🔥🔥',
      category: 'streak',
      xp_reward: 200,
      condition_type: 'streak_days',
      condition_value: 7,
      condition_field: 'streak',
      rarity: 'rare',
    },
    {
      id: 'streak_30',
      name: 'Un Mes',
      description: 'Mantén una racha de 30 días',
      icon: '🔥🔥🔥',
      category: 'streak',
      xp_reward: 500,
      condition_type: 'streak_days',
      condition_value: 30,
      condition_field: 'streak',
      rarity: 'epic',
    },
    {
      id: 'streak_100',
      name: 'Centurión',
      description: 'Mantén una racha de 100 días',
      icon: '💯',
      category: 'streak',
      xp_reward: 2000,
      condition_type: 'streak_days',
      condition_value: 100,
      condition_field: 'streak',
      rarity: 'legendary',
    },
    
    // === CURSOS ===
    {
      id: 'first_course',
      name: 'Graduado',
      description: 'Completa tu primer curso al 100%',
      icon: '🎓',
      category: 'course',
      xp_reward: 500,
      condition_type: 'course_completed',
      condition_value: 1,
      condition_field: 'courses_completed',
      rarity: 'common',
    },
    {
      id: 'courses_5',
      name: 'Polímata',
      description: 'Completa 5 cursos',
      icon: '📚',
      category: 'course',
      xp_reward: 1000,
      condition_type: 'course_completed',
      condition_value: 5,
      condition_field: 'courses_completed',
      rarity: 'rare',
    },
    {
      id: 'courses_10',
      name: 'Experto',
      description: 'Completa 10 cursos',
      icon: '🏛️',
      category: 'course',
      xp_reward: 2500,
      condition_type: 'course_completed',
      condition_value: 10,
      condition_field: 'courses_completed',
      rarity: 'epic',
    },
    
    // === PROYECTOS ===
    {
      id: 'first_project',
      name: 'Constructor',
      description: 'Completa tu primer proyecto',
      icon: '🚀',
      category: 'project',
      xp_reward: 300,
      condition_type: 'project_completed',
      condition_value: 1,
      condition_field: 'projects_completed',
      rarity: 'common',
    },
    {
      id: 'projects_5',
      name: 'Arquitecto de Código',
      description: 'Completa 5 proyectos',
      icon: '🏗️',
      category: 'project',
      xp_reward: 1000,
      condition_type: 'project_completed',
      condition_value: 5,
      condition_field: 'projects_completed',
      rarity: 'rare',
    },
    
    // === ESPECIALES ===
    {
      id: 'night_owl',
      name: 'Búho Nocturno',
      description: 'Estudia después de medianoche (22:00-05:00)',
      icon: '🦉',
      category: 'special',
      xp_reward: 100,
      condition_type: 'late_night_study',
      condition_value: 1,
      condition_field: 'late_night_sessions',
      rarity: 'rare',
    },
    {
      id: 'early_bird',
      name: 'Madrugador',
      description: 'Estudia antes de las 6:00 AM',
      icon: '🌅',
      category: 'special',
      xp_reward: 100,
      condition_type: 'early_morning_study',
      condition_value: 1,
      condition_field: 'early_morning_sessions',
      rarity: 'rare',
    },
    {
      id: 'weekend_warrior',
      name: 'Guerrero de Fin de Semana',
      description: 'Estudia 5 fines de semana seguidos',
      icon: '⚔️',
      category: 'special',
      xp_reward: 300,
      condition_type: 'weekend_streak',
      condition_value: 5,
      condition_field: 'weekend_streak',
      rarity: 'epic',
    },
    {
      id: 'helper',
      name: 'Mentor',
      description: 'Ayuda a 5 compañeros en el foro',
      icon: '🤝',
      category: 'social',
      xp_reward: 200,
      condition_type: 'help_others',
      condition_value: 5,
      condition_field: 'help_count',
      rarity: 'rare',
    },
    {
      id: 'bug_hunter',
      name: 'Cazador de Bugs',
      description: 'Reporta 10 bugs válidos',
      icon: '🐛',
      category: 'special',
      xp_reward: 300,
      condition_type: 'bug_reports',
      condition_value: 10,
      condition_field: 'bug_reports',
      rarity: 'epic',
    },
    {
      id: 'perfectionist',
      name: 'Perfeccionista',
      description: 'Obtén 100% en 10 quizzes',
      icon: '💎',
      category: 'quiz',
      xp_reward: 500,
      condition_type: 'perfect_quiz',
      condition_value: 10,
      condition_field: 'perfect_quizzes',
      rarity: 'epic',
    },
    {
      id: 'speed_learner',
      name: 'Aprendiz Rápido',
      description: 'Completa un curso en menos de una semana',
      icon: '⚡',
      category: 'special',
      xp_reward: 500,
      condition_type: 'fast_course',
      condition_value: 7,
      condition_field: 'course_completion_days',
      rarity: 'epic',
    },
    {
      id: 'explorer',
      name: 'Explorador',
      description: 'Prueba 5 categorías diferentes de cursos',
      icon: '🧭',
      category: 'progress',
      xp_reward: 200,
      condition_type: 'categories_explored',
      condition_value: 5,
      condition_field: 'categories_count',
      rarity: 'rare',
    },
  ];
  
  const stmt = sqlite.prepare(`
    INSERT OR REPLACE INTO badges (id, name, description, icon, category, xp_reward, condition_type, condition_value, condition_field, rarity, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  
  for (const badge of badges) {
    stmt.run(
      badge.id,
      badge.name,
      badge.description,
      badge.icon,
      badge.category,
      badge.xp_reward,
      badge.condition_type,
      badge.condition_value,
      badge.condition_field,
      badge.rarity
    );
  }
  
  console.log(`✅ ${badges.length} badges insertados/actualizados`);
  
  // Estadísticas por categoría
  const byCategory = badges.reduce((acc, b) => {
    acc[b.category] = (acc[b.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📊 Badges por categoría:');
  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`   ${cat}: ${count}`);
  }
  
  // Estadísticas por rareza
  const byRarity = badges.reduce((acc, b) => {
    acc[b.rarity] = (acc[b.rarity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n💎 Badges por rareza:');
  for (const [rarity, count] of Object.entries(byRarity)) {
    console.log(`   ${rarity}: ${count}`);
  }
  
  console.log('\n✅ Badges poblados correctamente');
}

seedBadges().catch(console.error);