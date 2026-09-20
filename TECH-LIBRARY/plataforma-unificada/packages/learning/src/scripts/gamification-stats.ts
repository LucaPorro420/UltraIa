#!/usr/bin/env tsx
/**
 * Genera estadísticas de gamificación para dashboards y reportes
 */

import { LearningDatabase } from '../learning';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'learning.db');

async function gamificationStats() {
  console.log('📊 Generando estadísticas de gamificación...\n');
  
  const db = LearningDatabase.getInstance(DB_PATH);
  const sqlite = db.getDb();
  
  // 1. Usuarios totales y activos
  const totalUsers = sqlite.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const activeToday = sqlite.prepare(`
    SELECT COUNT(DISTINCT user_id) as count FROM daily_activity 
    WHERE activity_date = date('now')
  `).get() as { count: number };
  
  const activeWeek = sqlite.prepare(`
    SELECT COUNT(DISTINCT user_id) as count FROM daily_activity 
    WHERE activity_date >= date('now', '-7 days')
  `).get() as { count: number };
  
  // 2. XP totales y distribución
  const xpStats = sqlite.prepare(`
    SELECT 
      COUNT(*) as users_with_xp,
      SUM(total_xp) as total_xp,
      AVG(total_xp) as avg_xp,
      MAX(total_xp) as max_xp,
      MIN(total_xp) as min_xp
    FROM user_xp
  `).get() as { users_with_xp: number, total_xp: number, avg_xp: number, max_xp: number, min_xp: number };
  
  // Distribución por niveles
  const levelDist = sqlite.prepare(`
    SELECT level, COUNT(*) as count 
    FROM users 
    GROUP BY level 
    ORDER BY 
      CASE level 
        WHEN 'explorer' THEN 1
        WHEN 'beginner' THEN 2
        WHEN 'intermediate' THEN 3
        WHEN 'advanced' THEN 4
        WHEN 'professional' THEN 5
        WHEN 'architect' THEN 6
        ELSE 7
      END
  `).all() as Array<{ level: string; count: number }>;
  
  // 3. Badges
  const totalBadges = sqlite.prepare('SELECT COUNT(*) as count FROM badges WHERE is_active = 1').get() as { count: number };
  const earnedBadges = sqlite.prepare('SELECT COUNT(*) as count FROM user_badges').get() as { count: number };
  const badgesByRarity = sqlite.prepare(`
    SELECT rarity, COUNT(*) as count FROM badges WHERE is_active = 1 GROUP BY rarity
  `).all() as Array<{ rarity: string; count: number }>;
  
  const topBadgeEarners = sqlite.prepare(`
    SELECT u.name, u.id, COUNT(ub.badge_id) as badge_count
    FROM user_badges ub
    JOIN users u ON ub.user_id = u.id
    GROUP BY ub.user_id
    ORDER BY badge_count DESC
    LIMIT 10
  `).all() as Array<{ name: string; id: string; badge_count: number }>;
  
  // 4. Rachas
  const streakStats = sqlite.prepare(`
    SELECT 
      COUNT(*) as users_with_streak,
      AVG(current_streak) as avg_streak,
      MAX(current_streak) as max_streak,
      SUM(CASE WHEN current_streak >= 7 THEN 1 ELSE 0 END) as streak_7_plus,
      SUM(CASE WHEN current_streak >= 30 THEN 1 ELSE 0 END) as streak_30_plus
    FROM user_streaks
    WHERE current_streak > 0
  `).get() as { users_with_streak: number, avg_streak: number, max_streak: number, streak_7_plus: number, streak_30_plus: number };
  
  // 4. Cursos y progreso
  const courseStats = sqlite.prepare(`
    SELECT 
      COUNT(*) as total_courses,
      SUM(CASE WHEN is_free = 1 THEN 1 ELSE 0 END) as free_courses,
      SUM(CASE WHEN is_free = 0 THEN 1 ELSE 0 END) as pro_courses
    FROM courses
  `).get() as { total_courses: number, free_courses: number, pro_courses: number };
  
  const progressStats = sqlite.prepare(`
    SELECT 
      COUNT(*) as total_enrollments,
      SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed_courses,
      AVG(CAST(json_extract(lessons_completed, '$.length') AS REAL)) as avg_lessons_per_course
    FROM user_progress
  `).get() as { total_enrollments: number, completed_courses: number, avg_lessons_per_course: number };
  
  // 5. Quiz stats
  const quizStats = sqlite.prepare(`
    SELECT 
      COUNT(*) as total_attempts,
      AVG(score * 100.0 / total) as avg_score,
      SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed_count,
      SUM(CASE WHEN score = total THEN 1 ELSE 0 END) as perfect_count
    FROM quiz_results
  `).get() as { total_attempts: number, avg_score: number, passed_count: number, perfect_count: number };
  
  // 6. XP Transacciones (últimos 30 días)
  const recentXP = sqlite.prepare(`
    SELECT 
      DATE(created_at) as date,
      SUM(amount) as daily_xp,
      COUNT(DISTINCT user_id) as active_users,
      COUNT(*) as transactions
    FROM xp_transactions
    WHERE created_at >= date('now', '-30 days')
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `).all() as Array<{ date: string; daily_xp: number; active_users: number; transactions: number }>;
  
  // ===== OUTPUT =====
  console.log('═══════════════════════════════════════');
  console.log('       📊 ESTADÍSTICAS DE GAMIFICACIÓN');
  console.log('═══════════════════════════════════════\n');
  
  // Usuarios
  console.log('👥 USUARIOS');
  console.log(`   Total registrados: ${totalUsers.count}`);
  console.log(`   Activos hoy: ${activeToday.count} (${((activeToday.count / totalUsers.count) * 100).toFixed(1)}%)`);
  console.log(`   Activos (7 días): ${activeWeek.count} (${((activeWeek.count / totalUsers.count) * 100).toFixed(1)}%)\n`);
  
  // XP
  console.log('⭐ EXPERIENCIA (XP)');
  console.log(`   Usuarios con XP: ${xpStats.users_with_xp}`);
  console.log(`   XP Total: ${xpStats.total_xp?.toLocaleString() || 0}`);
  console.log(`   Promedio: ${Math.round(xpStats.avg_xp || 0).toLocaleString()}`);
  console.log(`   Máximo: ${(xpStats.max_xp || 0).toLocaleString()}`);
  console.log(`   Mínimo: ${(xpStats.min_xp || 0).toLocaleString()}\n`);
  
  // Niveles
  console.log('📊 DISTRIBUCIÓN POR NIVELES');
  for (const lvl of levelDist) {
    const pct = ((lvl.count / totalUsers.count) * 100).toFixed(1);
    console.log(`   ${lvl.level}: ${lvl.count} (${pct}%)`);
  }
  console.log('');
  
  // Badges
  console.log('🏅 BADGES');
  console.log(`   Total disponibles: ${totalBadges.count}`);
  console.log(`   Total ganados: ${earnedBadges.count}`);
  console.log(`   Por rareza:`);
  for (const r of badgesByRarity) {
    console.log(`   ${r.rarity}: ${r.count}`);
  }
  console.log('\n🏆 TOP 10 COLECCIONISTAS:');
  for (let i = 0; i < Math.min(10, topBadgeEarners.length); i++) {
    const t = topBadgeEarners[i];
    console.log(`   ${i + 1}. ${t.name} (${t.id}): ${t.badge_count} badges`);
  }
  console.log('');
  
  // Rachas
  console.log('🔥 RACHAS');
  console.log(`   Usuarios con racha: ${streakStats.users_with_streak}`);
  console.log(`   Promedio: ${streakStats.avg_streak?.toFixed(1) || 0} días`);
  console.log(`   Máxima: ${streakStats.max_streak || 0} días`);
  console.log(`   7+ días: ${streakStats.streak_7_plus || 0}`);
  console.log(`   30+ días: ${streakStats.streak_30_plus || 0}\n`);
  
  // Cursos
  console.log('📚 CURSOS');
  console.log(`   Total: ${courseStats.total_courses} (Free: ${courseStats.free_courses}, Pro: ${courseStats.pro_courses})`);
  console.log(`   Inscripciones: ${progressStats.total_enrollments}`);
  console.log(`   Completados: ${progressStats.completed_courses}`);
  console.log(`   Promedio lecciones/curso: ${progressStats.avg_lessons_per_course?.toFixed(1) || 0}\n`);
  
  // Quiz
  console.log('📝 QUIZZES');
  console.log(`   Intentos totales: ${quizStats.total_attempts}`);
  console.log(`   Score promedio: ${quizStats.avg_score?.toFixed(1) || 0}%`);
  console.log(`   Aprobados: ${quizStats.passed_count}`);
  console.log(`   Perfectos (100%): ${quizStats.perfect_count}\n`);
  
  // XP Reciente
  console.log('📈 XP ÚLTIMOS 30 DÍAS');
  let totalRecentXP = 0;
  for (const day of recentXP.slice(0, 7)) {
    console.log(`   ${day.date}: ${day.daily_xp.toLocaleString()} XP (${day.active_users} users, ${day.transactions} tx)`);
    totalRecentXP += day.daily_xp;
  }
  console.log(`   Total 30 días: ${totalRecentXP.toLocaleString()} XP\n`);
  
  // Top users by XP
  const topXP = sqlite.prepare(`
    SELECT u.name, u.id, ux.total_xp, u.level
    FROM user_xp ux
    JOIN users u ON ux.user_id = u.id
    ORDER BY ux.total_xp DESC
    LIMIT 10
  `).all() as Array<{ name: string; id: string; total_xp: number; level: string }>;
  
  console.log('🏆 TOP 10 POR XP');
  for (let i = 0; i < topXP.length; i++) {
    const u = topXP[i];
    console.log(`   ${i + 1}. ${u.name} (${u.id}): ${u.total_xp.toLocaleString()} XP [${u.level}]`);
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('✅ Estadísticas generadas correctamente');
}

gamificationStats().catch(console.error);