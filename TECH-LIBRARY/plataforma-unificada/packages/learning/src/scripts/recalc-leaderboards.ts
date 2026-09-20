#!/usr/bin/env tsx
/**
 * Recalcula los leaderboards basados en XP actual
 */

import { LearningDatabase } from '../learning';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'learning.db');

async function recalcLeaderboards() {
  console.log('📊 Recalculando leaderboards...');
  
  const db = LearningDatabase.getInstance(DB_PATH);
  const sqlite = db.getDb();
  
  // Tabla de leaderboards
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS leaderboards (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rank INTEGER NOT NULL,
      score INTEGER NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(period, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_leaderboards_period ON leaderboards(period);
    CREATE INDEX IF NOT EXISTS idx_leaderboards_rank ON leaderboards(period, rank);
  `);
  
  // Obtener todos los usuarios con sus XP totales
  const users = sqlite.prepare(`
    SELECT 
      u.id as user_id,
      u.name,
      COALESCE(ux.total_xp, 0) as total_xp,
      u.level
    FROM users u
    LEFT JOIN user_xp ux ON u.id = ux.user_id
    ORDER BY ux.total_xp DESC
  `).all();
  
  if (users.length === 0) {
    console.log('⚠️ No hay usuarios para calcular leaderboard');
    return;
  }
  
  const now = new Date();
  const periods = [
    { id: 'all_time', name: 'All Time', start: null },
    { id: 'monthly', name: 'Monthly', start: new Date(now.getFullYear(), now.getMonth(), 1) },
    { id: 'weekly', name: 'Weekly', start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    { id: 'daily', name: 'Daily', start: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
  ];
  
  for (const period of periods) {
    let rankedUsers = users;
    
    // Para periodos con fecha de inicio, filtrar por XP ganada en ese periodo
    if (period.start) {
      // En una implementación real, se consultaría xp_transactions filtrado por fecha
      // Por ahora usamos el total_xp como proxy
      rankedUsers = users;
    }
    
    // Limitar top 100
    rankedUsers = rankedUsers.slice(0, 100);
    
    const stmt = sqlite.prepare(`
      INSERT OR REPLACE INTO leaderboards (id, period, user_id, rank, score, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (let i = 0; i < rankedUsers.length; i++) {
      const user = rankedUsers[i];
      const id = `${period.id}_${user.user_id}`;
      const metadata = JSON.stringify({
        name: user.name,
        level: user.level,
      });
      
      stmt.run(
        id,
        period.id,
        user.user_id,
        i + 1,
        user.total_xp,
        metadata,
        new Date().toISOString()
      );
    }
    
    console.log(`  ✅ ${period.name}: ${rankedUsers.length} usuarios`);
  }
  
  console.log('\n✅ Leaderboards recalculados');
}

recalcLeaderboards().catch(console.error);