#!/usr/bin/env tsx
/**
 * Verifica y actualiza las rachas de los usuarios
 * Debe ejecutarse diariamente (cron job)
 */

import { LearningDatabase } from '../learning';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'learning.db');

async function checkStreaks() {
  console.log('🔥 Verificando rachas diarias...');
  
  const db = LearningDatabase.getInstance(DB_PATH);
  const sqlite = db.getDb();
  
  // Tabla de actividad diaria
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS daily_activity (
      user_id TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      lessons_completed INTEGER DEFAULT 0,
      quizzes_completed INTEGER DEFAULT 0,
      projects_completed INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      study_minutes INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, activity_date)
    );
    
    CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_activity(activity_date);
    CREATE INDEX IF NOT EXISTS idx_daily_activity_user ON daily_activity(user_id);
  `);
  
  // Tabla de rachas
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_streaks (
      user_id TEXT PRIMARY KEY,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_activity_date TEXT,
      last_streak_date TEXT,
      streak_saved INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Obtener usuarios con actividad hoy
  const activeToday = sqlite.prepare(`
    SELECT user_id FROM daily_activity WHERE activity_date = ?
  `).all(today);
  
  const activeTodayIds = new Set(activeToday.map(a => a.user_id));
  
  // Obtener todos los usuarios con racha
  const allStreaks = sqlite.prepare('SELECT * FROM user_streaks').all();
  
  const updateStreak = sqlite.prepare(`
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date, last_streak_date, streak_saved, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      current_streak = excluded.current_streak,
      longest_streak = excluded.longest_streak,
      last_activity_date = excluded.last_activity_date,
      last_streak_date = excluded.last_streak_date,
      streak_saved = excluded.streak_saved,
      updated_at = excluded.updated_at
  `);
  
  let updated = 0;
  let broken = 0;
  let maintained = 0;
  
  for (const streak of allStreaks) {
    const wasActiveYesterday = activeTodayIds.has(streak.user_id);
    const lastDate = streak.last_activity_date;
    
    if (wasActiveYesterday) {
      // Usuario activo hoy
      if (lastDate === yesterday) {
        // Continuó la racha
        const newStreak = streak.current_streak + 1;
        const newLongest = Math.max(streak.longest_streak, newStreak);
        
        updateStreak.run(
          streak.user_id,
          newStreak,
          newLongest,
          today,
          today,
          0
        );
        
        if (newStreak > streak.longest_streak) {
          console.log(`  🔥 ${streak.user_id}: Nueva racha récord: ${newStreak} días`);
        }
        maintained++;
      } else if (lastDate === today) {
        // Ya actualizado hoy
        maintained++;
      } else {
        // Había hueco, reiniciar
        updateStreak.run(
          streak.user_id,
          1,
          Math.max(streak.longest_streak, 1),
          today,
          today,
          0
        );
        console.log(`  🔄 ${streak.user_id}: Racha reiniciada (hueco)`);
        updated++;
      }
    } else {
      // Usuario NO activo hoy
      if (lastDate === yesterday) {
        // La racha se rompe mañana si no actúa
        // Marcar como "en riesgo"
        console.log(`  ⚠️ ${streak.user_id}: Raqueta en riesgo (${streak.current_streak} días)`);
      } else if (lastDate && lastDate < yesterday) {
        // Ya estaba rota
        broken++;
      }
    }
  }
  
  // Usuarios activos hoy sin registro de racha
  for (const userId of activeTodayIds) {
    const existing = allStreaks.find(s => s.user_id === userId);
    if (!existing) {
      updateStreak.run(userId, 1, 1, today, today, 0);
      console.log(`  🌱 ${user_id}: Nueva racha iniciada (1 día)`);
      updated++;
    }
  }
  
  // Verificar rachas en riesgo (último día para mantener)
  const atRisk = sqlite.prepare(`
    SELECT user_id, current_streak FROM user_streaks 
    WHERE last_activity_date = ? AND current_streak > 0
  `).all(yesterday);
  
  if (atRisk.length > 0) {
    console.log(`\n⚠️ ${atRisk.length} usuarios en riesgo de perder racha:`);
    for (const user of atRisk) {
      console.log(`   ${user.user_id}: ${user.current_streak} días - ¡Actividad requerida hoy!`);
    }
  }
  
  console.log(`\n✅ Verificación completada:`);
  console.log(`   🔥 Mantenidas: ${maintained}`);
  console.log(`   🔄 Actualizadas: ${updated}`);
  console.log(`   💔 Rotas: ${broken}`);
}

checkStreaks().catch(console.error);