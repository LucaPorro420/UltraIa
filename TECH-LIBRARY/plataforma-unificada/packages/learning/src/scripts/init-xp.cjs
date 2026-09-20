// init-xp.cjs - CommonJS version for direct node execution
const fs = require('fs');
const path = require('path');
const db = require('better-sqlite3')(process.env.DB_PATH || path.join(process.cwd(), 'data', 'learning.db'));

console.log('Inicializando sistema de XP...');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

db.pragma('journal_mode = WAL');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  level TEXT DEFAULT 'explorer',
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  preferences TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS xp_config (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_xp (
  user_id TEXT PRIMARY KEY,
  total_xp INTEGER DEFAULT 0,
  current_level TEXT DEFAULT 'explorer',
  xp_to_next_level INTEGER DEFAULT 100,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS xp_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  reference_id TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created ON xp_transactions(created_at);

CREATE TABLE user_levels (
  level TEXT PRIMARY KEY,
  min_xp INTEGER NOT NULL,
  max_xp INTEGER NOT NULL,
  name TEXT NOT NULL
);
`;

db.pragma('journal_mode = WAL');
db.exec(SCHEMA);

const xpDefaults = [
  { key: 'xp_per_lesson', value: 10, description: 'XP por completar una leccion' },
  { key: 'xp_per_quiz_perfect', value: 25, description: 'XP por quiz perfecto (100%)' },
  { key: 'xp_per_quiz_pass', value: 10, description: 'XP por quiz aprobado (>70%)' },
  { key: 'xp_per_project_small', value: 50, description: 'XP por proyecto pequeno' },
  { key: 'xp_per_project_medium', value: 100, description: 'XP por proyecto mediano' },
  { key: 'xp_per_project_large', value: 250, description: 'XP por proyecto grande' },
  { key: 'xp_per_certificate', value: 500, description: 'XP por obtener certificado' },
  { key: 'xp_daily_streak_bonus', value: 5, description: 'Bonus XP diario por racha' },
  { key: 'xp_weekly_streak_bonus', value: 50, description: 'Bonus XP semanal por racha' },
  { key: 'xp_monthly_streak_bonus', value: 200, description: 'Bonus XP mensual por racha' },
  { key: 'xp_first_login_day', value: 5, description: 'XP por primer login del dia' },
];

const stmt = db.prepare('INSERT OR REPLACE INTO xp_config (key, value, description) VALUES (?, ?, ?)');
for (const config of xpDefaults) {
  stmt.run(config.key, config.value, config.description);
}

const levels = [
  { level: 'explorer', min_xp: 0, max_xp: 99, name: 'Explorador' },
  { level: 'beginner', min_xp: 100, max_xp: 499, name: 'Principiante' },
  { level: 'intermediate', min_xp: 500, max_xp: 1499, name: 'Intermedio' },
  { level: 'advanced', min_xp: 1500, max_xp: 3499, name: 'Avanzado' },
  { level: 'professional', min_xp: 3500, max_xp: 6999, name: 'Profesional' },
  { level: 'architect', min_xp: 7000, max_xp: 999999, name: 'Arquitecto' },
];

const levelStmt = db.prepare('INSERT OR REPLACE INTO user_levels (level, min_xp, max_xp, name) VALUES (?, ?, ?, ?)');
for (const lvl of levels) {
  levelStmt.run(lvl.level, lvl.min_xp, lvl.max_xp, lvl.name);
}

console.log('Sistema de XP inicializado correctamente');
console.log('   - Tabla xp_config creada con ' + xpDefaults.length + ' configuraciones');
console.log('   - Tabla user_xp creada');
console.log('   - Tabla xp_transactions creada');
console.log('   - Tabla user_levels creada con ' + levels.length + ' niveles');

console.log('\nConfiguracion XP:');
for (const config of xpDefaults) {
  console.log('   ' + config.key + ': ' + config.value + ' XP (' + config.description + ')');
}

console.log('\nNiveles:');
for (const lvl of levels) {
  console.log('   ' + lvl.name + ': ' + lvl.min_xp + ' - ' + lvl.max_xp + ' XP');
}